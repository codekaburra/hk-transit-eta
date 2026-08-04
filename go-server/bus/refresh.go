package bus

import (
	"database/sql"
	"fmt"
	"log"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/syncmeta"
)

// Refresh re-syncs bus reference data from the official APIs.
//
// KMB exposes bulk endpoints, so a full atomic replace costs only three
// requests. Citybus has no bulk stop/route-stop endpoints, so it is synced
// incrementally: only routes whose data_timestamp changed (and stops not yet
// stored) are re-fetched.
func Refresh() error {
	if err := refreshKmb(); err != nil {
		return fmt.Errorf("kmb refresh: %v", err)
	}
	if err := refreshCitybus(); err != nil {
		return fmt.Errorf("citybus refresh: %v", err)
	}
	return nil
}

func refreshKmb() error {
	fmt.Println("=== Refreshing KMB data ===")
	routes, err := fetchKmbRouteData()
	if err != nil {
		return err
	}
	stops, err := fetchKmbStopData()
	if err != nil {
		return err
	}
	routeStops, err := fetchKmbRouteStopData()
	if err != nil {
		return err
	}

	if err := ReplaceCompanyData(DatabaseCompany_KowloonBus, routes, stops, routeStops); err != nil {
		return err
	}
	fmt.Printf("KMB refreshed: %d routes, %d stops, %d route-stops\n",
		len(routes), len(stops), len(routeStops))

	for name, v := range map[string]interface{}{
		"kmb_routes.json":      routes,
		"kmb_stops.json":       stops,
		"kmb_route_stops.json": routeStops,
	} {
		if err := cache.Save(busCacheDir+"/"+name, v); err != nil {
			log.Printf("Warning: could not save %s: %v", name, err)
		}
	}

	var ts string
	if len(routes) > 0 {
		ts = routes[0].DataTimestamp
	}
	return syncmeta.Record("kmb", ts)
}

func refreshCitybus() error {
	fmt.Println("=== Refreshing Citybus data ===")
	routes, err := fetchCitybusRoutes()
	if err != nil {
		return err
	}

	// Load the stored per-route timestamps to diff against.
	existing := map[string]string{}
	rows, err := database.Query(
		"SELECT route, data_timestamp FROM routes WHERE company = $1", DatabaseCompany_CityBus)
	if err != nil {
		return err
	}
	for rows.Next() {
		var route, ts string
		if err := rows.Scan(&route, &ts); err == nil {
			existing[route] = ts
		}
	}
	rows.Close()

	fetched := map[string]bool{}
	var changed []string
	for _, r := range routes {
		fetched[r.Route] = true
		if ts, ok := existing[r.Route]; !ok || ts != r.DataTimestamp {
			changed = append(changed, r.Route)
		}
	}
	var removed []string
	for route := range existing {
		if !fetched[route] {
			removed = append(removed, route)
		}
	}
	fmt.Printf("Citybus diff: %d changed/new, %d removed (of %d upstream routes)\n",
		len(changed), len(removed), len(routes))

	// Fetch the new stop sequences before recording the new timestamps. A route
	// whose stops could not be fetched must keep its stored timestamp, or the
	// next diff sees no change, skips it, and the stale sequence survives until
	// the operator happens to publish another update.
	fetchedStops := map[string][]RouteStop{}
	for _, route := range changed {
		routeStops, err := fetchCitybusRouteStops(route)
		if err != nil {
			log.Printf("Warning: keeping the stored data for Citybus route %s until its stops can be fetched: %v",
				route, err)
			continue
		}
		fetchedStops[route] = routeStops
	}

	// Roll the timestamp back for routes whose stops are still outstanding, so
	// they remain in the diff next time. A new route whose first stop fetch
	// failed is not stored yet: without a previous timestamp to retain, storing
	// the current one would incorrectly mark the incomplete route as current.
	toStore := make([]Route, 0, len(routes))
	for _, r := range routes {
		if _, ok := fetchedStops[r.Route]; !ok {
			previous, seen := existing[r.Route]
			if !seen {
				continue
			}
			if previous != r.DataTimestamp {
				r.DataTimestamp = previous
			}
		}
		toStore = append(toStore, r)
	}

	// The unit that must be atomic is one route: its timestamp and its stop
	// sequence have to move together, or a failure between the two leaves the
	// timestamp ahead of stale stops and the next diff skips the route. That
	// invariant is per route, not per run, so the work is committed in batches
	// rather than as one transaction — Citybus rewrites every timestamp daily,
	// which would otherwise put ~20,000 inserts and their locks in a single
	// transaction. A batch that fails leaves earlier batches applied and later
	// ones untouched, and every route in them is individually consistent: those
	// not yet written keep their stored timestamp and are retried next run.
	if err := applyCitybusRemovals(removed); err != nil {
		return err
	}
	if err := applyCitybusRoutes(toStore, fetchedStops); err != nil {
		return err
	}

	if err := BackfillCitybusStops(); err != nil {
		return err
	}

	var ts string
	if len(routes) > 0 {
		ts = routes[0].DataTimestamp
	}
	return syncmeta.Record("ctb", ts)
}

