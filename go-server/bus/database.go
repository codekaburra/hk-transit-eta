package bus

import (
	"database/sql"
	"fmt"
	"log"
)

var database *sql.DB

// SetDatabase sets the database connection for the bus package
func SetDatabase(db *sql.DB) {
	database = db
}

const DatabaseCompany_KowloonBus = "KMB"
const DatabaseCompany_CityBus = "CTB"

func ShouldFetchBusData() bool {
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}
	return false
}

func InitBusDatabase() {
	var err error

	// Create routes table
	createRoutesTableSQL := `
	CREATE TABLE IF NOT EXISTS routes (
		id SERIAL PRIMARY KEY,
		company TEXT NOT NULL,
		route TEXT NOT NULL,
		direction TEXT,
		service_type TEXT,
		orig_en TEXT NOT NULL,
		orig_tc TEXT NOT NULL,
		orig_sc TEXT NOT NULL,
		dest_en TEXT NOT NULL,
		dest_tc TEXT NOT NULL,
		dest_sc TEXT NOT NULL,
		data_timestamp TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(company, route, direction, service_type)
	);`
	_, err = database.Exec(createRoutesTableSQL)
	if err != nil {
		log.Fatal("Error creating routes table:", err)
	}

	// Create stops table
	createStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS stops (
		id SERIAL PRIMARY KEY,
		company TEXT NOT NULL,
		stop TEXT NOT NULL UNIQUE,
		name_en TEXT NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		lat TEXT NOT NULL,
		long TEXT NOT NULL,
		data_timestamp TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = database.Exec(createStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating stops table:", err)
	}

	// Create route_stops table
	createRouteStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS route_stops (
		id SERIAL PRIMARY KEY,
		company TEXT NOT NULL,
		route TEXT NOT NULL,
		direction TEXT NOT NULL,
		service_type TEXT NOT NULL,
		seq TEXT NOT NULL,
		stop TEXT NOT NULL,
		data_timestamp TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(company, route, direction, service_type, seq)
	);`
	_, err = database.Exec(createRouteStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating route_stops table:", err)
	}

	fmt.Println("Bus database initialized successfully")
}

func QueryDatabase() {
	var routeCount int
	err := database.QueryRow("SELECT COUNT(*) FROM routes").Scan(&routeCount)
	if err != nil {
		log.Fatal("Error querying routes count:", err)
	}

	var stopCount int
	err = database.QueryRow("SELECT COUNT(*) FROM stops").Scan(&stopCount)
	if err != nil {
		log.Fatal("Error querying stops count:", err)
	}

	var routeStopCount int
	err = database.QueryRow("SELECT COUNT(*) FROM route_stops").Scan(&routeStopCount)
	if err != nil {
		log.Fatal("Error querying route-stops count:", err)
	}

	fmt.Printf("\n=== Bus Database Summary ===\n")
	fmt.Printf("Total routes: %d\n", routeCount)
	fmt.Printf("Total stops: %d\n", stopCount)
	fmt.Printf("Total route-stop relationships: %d\n\n", routeStopCount)
}

const insertRouteSQL = `
INSERT INTO routes (company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc, data_timestamp)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (company, route, direction, service_type) DO UPDATE SET
	orig_en = EXCLUDED.orig_en,
	orig_tc = EXCLUDED.orig_tc,
	orig_sc = EXCLUDED.orig_sc,
	dest_en = EXCLUDED.dest_en,
	dest_tc = EXCLUDED.dest_tc,
	dest_sc = EXCLUDED.dest_sc,
	data_timestamp = EXCLUDED.data_timestamp`

const insertStopSQL = `
INSERT INTO stops (company, stop, name_en, name_tc, name_sc, lat, long, data_timestamp)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (stop) DO UPDATE SET
	name_en = EXCLUDED.name_en,
	name_tc = EXCLUDED.name_tc,
	name_sc = EXCLUDED.name_sc,
	lat = EXCLUDED.lat,
	long = EXCLUDED.long,
	data_timestamp = EXCLUDED.data_timestamp`

const insertRouteStopSQL = `
INSERT INTO route_stops (company, route, direction, service_type, seq, stop, data_timestamp)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (company, route, direction, service_type, seq) DO UPDATE SET
	stop = EXCLUDED.stop,
	data_timestamp = EXCLUDED.data_timestamp`

func insertRoutesTx(tx *sql.Tx, routes []Route) error {
	stmt, err := tx.Prepare(insertRouteSQL)
	if err != nil {
		return fmt.Errorf("error preparing route statement: %v", err)
	}
	defer stmt.Close()
	for _, route := range routes {
		if _, err := stmt.Exec(route.Company, route.Route, route.Direction, route.ServiceType,
			route.OrigEn, route.OrigTc, route.OrigSc,
			route.DestEn, route.DestTc, route.DestSc, route.DataTimestamp); err != nil {
			return fmt.Errorf("error inserting route %s: %v", route.Route, err)
		}
	}
	return nil
}

func insertStopsTx(tx *sql.Tx, stops []Stop) error {
	stmt, err := tx.Prepare(insertStopSQL)
	if err != nil {
		return fmt.Errorf("error preparing stop statement: %v", err)
	}
	defer stmt.Close()
	for _, stop := range stops {
		if _, err := stmt.Exec(stop.Company, stop.Stop, stop.NameEn, stop.NameTc, stop.NameSc,
			stop.Lat, stop.Long, stop.DataTimestamp); err != nil {
			return fmt.Errorf("error inserting stop %s: %v", stop.Stop, err)
		}
	}
	return nil
}

func insertRouteStopsTx(tx *sql.Tx, routeStops []RouteStop) error {
	stmt, err := tx.Prepare(insertRouteStopSQL)
	if err != nil {
		return fmt.Errorf("error preparing route-stop statement: %v", err)
	}
	defer stmt.Close()
	for _, rs := range routeStops {
		if _, err := stmt.Exec(rs.Company, rs.Route, rs.Direction, rs.ServiceType,
			rs.Seq, rs.Stop, rs.DataTimestamp); err != nil {
			return fmt.Errorf("error inserting route-stop %s-%s-%s: %v", rs.Route, rs.Direction, rs.Seq, err)
		}
	}
	return nil
}

func runInTx(fn func(tx *sql.Tx) error) error {
	tx, err := database.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func storeRoutes(routes []Route) error {
	return runInTx(func(tx *sql.Tx) error { return insertRoutesTx(tx, routes) })
}

func storeStops(stops []Stop) error {
	return runInTx(func(tx *sql.Tx) error { return insertStopsTx(tx, stops) })
}

func storeRouteStops(routeStops []RouteStop) error {
	fmt.Printf("Storing %d route stops\n", len(routeStops))
	return runInTx(func(tx *sql.Tx) error { return insertRouteStopsTx(tx, routeStops) })
}

// ReplaceCompanyData atomically swaps all rows for one company. Used by
// refresh so removed routes/stops don't linger as zombie rows, while a
// mid-refresh failure rolls back to the previous complete dataset.
func ReplaceCompanyData(company string, routes []Route, stops []Stop, routeStops []RouteStop) error {
	return runInTx(func(tx *sql.Tx) error {
		for _, table := range []string{"route_stops", "routes", "stops"} {
			if _, err := tx.Exec("DELETE FROM "+table+" WHERE company = $1", company); err != nil {
				return fmt.Errorf("error clearing %s for %s: %v", table, company, err)
			}
		}
		if err := insertRoutesTx(tx, routes); err != nil {
			return err
		}
		if err := insertStopsTx(tx, stops); err != nil {
			return err
		}
		return insertRouteStopsTx(tx, routeStops)
	})
}
