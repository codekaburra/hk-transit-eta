package bus

import (
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

// SeedFromCache loads bus data from JSON cache files and stores it in the DB.
// Returns false if any cache file is missing.
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

	var kmbRoutes []Route
	if err := cache.Load(files[0], &kmbRoutes); err != nil {
		fmt.Printf("Error loading KMB routes cache: %v\n", err)
		return false
	}
	if err := storeRoutes(kmbRoutes); err != nil {
		fmt.Printf("Error storing KMB routes: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d KMB routes\n", len(kmbRoutes))

	var kmbStops []Stop
	if err := cache.Load(files[1], &kmbStops); err != nil {
		fmt.Printf("Error loading KMB stops cache: %v\n", err)
		return false
	}
	if err := storeStops(kmbStops); err != nil {
		fmt.Printf("Error storing KMB stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d KMB stops\n", len(kmbStops))

	var kmbRouteStops []RouteStop
	if err := cache.Load(files[2], &kmbRouteStops); err != nil {
		fmt.Printf("Error loading KMB route-stops cache: %v\n", err)
		return false
	}
	if err := storeRouteStops(kmbRouteStops); err != nil {
		fmt.Printf("Error storing KMB route-stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d KMB route-stops\n", len(kmbRouteStops))

	var ctbRoutes []Route
	if err := cache.Load(files[3], &ctbRoutes); err != nil {
		fmt.Printf("Error loading CTB routes cache: %v\n", err)
		return false
	}
	if err := storeRoutes(ctbRoutes); err != nil {
		fmt.Printf("Error storing CTB routes: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d CTB routes\n", len(ctbRoutes))

	var ctbStops []Stop
	if err := cache.Load(files[4], &ctbStops); err != nil {
		fmt.Printf("Error loading CTB stops cache: %v\n", err)
		return false
	}
	if err := storeStops(ctbStops); err != nil {
		fmt.Printf("Error storing CTB stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d CTB stops\n", len(ctbStops))

	var ctbRouteStops []RouteStop
	if err := cache.Load(files[5], &ctbRouteStops); err != nil {
		fmt.Printf("Error loading CTB route-stops cache: %v\n", err)
		return false
	}
	if err := storeRouteStops(ctbRouteStops); err != nil {
		fmt.Printf("Error storing CTB route-stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d CTB route-stops\n", len(ctbRouteStops))

	fmt.Println("=== Bus cache seeding complete ===")
	if err := syncmeta.Record("bus_seed", ""); err != nil {
		fmt.Printf("Warning: could not record bus seed: %v\n", err)
	}
	return true
}
