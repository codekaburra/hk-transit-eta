package bus

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

func saveCache(path string, v interface{}) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

func loadCache(path string, v interface{}) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(v)
}

func cacheExists(paths ...string) bool {
	for _, p := range paths {
		if _, err := os.Stat(p); err != nil {
			return false
		}
	}
	return true
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
	if !cacheExists(files...) {
		return false
	}

	fmt.Println("=== Seeding bus data from cache ===")

	var kmbRoutes []Route
	if err := loadCache(files[0], &kmbRoutes); err != nil {
		fmt.Printf("Error loading KMB routes cache: %v\n", err)
		return false
	}
	if err := storeRoutes(kmbRoutes); err != nil {
		fmt.Printf("Error storing KMB routes: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d KMB routes\n", len(kmbRoutes))

	var kmbStops []Stop
	if err := loadCache(files[1], &kmbStops); err != nil {
		fmt.Printf("Error loading KMB stops cache: %v\n", err)
		return false
	}
	if err := storeStops(kmbStops); err != nil {
		fmt.Printf("Error storing KMB stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d KMB stops\n", len(kmbStops))

	var kmbRouteStops []RouteStop
	if err := loadCache(files[2], &kmbRouteStops); err != nil {
		fmt.Printf("Error loading KMB route-stops cache: %v\n", err)
		return false
	}
	if err := storeRouteStops(kmbRouteStops); err != nil {
		fmt.Printf("Error storing KMB route-stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d KMB route-stops\n", len(kmbRouteStops))

	var ctbRoutes []Route
	if err := loadCache(files[3], &ctbRoutes); err != nil {
		fmt.Printf("Error loading CTB routes cache: %v\n", err)
		return false
	}
	if err := storeRoutes(ctbRoutes); err != nil {
		fmt.Printf("Error storing CTB routes: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d CTB routes\n", len(ctbRoutes))

	var ctbStops []Stop
	if err := loadCache(files[4], &ctbStops); err != nil {
		fmt.Printf("Error loading CTB stops cache: %v\n", err)
		return false
	}
	if err := storeStops(ctbStops); err != nil {
		fmt.Printf("Error storing CTB stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d CTB stops\n", len(ctbStops))

	var ctbRouteStops []RouteStop
	if err := loadCache(files[5], &ctbRouteStops); err != nil {
		fmt.Printf("Error loading CTB route-stops cache: %v\n", err)
		return false
	}
	if err := storeRouteStops(ctbRouteStops); err != nil {
		fmt.Printf("Error storing CTB route-stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d CTB route-stops\n", len(ctbRouteStops))

	fmt.Println("=== Bus cache seeding complete ===")
	return true
}
