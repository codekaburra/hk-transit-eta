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
	// Check if KMB database has data
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM kmb_routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}

	// Check if Citybus database has data
	err = database.QueryRow("SELECT COUNT(*) FROM citybus_routes").Scan(&count)
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
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		company TEXT NOT NULL,
		route TEXT NOT NULL,
		direction TEXT NULL,
		service_type TEXT NULL,
		orig_en TEXT NOT NULL,
		orig_tc TEXT NOT NULL,
		orig_sc TEXT NOT NULL,
		dest_en TEXT NOT NULL,
		dest_tc TEXT NOT NULL,
		dest_sc TEXT NOT NULL,
		data_timestamp TEXT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = database.Exec(createRoutesTableSQL)
	if err != nil {
		log.Fatal("Error creating routes table:", err)
	}

	// Create stops table
	createStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS stops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		company TEXT NOT NULL,
		stop TEXT NOT NULL UNIQUE,
		name_en TEXT NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		lat TEXT NOT NULL,
		long TEXT NOT NULL,
		data_timestamp TEXT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = database.Exec(createStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating stops table:", err)
	}

	// Create route_stops table
	createRouteStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS route_stops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		company TEXT NOT NULL,
		route TEXT NOT NULL,
		direction TEXT NOT NULL,
		service_type TEXT NOT NULL,
		seq TEXT NOT NULL,
		stop TEXT NOT NULL,
		data_timestamp TEXT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route, direction, service_type, seq)
	);`

	_, err = database.Exec(createRouteStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating route_stops table:", err)
	}

	fmt.Println("database initialized successfully")
}

func QueryDatabase() {
	// Query routes count
	var routeCount int
	err := database.QueryRow("SELECT COUNT(*) FROM routes").Scan(&routeCount)
	if err != nil {
		log.Fatal("Error querying routes count:", err)
	}

	// Query stops count
	var stopCount int
	err = database.QueryRow("SELECT COUNT(*) FROM stops").Scan(&stopCount)
	if err != nil {
		log.Fatal("Error querying stops count:", err)
	}

	// Query route-stops count
	var routeStopCount int
	err = database.QueryRow("SELECT COUNT(*) FROM route_stops").Scan(&routeStopCount)
	if err != nil {
		log.Fatal("Error querying route-stops count:", err)
	}

	fmt.Printf("\n=== KMB Database Summary ===\n")
	fmt.Printf("Total routes in database: %d\n", routeCount)
	fmt.Printf("Total stops in database: %d\n", stopCount)
	fmt.Printf("Total route-stop relationships in database: %d\n\n", routeStopCount)

	// Query sample routes
	fmt.Println("=== Sample Routes ===")
	routeRows, err := database.Query(`
		SELECT company, route, direction, service_type, orig_tc, dest_tc 
		FROM routes 
		ORDER BY route, direction 
		LIMIT 5
	`)
	if err != nil {
		log.Fatal("Error querying routes:", err)
	}
	defer routeRows.Close()

	fmt.Printf("%-6s %-8s %-6s %-12s %-20s %-20s\n", "Company", "Route", "Direction", "Service Type", "Origin", "Destination")
	fmt.Println("--------------------------------------------------------------------------------")

	for routeRows.Next() {
		var company, route, direction, serviceType, origTc, destTc string
		err := routeRows.Scan(&company, &route, &direction, &serviceType, &origTc, &destTc)
		if err != nil {
			log.Fatal("Error scanning route row:", err)
		}
		fmt.Printf("%-6s %-8s %-6s %-12s %-20s %-20s\n", company, route, direction, serviceType, origTc, destTc)
	}

	if err = routeRows.Err(); err != nil {
		log.Fatal("Error iterating route rows:", err)
	}

	// Query sample stops
	fmt.Println("\n=== Sample Stops ===")
	stopRows, err := database.Query(`
		SELECT company, stop, name_tc, lat, long 
		FROM stops 
		ORDER BY name_tc 
		LIMIT 5
	`)
	if err != nil {
		log.Fatal("Error querying stops:", err)
	}
	defer stopRows.Close()

	fmt.Printf("%-20s %-20s %-30s %-12s %-12s\n", "Company", "Stop ID", "Name (TC)", "Latitude", "Longitude")
	fmt.Println("--------------------------------------------------------------------------------")

	for stopRows.Next() {
		var company, stop, nameTc, lat, long string
		err := stopRows.Scan(&company, &stop, &nameTc, &lat, &long)
		if err != nil {
			log.Fatal("Error scanning stop row:", err)
		}
		fmt.Printf("%-20s %-20s %-30s %-12s %-12s\n", company, stop, nameTc, lat, long)
	}

	if err = stopRows.Err(); err != nil {
		log.Fatal("Error iterating stop rows:", err)
	}

	// Query sample route-stops with stop names
	fmt.Println("\n=== Sample Route-Stop Relationships ===")
	routeStopRows, err := database.Query(`
		SELECT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, s.name_tc
		FROM route_stops rs
		JOIN stops s ON rs.stop = s.stop
		WHERE rs.route = '1' AND rs.direction = 'O'
		ORDER BY rs.seq
		LIMIT 10
	`)
	if err != nil {
		log.Fatal("Error querying route-stops:", err)
	}
	defer routeStopRows.Close()

	fmt.Printf("%-6s %-8s %-6s %-12s %-6s %-30s\n", "Company", "Route", "Direction", "Service Type", "Seq", "Stop Name")
	fmt.Println("--------------------------------------------------------------------------------")

	for routeStopRows.Next() {
		var company, route, direction, serviceType, seq, stopName string
		err := routeStopRows.Scan(&company, &route, &direction, &serviceType, &seq, &stopName)
		if err != nil {
			log.Fatal("Error scanning route-stop row:", err)
		}
		fmt.Printf("%-6s %-8s %-6s %-12s %-6s %-30s\n", company, route, direction, serviceType, seq, stopName)
	}

	if err = routeStopRows.Err(); err != nil {
		log.Fatal("Error iterating route-stop rows:", err)
	}

	// Close the KMB database connection
	database.Close()
}

func storeRoutes(routes []Route) error {

	tx, err := database.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO routes (company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc, data_timestamp)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	for _, route := range routes {
		_, err = stmt.Exec(
			route.Company,
			route.Route,
			route.Direction,
			route.ServiceType,
			route.OrigEn,
			route.OrigTc,
			route.OrigSc,
			route.DestEn,
			route.DestTc,
			route.DestSc,
			route.DataTimestamp,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting route %s: %v", route.Route, err)
		}
	}
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}
	return nil
}

func storeStops(stops []Stop) error {
	tx, err := database.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO stops (company, stop, name_en, name_tc, name_sc, lat, long, data_timestamp)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	for _, stop := range stops {
		_, err = stmt.Exec(
			stop.Company,
			stop.Stop,
			stop.NameEn,
			stop.NameTc,
			stop.NameSc,
			stop.Lat,
			stop.Long,
			stop.DataTimestamp,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting stop %s: %v", stop.Stop, err)
		}
	}
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}
	return nil
}

func storeRouteStops(routeStops []RouteStop) error {
	fmt.Printf("💾 Storing %d route stops\n", len(routeStops))
	tx, err := database.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO route_stops (company, route, direction, service_type, seq, stop, data_timestamp)
	VALUES (?, ?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	for _, rs := range routeStops {
		fmt.Printf("💾 RouteStop %s %s %s %s %s %s\n", rs.Company, rs.Route, rs.Direction, rs.Seq, rs.Stop, rs.ServiceType)
		_, err = stmt.Exec(
			rs.Company,
			rs.Route,
			rs.Direction,
			rs.ServiceType,
			rs.Seq,
			rs.Stop,
			rs.DataTimestamp,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting route-stop %s-%s-%s: %v", rs.Route, rs.Direction, rs.Seq, err)
		}
	}
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}
	return nil
}