// BackfillCitybusStops fetches details for stops that route-stops reference but
// that are not stored yet, then refreshes the snapshot.
//
// The stop query inner-joins route_stops against stops, so a stop missing here
// is silently dropped from route pages — a route shows fewer stops than its
// sequence numbers imply. Citybus stops are fetched one at a time and a run can
// come back incomplete, so this reconciles the gap on each refresh.
func BackfillCitybusStops() error {
	rows, err := database.Query(`
		SELECT DISTINCT rs.stop FROM route_stops rs
		WHERE rs.company = $1 AND rs.stop NOT IN (SELECT stop FROM stops)`,
		DatabaseCompany_CityBus)
	if err != nil {
		return err
	}
	var missing []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			missing = append(missing, id)
		}
	}
	rows.Close()

	if len(missing) > 0 {
		fmt.Printf("Backfilling %d Citybus stops referenced by route-stops\n", len(missing))
		stops, err := fetchCitybusStops(missing)
		if err != nil {
			log.Printf("Warning: Citybus stop backfill incomplete (%d fetched): %v", len(stops), err)
		}
		if err := storeStops(stops); err != nil {
			return err
		}
	}

	// Snapshot from the database so the committed baseline picks up anything
	// backfilled above.
	return exportStopsSnapshot(DatabaseCompany_CityBus, busCacheDir+"/ctb_stops.json")
}

// citybusBatchSize bounds how many routes share one transaction. Large enough
// that the per-transaction overhead stays negligible, small enough that no
// single transaction holds locks over the whole dataset. A variable so tests
// can shrink it rather than build a fixture of hundreds of routes.
var citybusBatchSize = 100

// inBatches applies fn to consecutive slices of at most size elements.
func inBatches[T any](items []T, size int, fn func(batch []T) error) error {
	for start := 0; start < len(items); start += size {
		end := start + size
		if end > len(items) {
			end = len(items)
		}
		if err := fn(items[start:end]); err != nil {
			return err
		}
	}
	return nil
}

// deleteCitybusRouteStopsTx clears a route's stop sequence, so the refetched
// one replaces it rather than merging into it.
func deleteCitybusRouteStopsTx(tx *sql.Tx, route string) error {
	_, err := tx.Exec("DELETE FROM route_stops WHERE company = $1 AND route = $2",
		DatabaseCompany_CityBus, route)
	return err
}

// applyCitybusRemovals deletes withdrawn routes with their stop sequences. A
// route and its stops go in the same transaction so a removal can never leave
// orphaned stops behind.
func applyCitybusRemovals(removed []string) error {
	return inBatches(removed, citybusBatchSize, func(batch []string) error {
		return runInTx(func(tx *sql.Tx) error {
			for _, route := range batch {
				if err := deleteCitybusRouteStopsTx(tx, route); err != nil {
					return err
				}
				if _, err := tx.Exec(
					"DELETE FROM routes WHERE company = $1 AND route = $2",
					DatabaseCompany_CityBus, route); err != nil {
					return err
				}
			}
			return nil
		})
	})
}

// applyCitybusRoutes writes the route rows, replacing the stop sequence of any
// route whose stops were refetched. Each route's row and stops are written in
// the same transaction, so the two never diverge.
func applyCitybusRoutes(routes []Route, fetchedStops map[string][]RouteStop) error {
	return inBatches(routes, citybusBatchSize, func(batch []Route) error {
		return runInTx(func(tx *sql.Tx) error {
			if err := insertRoutesTx(tx, batch); err != nil {
				return err
			}
			for _, r := range batch {
				routeStops, ok := fetchedStops[r.Route]
				if !ok {
					continue
				}
				if err := deleteCitybusRouteStopsTx(tx, r.Route); err != nil {
					return err
				}
				if err := insertRouteStopsTx(tx, routeStops); err != nil {
					return err
				}
			}
			return nil
		})
	})
}
