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
		if err := cache.Save(kmbCacheDir+"/"+name, v); err != nil {
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

	for _, route := range removed {
		if _, err := database.Exec(
			"DELETE FROM route_stops WHERE company = $1 AND route = $2",
			DatabaseCompany_CityBus, route); err != nil {
			return err
		}
		if _, err := database.Exec(
			"DELETE FROM routes WHERE company = $1 AND route = $2",
			DatabaseCompany_CityBus, route); err != nil {
			return err
		}
	}

	if err := storeRoutes(routes); err != nil {
		return err
	}

	for _, route := range changed {
		routeStops, err := fetchCitybusRouteStops(route)
		if err != nil {
			log.Printf("Warning: skipping route-stops refresh for Citybus route %s: %v", route, err)
			continue
		}
		if err := replaceCitybusRouteStops(route, routeStops); err != nil {
			return err
		}
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

// replaceCitybusRouteStops atomically swaps the stop sequence of one route.
func replaceCitybusRouteStops(route string, routeStops []RouteStop) error {
	return runInTx(func(tx *sql.Tx) error {
		if _, err := tx.Exec(
			"DELETE FROM route_stops WHERE company = $1 AND route = $2",
			DatabaseCompany_CityBus, route); err != nil {
			return err
		}
		return insertRouteStopsTx(tx, routeStops)
	})
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
	return exportStopsSnapshot(DatabaseCompany_CityBus, ctbCacheDir+"/ctb_stops.json")
}
