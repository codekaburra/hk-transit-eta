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

	createMinibusRouteTable := `
	CREATE TABLE IF NOT EXISTS minibus_route (
		id SERIAL PRIMARY KEY,
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
		last_update_date TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(region, route_code, route_id, route_seq)
	);`
	if _, err := minibusDB.Exec(createMinibusRouteTable); err != nil {
		log.Fatal("Error creating minibus_route table:", err)
	}

	// Migration for tables created before last_update_date existed.
	if _, err := minibusDB.Exec(
		`ALTER TABLE minibus_route ADD COLUMN IF NOT EXISTS last_update_date TEXT`); err != nil {
		log.Fatal("Error adding last_update_date column:", err)
	}

	createMinibusHeadwayTableSQL := `
	CREATE TABLE IF NOT EXISTS minibus_headway (
		id SERIAL PRIMARY KEY,
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
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route_id, route_seq, headway_seq)
	);`
	if _, err := minibusDB.Exec(createMinibusHeadwayTableSQL); err != nil {
		log.Fatal("Error creating minibus_headway table:", err)
	}

	createMinibusRouteStopTableSQL := `
	CREATE TABLE IF NOT EXISTS minibus_route_stop (
		id SERIAL PRIMARY KEY,
		route_id INTEGER NOT NULL,
		route_seq INTEGER NOT NULL,
		stop_seq INTEGER NOT NULL,
		stop_id INTEGER NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		name_en TEXT NOT NULL,
		data_timestamp TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route_id, route_seq, stop_seq)
	);`
	if _, err := minibusDB.Exec(createMinibusRouteStopTableSQL); err != nil {
		log.Fatal("Error creating minibus_route_stop table:", err)
	}

	createMinibusStopTableSQL := `
	CREATE TABLE IF NOT EXISTS minibus_stop (
		stop_id INTEGER PRIMARY KEY,
		latitude DOUBLE PRECISION NOT NULL,
		longitude DOUBLE PRECISION NOT NULL,
		hk80_latitude DOUBLE PRECISION,
		hk80_longitude DOUBLE PRECISION,
		enabled BOOLEAN NOT NULL,
		remarks_tc TEXT,
		remarks_sc TEXT,
		remarks_en TEXT,
		data_timestamp TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`
	if _, err := minibusDB.Exec(createMinibusStopTableSQL); err != nil {
		log.Fatal("Error creating minibus_stop table:", err)
	}

	fmt.Println("Minibus database initialized successfully")
}

func ShouldFetchMinibusData() bool {
	var count int
	err := minibusDB.QueryRow("SELECT COUNT(*) FROM minibus_route").Scan(&count)
	if err != nil || count == 0 {
		return true
	}
	return false
}

func storeMinibusRoutes(routes []MinibusRoute, region string, fetchStops bool) error {
	// Clear existing data for this region. Delete child tables first, while the
	// parent minibus_route rows still exist for the subquery to match.
	if _, err := minibusDB.Exec(`DELETE FROM minibus_headway WHERE route_id IN
		(SELECT route_id FROM minibus_route WHERE region = $1)`, region); err != nil {
		return fmt.Errorf("error clearing minibus headways for region %s: %v", region, err)
	}
	if _, err := minibusDB.Exec(`DELETE FROM minibus_route_stop WHERE route_id IN
		(SELECT route_id FROM minibus_route WHERE region = $1)`, region); err != nil {
		return fmt.Errorf("error clearing minibus route stops for region %s: %v", region, err)
	}
	if _, err := minibusDB.Exec("DELETE FROM minibus_route WHERE region = $1", region); err != nil {
		return fmt.Errorf("error clearing minibus routes for region %s: %v", region, err)
	}

	return upsertMinibusRoutes(routes, fetchStops)
}

