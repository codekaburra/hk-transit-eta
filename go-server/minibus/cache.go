package minibus

import (
	"fmt"
	"path/filepath"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/syncmeta"
)

const minibusCacheDir = "data/minibus"

// SeedFromCache loads minibus data from JSON cache files and stores it in the DB.
// Returns false if any cache file is missing.
func SeedFromCache(dataDir string) bool {
	mbDir := filepath.Join(dataDir, "minibus")
	regions := []string{MinibusRegionHKI, MinibusRegionKLN, MinibusRegionNT}

	var files []string
	for _, r := range regions {
		files = append(files, filepath.Join(mbDir, "gmb_routes_"+r+".json"))
	}
	files = append(files, filepath.Join(mbDir, "gmb_route_stops.json"))
	files = append(files, filepath.Join(mbDir, "gmb_stops.json"))

	if !cache.Exists(files...) {
		return false
	}

	fmt.Println("=== Seeding minibus data from cache ===")

	for i, region := range regions {
		var routes []MinibusRoute
		if err := cache.Load(files[i], &routes); err != nil {
			fmt.Printf("Error loading GMB routes cache for %s: %v\n", region, err)
			return false
		}
		if err := storeMinibusRoutes(routes, region, false); err != nil {
			fmt.Printf("Error storing GMB routes for %s: %v\n", region, err)
			return false
		}
		fmt.Printf("Seeded %d GMB routes for region %s\n", len(routes), region)
	}

	var routeStops []cachedRouteStop
	if err := cache.Load(files[len(files)-2], &routeStops); err != nil {
		fmt.Printf("Error loading GMB route-stops cache: %v\n", err)
		return false
	}
	if err := seedRouteStops(routeStops); err != nil {
		fmt.Printf("Error storing GMB route-stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d GMB route-stops\n", len(routeStops))

	var stops []cachedStop
	if err := cache.Load(files[len(files)-1], &stops); err != nil {
		fmt.Printf("Error loading GMB stops cache: %v\n", err)
		return false
	}
	if err := seedStops(stops); err != nil {
		fmt.Printf("Error storing GMB stops: %v\n", err)
		return false
	}
	fmt.Printf("Seeded %d GMB stops\n", len(stops))

	fmt.Println("=== Minibus cache seeding complete ===")
	if err := syncmeta.Record("gmb_seed", ""); err != nil {
		fmt.Printf("Warning: could not record gmb seed: %v\n", err)
	}
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

// cachedRouteStop mirrors the minibus_route_stop table columns for JSON cache.
type cachedRouteStop struct {
	RouteID       int    `json:"route_id"`
	RouteSeq      int    `json:"route_seq"`
	StopSeq       int    `json:"stop_seq"`
	StopID        int    `json:"stop_id"`
	NameTC        string `json:"name_tc"`
	NameSC        string `json:"name_sc"`
	NameEN        string `json:"name_en"`
	DataTimestamp string `json:"data_timestamp"`
}

func seedRouteStops(routeStops []cachedRouteStop) error {
	insertSQL := `INSERT INTO minibus_route_stop
		(route_id, route_seq, stop_seq, stop_id, name_tc, name_sc, name_en, data_timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (route_id, route_seq, stop_seq) DO UPDATE SET
			stop_id = EXCLUDED.stop_id,
			name_tc = EXCLUDED.name_tc, name_sc = EXCLUDED.name_sc, name_en = EXCLUDED.name_en,
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
	for _, rs := range routeStops {
		if _, err := stmt.Exec(rs.RouteID, rs.RouteSeq, rs.StopSeq, rs.StopID,
			rs.NameTC, rs.NameSC, rs.NameEN, rs.DataTimestamp); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

// ExportSnapshot writes the complete GMB dataset from the database to the
// JSON snapshot files that SeedFromCache reads. Exporting from the database
// (rather than saving fetch-time deltas) guarantees the files are complete
// even after interrupted fetches or incremental refreshes.
func ExportSnapshot(dataDir string) error {
	mbDir := filepath.Join(dataDir, "minibus")

	// Headways per (route_id, route_seq).
	headways := map[[2]int][]Headway{}
	hwRows, err := minibusDB.Query(`SELECT route_id, route_seq, headway_seq,
		weekday_monday, weekday_tuesday, weekday_wednesday, weekday_thursday,
		weekday_friday, weekday_saturday, weekday_sunday, public_holiday,
		start_time, end_time, frequency, frequency_upper
		FROM minibus_headway ORDER BY route_id, route_seq, headway_seq`)
	if err != nil {
		return err
	}
	for hwRows.Next() {
		var id, seq int
		var h Headway
		var wd [7]bool
		if err := hwRows.Scan(&id, &seq, &h.HeadwaySeq,
			&wd[0], &wd[1], &wd[2], &wd[3], &wd[4], &wd[5], &wd[6],
			&h.PublicHoliday, &h.StartTime, &h.EndTime, &h.Frequency, &h.FrequencyUpper); err != nil {
			hwRows.Close()
			return err
		}
		h.Weekdays = wd[:]
		headways[[2]int{id, seq}] = append(headways[[2]int{id, seq}], h)
	}
	hwRows.Close()

	// Routes per region, grouped into MinibusRoute with nested directions.
	for _, region := range []string{MinibusRegionHKI, MinibusRegionKLN, MinibusRegionNT} {
		rtRows, err := minibusDB.Query(`SELECT route_code, route_id, route_seq,
			description_tc, description_sc, description_en,
			orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en,
			remarks_tc, remarks_sc, remarks_en,
			COALESCE(direction_data_timestamp, ''), COALESCE(data_timestamp, '')
			FROM minibus_route WHERE region = $1 ORDER BY route_id, route_seq`, region)
		if err != nil {
			return err
		}
		var routes []MinibusRoute
		for rtRows.Next() {
			var code string
			var id, seq int
			var descTC, descSC, descEN string
			var d Direction
			var remarksTC, remarksSC, remarksEN string
			var dataTimestamp string
			if err := rtRows.Scan(&code, &id, &seq, &descTC, &descSC, &descEN,
				&d.OrigTC, &d.OrigSC, &d.OrigEN, &d.DestTC, &d.DestSC, &d.DestEN,
				&remarksTC, &remarksSC, &remarksEN, &d.DataTimestamp, &dataTimestamp); err != nil {
				rtRows.Close()
				return err
			}
			d.RouteSeq = seq
			d.RemarksTC, d.RemarksSC, d.RemarksEN = &remarksTC, &remarksSC, &remarksEN
			d.Headways = headways[[2]int{id, seq}]
			if n := len(routes); n > 0 && routes[n-1].RouteID == id {
				routes[n-1].Directions = append(routes[n-1].Directions, d)
			} else {
				routes = append(routes, MinibusRoute{
					Region: region, RouteCode: code, RouteID: id,
					DescriptionTC: descTC, DescriptionSC: descSC, DescriptionEN: descEN,
					DataTimestamp: dataTimestamp,
					Directions:    []Direction{d},
				})
			}
		}
		rtRows.Close()
		if err := cache.Save(filepath.Join(mbDir, "gmb_routes_"+region+".json"), routes); err != nil {
			return err
		}
	}

	// Flat route-stops.
	var routeStops []cachedRouteStop
	rsRows, err := minibusDB.Query(`SELECT route_id, route_seq, stop_seq, stop_id,
		name_tc, name_sc, name_en, COALESCE(data_timestamp, '')
		FROM minibus_route_stop ORDER BY route_id, route_seq, stop_seq`)
	if err != nil {
		return err
	}
	for rsRows.Next() {
		var rs cachedRouteStop
		if err := rsRows.Scan(&rs.RouteID, &rs.RouteSeq, &rs.StopSeq, &rs.StopID,
			&rs.NameTC, &rs.NameSC, &rs.NameEN, &rs.DataTimestamp); err != nil {
			rsRows.Close()
			return err
		}
		routeStops = append(routeStops, rs)
	}
	rsRows.Close()
	if err := cache.Save(filepath.Join(mbDir, "gmb_route_stops.json"), routeStops); err != nil {
		return err
	}

	// Flat stops.
	var stops []cachedStop
	stRows, err := minibusDB.Query(`SELECT stop_id, latitude, longitude,
		COALESCE(hk80_latitude, 0), COALESCE(hk80_longitude, 0), enabled,
		remarks_tc, remarks_sc, remarks_en, COALESCE(data_timestamp, '')
		FROM minibus_stop ORDER BY stop_id`)
	if err != nil {
		return err
	}
	for stRows.Next() {
		var s cachedStop
		if err := stRows.Scan(&s.StopID, &s.Latitude, &s.Longitude, &s.HK80Lat, &s.HK80Lng,
			&s.Enabled, &s.RemarksTC, &s.RemarksSC, &s.RemarksEN, &s.DataTimestamp); err != nil {
			stRows.Close()
			return err
		}
		stops = append(stops, s)
	}
	stRows.Close()
	if err := cache.Save(filepath.Join(mbDir, "gmb_stops.json"), stops); err != nil {
		return err
	}

	fmt.Println("GMB snapshot exported from database")
	return nil
}
