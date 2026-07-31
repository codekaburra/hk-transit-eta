package bus

import (
	"database/sql"
	"fmt"
	"path/filepath"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/syncmeta"
)

// exportStopsSnapshot writes one operator's stored stops to its snapshot file.
//
// The snapshot is taken from the database rather than from a fetch result:
// Citybus stops are fetched one request at a time and a run can legitimately
// come back incomplete, so writing the fetch result directly would shrink the
// snapshot. The database accumulates via upsert, so exporting from it never
// regresses.
func exportStopsSnapshot(company, path string) error {
	rows, err := database.Query(`SELECT company, stop, name_en, name_tc, name_sc,
		lat, long, COALESCE(data_timestamp, '')
		FROM stops WHERE company = $1 ORDER BY stop`, company)
	if err != nil {
		return err
	}
	defer rows.Close()

	stops := []Stop{}
	for rows.Next() {
		var s Stop
		if err := rows.Scan(&s.Company, &s.Stop, &s.NameEn, &s.NameTc, &s.NameSc,
			&s.Lat, &s.Long, &s.DataTimestamp); err != nil {
			return err
		}
		stops = append(stops, s)
	}
	fmt.Printf("Exported %d %s stops to %s\n", len(stops), company, path)
	return cache.Save(path, stops)
}

// busSnapshot is the full set of snapshot files, loaded before anything is
// written so a malformed or missing file cannot leave a half-applied dataset.
type busSnapshot struct {
	routes     []Route
	stops      []Stop
	routeStops []RouteStop
}

// SeedFromCache replaces the bus dataset with the JSON snapshot on disk.
// Returns false if any file is missing or unreadable.
//
// This replaces rather than merges: upserting alone would leave routes, stops
// and stop sequences that the snapshot no longer contains, so the database
// would not match the snapshot it was seeded from. Everything is applied in one
// transaction, so a failure part-way through rolls back rather than leaving a
// mix of old and new data.
func SeedFromCache(dataDir string) bool {
	busDir := filepath.Join(dataDir, "bus")
	files := []string{
		filepath.Join(busDir, "kmb_routes.json"),
		filepath.Join(busDir, "kmb_stops.json"),
		filepath.Join(busDir, "kmb_route_stops.json"),
		filepath.Join(busDir, "ctb_routes.json"),
		filepath.Join(busDir, "ctb_stops.json"),
		filepath.Join(busDir, "ctb_route_stops.json"),
	}
	if !cache.Exists(files...) {
		return false
	}

	fmt.Println("=== Seeding bus data from cache ===")

	snap, err := loadBusSnapshot(files)
	if err != nil {
		fmt.Printf("Error loading bus snapshot: %v\n", err)
		return false
	}

	if err := replaceAllBusData(snap); err != nil {
		fmt.Printf("Error applying bus snapshot: %v\n", err)
		return false
	}

	fmt.Printf("Seeded %d routes, %d stops, %d route-stops\n",
		len(snap.routes), len(snap.stops), len(snap.routeStops))
	fmt.Println("=== Bus cache seeding complete ===")
	if err := syncmeta.Record("bus_seed", ""); err != nil {
		fmt.Printf("Warning: could not record bus seed: %v\n", err)
	}
	return true
}

// loadBusSnapshot reads every snapshot file into memory, combining both
// operators. Nothing is written until all six parse successfully.
func loadBusSnapshot(files []string) (busSnapshot, error) {
	var snap busSnapshot

	for _, i := range []int{0, 3} { // kmb_routes, ctb_routes
		var routes []Route
		if err := cache.Load(files[i], &routes); err != nil {
			return snap, fmt.Errorf("%s: %v", files[i], err)
		}
		snap.routes = append(snap.routes, routes...)
	}
	for _, i := range []int{1, 4} { // kmb_stops, ctb_stops
		var stops []Stop
		if err := cache.Load(files[i], &stops); err != nil {
			return snap, fmt.Errorf("%s: %v", files[i], err)
		}
		snap.stops = append(snap.stops, stops...)
	}
	for _, i := range []int{2, 5} { // kmb_route_stops, ctb_route_stops
		var routeStops []RouteStop
		if err := cache.Load(files[i], &routeStops); err != nil {
			return snap, fmt.Errorf("%s: %v", files[i], err)
		}
		snap.routeStops = append(snap.routeStops, routeStops...)
	}
	return snap, nil
}

// replaceAllBusData swaps the entire bus dataset in a single transaction, so
// the tables either match the snapshot or are left untouched.
func replaceAllBusData(snap busSnapshot) error {
	return runInTx(func(tx *sql.Tx) error {
		// route_stops first: it references the other two.
		for _, table := range []string{"route_stops", "routes", "stops"} {
			if _, err := tx.Exec("DELETE FROM " + table); err != nil {
				return fmt.Errorf("clearing %s: %v", table, err)
			}
		}
		if err := insertRoutesTx(tx, snap.routes); err != nil {
			return err
		}
		if err := insertStopsTx(tx, snap.stops); err != nil {
			return err
		}
		return insertRouteStopsTx(tx, snap.routeStops)
	})
}