// upsertMinibusRoutes inserts or updates route directions plus their headways.
// When fetchStops is true, each direction's route-stops are fetched live (one
// request per direction); seeding from a local snapshot passes false and
// inserts route-stops from the snapshot instead.
func upsertMinibusRoutes(routes []MinibusRoute, fetchStops bool) error {
	insertRouteSQL := `INSERT INTO minibus_route
		(region, route_code, route_id, route_seq, description_tc, description_sc, description_en,
		 orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en,
		 direction_data_timestamp, data_timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		ON CONFLICT (region, route_code, route_id, route_seq) DO UPDATE SET
			description_tc = EXCLUDED.description_tc,
			description_sc = EXCLUDED.description_sc,
			description_en = EXCLUDED.description_en,
			orig_tc = EXCLUDED.orig_tc, orig_sc = EXCLUDED.orig_sc, orig_en = EXCLUDED.orig_en,
			dest_tc = EXCLUDED.dest_tc, dest_sc = EXCLUDED.dest_sc, dest_en = EXCLUDED.dest_en,
			remarks_tc = EXCLUDED.remarks_tc, remarks_sc = EXCLUDED.remarks_sc, remarks_en = EXCLUDED.remarks_en,
			direction_data_timestamp = EXCLUDED.direction_data_timestamp,
			data_timestamp = EXCLUDED.data_timestamp`
	routeStmt, err := minibusDB.Prepare(insertRouteSQL)
	if err != nil {
		return fmt.Errorf("error preparing minibus route insert: %v", err)
	}
	defer routeStmt.Close()

	insertHeadwaySQL := `INSERT INTO minibus_headway
		(route_id, route_seq, headway_seq, weekday_monday, weekday_tuesday, weekday_wednesday,
		 weekday_thursday, weekday_friday, weekday_saturday, weekday_sunday, public_holiday,
		 start_time, end_time, frequency, frequency_upper)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (route_id, route_seq, headway_seq) DO UPDATE SET
			weekday_monday = EXCLUDED.weekday_monday,
			weekday_tuesday = EXCLUDED.weekday_tuesday,
			weekday_wednesday = EXCLUDED.weekday_wednesday,
			weekday_thursday = EXCLUDED.weekday_thursday,
			weekday_friday = EXCLUDED.weekday_friday,
			weekday_saturday = EXCLUDED.weekday_saturday,
			weekday_sunday = EXCLUDED.weekday_sunday,
			public_holiday = EXCLUDED.public_holiday,
			start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
			frequency = EXCLUDED.frequency, frequency_upper = EXCLUDED.frequency_upper`
	headwayStmt, err := minibusDB.Prepare(insertHeadwaySQL)
	if err != nil {
		return fmt.Errorf("error preparing minibus headway insert: %v", err)
	}
	defer headwayStmt.Close()

	insertRouteStopSQL := `INSERT INTO minibus_route_stop
		(route_id, route_seq, stop_seq, stop_id, name_tc, name_sc, name_en, data_timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (route_id, route_seq, stop_seq) DO UPDATE SET
			stop_id = EXCLUDED.stop_id,
			name_tc = EXCLUDED.name_tc, name_sc = EXCLUDED.name_sc, name_en = EXCLUDED.name_en,
			data_timestamp = EXCLUDED.data_timestamp`
	routeStopStmt, err := minibusDB.Prepare(insertRouteStopSQL)
	if err != nil {
		return fmt.Errorf("error preparing minibus route stop insert: %v", err)
	}
	defer routeStopStmt.Close()

	insertedRoutes, insertedHeadways, insertedRouteStops := 0, 0, 0

	for _, route := range routes {
		for _, direction := range route.Directions {
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

			_, err := routeStmt.Exec(
				route.Region, route.RouteCode, route.RouteID, direction.RouteSeq,
				route.DescriptionTC, route.DescriptionSC, route.DescriptionEN,
				direction.OrigTC, direction.OrigSC, direction.OrigEN,
				direction.DestTC, direction.DestSC, direction.DestEN,
				remarksTC, remarksSC, remarksEN,
				direction.DataTimestamp, route.DataTimestamp,
			)
			if err != nil {
				log.Printf("Error inserting minibus route %s/%d/%d: %v", route.RouteCode, route.RouteID, direction.RouteSeq, err)
				continue
			}
			insertedRoutes++

			for _, headway := range direction.Headways {
				var weekdays [7]bool
				for i, day := range headway.Weekdays {
					if i < 7 {
						weekdays[i] = day
					}
				}

				_, err := headwayStmt.Exec(
					route.RouteID, direction.RouteSeq, headway.HeadwaySeq,
					weekdays[0], weekdays[1], weekdays[2], weekdays[3],
					weekdays[4], weekdays[5], weekdays[6],
					headway.PublicHoliday,
					headway.StartTime, headway.EndTime,
					headway.Frequency, headway.FrequencyUpper,
				)
				if err != nil {
					log.Printf("Error inserting headway for route %s/%d: %v", route.RouteCode, route.RouteID, err)
					continue
				}
				insertedHeadways++
			}

			if !fetchStops {
				continue
			}
			fmt.Printf("Fetching route stops for route %d, sequence %d\n", route.RouteID, direction.RouteSeq)
			routeStops, err := fetchRouteStops(route.RouteID, direction.RouteSeq)
			if err != nil {
				log.Printf("Error fetching route stops for route %d seq %d: %v", route.RouteID, direction.RouteSeq, err)
				continue
			}

			for _, routeStop := range routeStops.RouteStops {
				_, err := routeStopStmt.Exec(
					route.RouteID, direction.RouteSeq, routeStop.StopSeq,
					routeStop.StopID, routeStop.NameTC, routeStop.NameSC, routeStop.NameEN,
					routeStops.DataTimestamp,
				)
				if err != nil {
					log.Printf("Error inserting route stop for route %d seq %d stop %d: %v",
						route.RouteID, direction.RouteSeq, routeStop.StopSeq, err)
					continue
				}
				insertedRouteStops++
			}
		}
	}

	fmt.Printf("Inserted %d route directions, %d headways, %d route stops\n",
		insertedRoutes, insertedHeadways, insertedRouteStops)
	return nil
}

