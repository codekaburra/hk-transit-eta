package minibus

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const minbusCacheDir = "data/minibus"

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

// SeedFromCache loads minibus data from JSON cache files and stores it in the DB.
// Returns false if any cache file is missing.
func SeedFromCache(dataDir string) bool {
	mbDir := filepath.Join(dataDir, "minibus")
	regions := []string{MinibusRegionHKI, MinibusRegionKLN, MinibusRegionNT}

	var files []string
	for _, r := range regions {
		files = append(files, filepath.Join(mbDir, "gmb_routes_"+r+".json"))
	}
	files = append(files, filepath.Join(mbDir, "gmb_stops.json"))

	if !cacheExists(files...) {
		return false
	}

	fmt.Println("=== Seeding minibus data from cache ===")

	for i, region := range regions {
		var routes []MinibusRoute
		if err := loadCache(files[i], &routes); err != nil {
			fmt.Printf("Error loading GMB routes cache for %s: %v\n", region, err)
			return false
		}
		if err := storeMinibusRoutes(routes, region); err != nil {
			fmt.Printf("Error storing GMB routes for %s: %v\n", region, err)
			return false
		}
		fmt.Printf("Seeded %d GMB routes for region %s\n", len(routes), region)
	}

	var stops []cachedStop
	if err := loadCache(files[len(files)-1], &stops); err != nil {
		fmt.Printf("Error loading GMB stops cache: %v\n", err)
		return false
	}
	if err := seedStops(stops); err != nil {
		fmt.Printf("Error storing GMB stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d GMB stops\n", len(stops))

	fmt.Println("=== Minibus cache seeding complete ===")
	return true
}

// cachedStop mirrors the minibus_stop table columns for JSON cache.
type cachedStop struct {
	StopID        int     `json:"stop_id"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	HK80Lat       float64 `json:"hk80_latitude"`
	HK80Lng       float64 `json:"hk80_longitude"`
	Enabled       bool    `json:"enabled"`
	RemarksTC     *string `json:"remarks_tc"`
	RemarksSC     *string `json:"remarks_sc"`
	RemarksEN     *string `json:"remarks_en"`
	DataTimestamp string  `json:"data_timestamp"`
}

func seedStops(stops []cachedStop) error {
	insertSQL := `INSERT INTO minibus_stop
		(stop_id, latitude, longitude, hk80_latitude, hk80_longitude, enabled, remarks_tc, remarks_sc, remarks_en, data_timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (stop_id) DO UPDATE SET
			latitude = EXCLUDED.latitude,
			longitude = EXCLUDED.longitude,
			hk80_latitude = EXCLUDED.hk80_latitude,
			hk80_longitude = EXCLUDED.hk80_longitude,
			enabled = EXCLUDED.enabled,
			remarks_tc = EXCLUDED.remarks_tc,
			remarks_sc = EXCLUDED.remarks_sc,
			remarks_en = EXCLUDED.remarks_en,
			data_timestamp = EXCLUDED.data_timestamp`

	tx, err := minibusDB.Begin()
	if err != nil {
		return err
	}
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, s := range stops {
		if _, err := stmt.Exec(s.StopID, s.Latitude, s.Longitude, s.HK80Lat, s.HK80Lng,
			s.Enabled, s.RemarksTC, s.RemarksSC, s.RemarksEN, s.DataTimestamp); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}
