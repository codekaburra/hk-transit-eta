package minibus

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
)

var minibusDB *sql.DB

// SetDatabase sets the database connection for the minibus package
func SetDatabase(db *sql.DB) {
	minibusDB = db
}

func InitMinibusDatabase() {
	fmt.Println("Initializing minibus database...")

	// Create Minibus Routes table with direction-specific fields
	createMinibusRouteTable := `
	CREATE TABLE IF NOT EXISTS minibus_route (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		region TEXT NOT NULL,
		route_code TEXT NOT NULL,
		route_id INTEGER NOT NULL,
		route_seq INTEGER NOT NULL,
		description_tc TEXT,
		description_sc TEXT,
		description_en TEXT,
		orig_tc TEXT,
		orig_sc TEXT,
		orig_en TEXT,
		dest_tc TEXT,
		dest_sc TEXT,
		dest_en TEXT,
		remarks_tc TEXT,
		remarks_sc TEXT,
		remarks_en TEXT,
		direction_data_timestamp TEXT,
		data_timestamp TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(region, route_code, route_id, route_seq)
	);`

	_, err := minibusDB.Exec(createMinibusRouteTable)
	if err != nil {
		log.Fatal("Error creating minibus_route table:", err)
	}

	// Create minibus_headway table for scheduling information
	createMinibusHeadwayTableSQL := `
	CREATE TABLE IF NOT EXISTS minibus_headway (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		route_id INTEGER NOT NULL,
		route_seq INTEGER NOT NULL,
		headway_seq INTEGER NOT NULL,
		weekday_monday BOOLEAN NOT NULL,
		weekday_tuesday BOOLEAN NOT NULL,
		weekday_wednesday BOOLEAN NOT NULL,
		weekday_thursday BOOLEAN NOT NULL,
		weekday_friday BOOLEAN NOT NULL,
		weekday_saturday BOOLEAN NOT NULL,
		weekday_sunday BOOLEAN NOT NULL,
		public_holiday BOOLEAN NOT NULL,
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL,
		frequency INTEGER NOT NULL,
		frequency_upper INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route_id, route_seq, headway_seq)
	);`
	_, err = minibusDB.Exec(createMinibusHeadwayTableSQL)
	if err != nil {
		log.Fatal("Error creating minibus_headway table:", err)
	}

	// Create minibus_route_stop table for route stop information
	createMinibusRouteStopTableSQL := `
	CREATE TABLE IF NOT EXISTS minibus_route_stop (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		route_id INTEGER NOT NULL,
		route_seq INTEGER NOT NULL,
		stop_seq INTEGER NOT NULL,
		stop_id INTEGER NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		name_en TEXT NOT NULL,
		data_timestamp TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route_id, route_seq, stop_seq)
	);`
	_, err = minibusDB.Exec(createMinibusRouteStopTableSQL)
	if err != nil {
		log.Fatal("Error creating minibus_route_stop table:", err)
	}

	// Create minibus_stop table for stop coordinates and details
	createMinibusStopTableSQL := `
	CREATE TABLE IF NOT EXISTS minibus_stop (
		stop_id INTEGER PRIMARY KEY,
		latitude REAL NOT NULL,
		longitude REAL NOT NULL,
		hk80_latitude REAL,
		hk80_longitude REAL,
		enabled BOOLEAN NOT NULL,
		remarks_tc TEXT,
		remarks_sc TEXT,
		remarks_en TEXT,
		data_timestamp TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = minibusDB.Exec(createMinibusStopTableSQL)
	if err != nil {
		log.Fatal("Error creating minibus_stop table:", err)
	}

	fmt.Println("minibus database initialized successfully")
}

func ShouldFetchMinibusData() bool {
	// Check if Minibus database has data
	var count int
	err := minibusDB.QueryRow("SELECT COUNT(*) FROM minibus_route").Scan(&count)
	if err != nil || count == 0 {
		return true
	}
	return false
}

func storeMinibusRoutes(routes []MinibusRoute, region string) error {
	// Clear existing data for this region
	_, err := minibusDB.Exec("DELETE FROM minibus_route WHERE region = ?", region)
	if err != nil {
		return fmt.Errorf("error clearing existing minibus routes for region %s: %v", region, err)
	}

	// Clear existing headway data for this region's routes
	_, err = minibusDB.Exec(`DELETE FROM minibus_headway WHERE route_id IN 
		(SELECT route_id FROM minibus_route WHERE region = ?)`, region)
	if err != nil {
		return fmt.Errorf("error clearing existing minibus headways for region %s: %v", region, err)
	}

	// Clear existing route stop data for this region's routes
	_, err = minibusDB.Exec(`DELETE FROM minibus_route_stop WHERE route_id IN 
		(SELECT route_id FROM minibus_route WHERE region = ?)`, region)
	if err != nil {
		return fmt.Errorf("error clearing existing minibus route stops for region %s: %v", region, err)
	}

	// Insert new routes (each direction as a separate record)
	insertRouteSQL := `INSERT INTO minibus_route 
		(region, route_code, route_id, route_seq, description_tc, description_sc, description_en, 
		 orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en, 
		 direction_data_timestamp, data_timestamp) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	routeStmt, err := minibusDB.Prepare(insertRouteSQL)
	if err != nil {
		return fmt.Errorf("error preparing minibus route insert statement: %v", err)
	}
	defer routeStmt.Close()

	// Insert new headways
	insertHeadwaySQL := `INSERT INTO minibus_headway 
		(route_id, route_seq, headway_seq, weekday_monday, weekday_tuesday, weekday_wednesday, 
		 weekday_thursday, weekday_friday, weekday_saturday, weekday_sunday, public_holiday, 
		 start_time, end_time, frequency, frequency_upper) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	headwayStmt, err := minibusDB.Prepare(insertHeadwaySQL)
	if err != nil {
		return fmt.Errorf("error preparing minibus headway insert statement: %v", err)
	}
	defer headwayStmt.Close()

	// Insert new route stops
	insertRouteStopSQL := `INSERT INTO minibus_route_stop 
		(route_id, route_seq, stop_seq, stop_id, name_tc, name_sc, name_en, data_timestamp) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	routeStopStmt, err := minibusDB.Prepare(insertRouteStopSQL)
	if err != nil {
		return fmt.Errorf("error preparing minibus route stop insert statement: %v", err)
	}
	defer routeStopStmt.Close()

	insertedRoutes := 0
	insertedHeadways := 0
	insertedRouteStops := 0

	for _, route := range routes {
		// For each route, insert each direction as a separate record
		for _, direction := range route.Directions {
			// Convert pointer fields to strings for database insertion
			var remarksTC, remarksSC, remarksEN string
			if direction.RemarksTC != nil {
				remarksTC = *direction.RemarksTC
			}
			if direction.RemarksSC != nil {
				remarksSC = *direction.RemarksSC
			}
			if direction.RemarksEN != nil {
				remarksEN = *direction.RemarksEN
			}

			// Insert route record for this direction
			_, err := routeStmt.Exec(
				route.Region,
				route.RouteCode,
				route.RouteID,
				direction.RouteSeq,
				route.DescriptionTC,
				route.DescriptionSC,
				route.DescriptionEN,
				direction.OrigTC,
				direction.OrigSC,
				direction.OrigEN,
				direction.DestTC,
				direction.DestSC,
				direction.DestEN,
				remarksTC,
				remarksSC,
				remarksEN,
				direction.DataTimestamp,
				route.DataTimestamp,
			)
			if err != nil {
				log.Printf("Error inserting minibus route %s/%d/%d for region %s: %v", route.RouteCode, route.RouteID, direction.RouteSeq, region, err)
				continue
			}
			insertedRoutes++

			// Insert headways for this direction
			for _, headway := range direction.Headways {
				// Convert weekdays array to individual boolean fields
				var weekdays [7]bool
				for i, day := range headway.Weekdays {
					if i < 7 {
						weekdays[i] = day
					}
				}

				var freqUpper *int
				if headway.FrequencyUpper != nil {
					freqUpper = headway.FrequencyUpper
				}

				_, err := headwayStmt.Exec(
					route.RouteID,
					direction.RouteSeq,
					headway.HeadwaySeq,
					weekdays[0], // Monday
					weekdays[1], // Tuesday
					weekdays[2], // Wednesday
					weekdays[3], // Thursday
					weekdays[4], // Friday
					weekdays[5], // Saturday
					weekdays[6], // Sunday
					headway.PublicHoliday,
					headway.StartTime,
					headway.EndTime,
					headway.Frequency,
					freqUpper,
				)
				if err != nil {
					log.Printf("Error inserting headway for route %s/%d seq %d: %v", route.RouteCode, route.RouteID, direction.RouteSeq, err)
					continue
				}
				insertedHeadways++
			}

			// Fetch and insert route stops for this direction
			fmt.Printf("Fetching route stops for route %d, sequence %d\n", route.RouteID, direction.RouteSeq)
			routeStops, err := fetchRouteStops(route.RouteID, direction.RouteSeq)
			if err != nil {
				log.Printf("Error fetching route stops for route %d seq %d: %v", route.RouteID, direction.RouteSeq, err)
				continue
			}

			// Insert route stops
			for _, routeStop := range routeStops.RouteStops {
				_, err := routeStopStmt.Exec(
					route.RouteID,
					direction.RouteSeq,
					routeStop.StopSeq,
					routeStop.StopID,
					routeStop.NameTC,
					routeStop.NameSC,
					routeStop.NameEN,
					routeStops.DataTimestamp,
				)
				if err != nil {
					log.Printf("Error inserting route stop for route %d seq %d stop %d: %v", route.RouteID, direction.RouteSeq, routeStop.StopSeq, err)
					continue
				}
				insertedRouteStops++
			}
		}
	}

	fmt.Printf("Successfully inserted %d detailed minibus route directions, %d headways, and %d route stops for region %s\n",
		insertedRoutes, insertedHeadways, insertedRouteStops, region)
	return nil
}