// deleteMinibusRouteIDs removes the given routes and their children.
func deleteMinibusRouteIDs(routeIDs []int) error {
	for _, id := range routeIDs {
		for _, table := range []string{"minibus_headway", "minibus_route_stop", "minibus_route"} {
			if _, err := minibusDB.Exec("DELETE FROM "+table+" WHERE route_id = $1", id); err != nil {
				return fmt.Errorf("error deleting route %d from %s: %v", id, table, err)
			}
		}
	}
	return nil
}

// pruneOrphanStops removes stops no longer referenced by any route-stop.
// minibus_stop is otherwise only ever upserted, so stops belonging to
// removed routes would linger forever.
func pruneOrphanStops() error {
	res, err := minibusDB.Exec(`DELETE FROM minibus_stop
		WHERE stop_id NOT IN (SELECT DISTINCT stop_id FROM minibus_route_stop)`)
	if err != nil {
		return fmt.Errorf("error pruning orphan minibus stops: %v", err)
	}
	if n, err := res.RowsAffected(); err == nil && n > 0 {
		fmt.Printf("Pruned %d orphan minibus stops\n", n)
	}
	return nil
}

// FetchAndStoreStopCoordinates fetches coordinates for stops not yet in minibus_stop
func FetchAndStoreStopCoordinates() error {
	fmt.Println("=== Fetching Minibus Stop Coordinates ===")

	rows, err := minibusDB.Query(`
		SELECT DISTINCT stop_id
		FROM minibus_route_stop
		WHERE stop_id NOT IN (SELECT stop_id FROM minibus_stop)
		ORDER BY stop_id
	`)
	if err != nil {
		return fmt.Errorf("error querying stop IDs: %v", err)
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

	fmt.Printf("Found %d stops to fetch\n", len(stopIDs))

	insertStopSQL := `INSERT INTO minibus_stop
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
	stopStmt, err := minibusDB.Prepare(insertStopSQL)
	if err != nil {
		return fmt.Errorf("error preparing stop insert: %v", err)
	}
	defer stopStmt.Close()

	insertedStops := 0
	for _, stopID := range stopIDs {
		fmt.Printf("Fetching coordinates for stop %d\n", stopID)
		stopData, err := fetchStopCoordinates(stopID)
		if err != nil {
			log.Printf("Error fetching stop %d: %v", stopID, err)
			continue
		}

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
			log.Printf("Error inserting stop %d: %v", stopID, err)
			continue
		}
		insertedStops++
	}

	fmt.Printf("Inserted coordinates for %d stops\n", insertedStops)
	return nil
}

func fetchStopCoordinates(stopID int) (*MinibusStopResponse, error) {
	apiURL := fmt.Sprintf("https://data.etagmb.gov.hk/stop/%d", stopID)
	response, err := gmbFetch(apiURL)
	if err != nil {
		return nil, fmt.Errorf("error fetching stop coordinates: %v", err)
	}

	var stopData MinibusStopResponse
	if err := json.Unmarshal(response.Data, &stopData); err != nil {
		return nil, fmt.Errorf("error unmarshaling stop coordinates: %v", err)
	}
	return &stopData, nil
}