// FetchAndStoreStopCoordinates fetches coordinates for all unique stops that don't have coordinates yet
func FetchAndStoreStopCoordinates() error {
	fmt.Println("=== Fetching Minibus Stop Coordinates ===")

	// Get all unique stop IDs that don't have coordinates yet
	rows, err := minibusDB.Query(`
		SELECT DISTINCT stop_id 
		FROM minibus_route_stop 
		WHERE stop_id NOT IN (SELECT stop_id FROM minibus_stop)
		ORDER BY stop_id
	`)
	if err != nil {
		return fmt.Errorf("error querying unique stop IDs: %v", err)
	}
	defer rows.Close()

	var stopIDs []int
	for rows.Next() {
		var stopID int
		if err := rows.Scan(&stopID); err != nil {
			log.Printf("Error scanning stop ID: %v", err)
			continue
		}
		stopIDs = append(stopIDs, stopID)
	}

	fmt.Printf("Found %d unique stops to fetch coordinates for\n", len(stopIDs))

	// Prepare insert statement for stops
	insertStopSQL := `INSERT OR REPLACE INTO minibus_stop 
		(stop_id, latitude, longitude, hk80_latitude, hk80_longitude, enabled, remarks_tc, remarks_sc, remarks_en, data_timestamp) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	stopStmt, err := minibusDB.Prepare(insertStopSQL)
	if err != nil {
		return fmt.Errorf("error preparing stop insert statement: %v", err)
	}
	defer stopStmt.Close()

	insertedStops := 0

	// Fetch coordinates for each stop
	for _, stopID := range stopIDs {
		fmt.Printf("Fetching coordinates for stop %d\n", stopID)

		stopData, err := fetchStopCoordinates(stopID)
		if err != nil {
			log.Printf("Error fetching stop coordinates for stop %d: %v", stopID, err)
			continue
		}

		// Insert stop coordinates
		_, err = stopStmt.Exec(
			stopID,
			stopData.Coordinates.WGS84.Latitude,
			stopData.Coordinates.WGS84.Longitude,
			stopData.Coordinates.HK80.Latitude,
			stopData.Coordinates.HK80.Longitude,
			stopData.Enabled,
			stopData.RemarksTC,
			stopData.RemarksSC,
			stopData.RemarksEN,
			stopData.DataTimestamp,
		)
		if err != nil {
			log.Printf("Error inserting stop coordinates for stop %d: %v", stopID, err)
			continue
		}
		insertedStops++
	}

	fmt.Printf("Successfully inserted coordinates for %d stops\n", insertedStops)
	fmt.Println("=== Minibus Stop Coordinates Fetching Complete ===")
	return nil
}

func fetchStopCoordinates(stopID int) (*MinibusStopResponse, error) {
	apiURL := fmt.Sprintf("https://data.etagmb.gov.hk/stop/%d", stopID)

	response, err := fetchAPI(apiURL)
	if err != nil {
		return nil, fmt.Errorf("error fetching stop coordinates: %v", err)
	}

	var stopData MinibusStopResponse
	err = json.Unmarshal(response.Data, &stopData)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling stop coordinates: %v", err)
	}

	return &stopData, nil
}
