package main

import (
	"encoding/json"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func FetchKmbData() {
	// Initialize KMB SQLite database
	initKmbDatabase()
	// Note: Don't close the database here, it will be closed after QueryKmbDatabase

	// Fetch and store route data
	fmt.Println("=== Processing KMB Route Data ===")
	routes, err := fetchRouteData()
	if err != nil {
		log.Fatal("Error fetching route data:", err)
	}

	fmt.Printf("Fetched %d routes from API\n", len(routes))

	err = storeRoutes(routes)
	if err != nil {
		log.Fatal("Error storing routes:", err)
	}

	fmt.Println("Successfully stored all routes in SQLite database")

	// Fetch and store stop data
	fmt.Println("\n=== Processing KMB Stop Data ===")
	stops, err := fetchStopData()
	if err != nil {
		log.Fatal("Error fetching stop data:", err)
	}

	fmt.Printf("Fetched %d stops from API\n", len(stops))

	err = storeStops(stops)
	if err != nil {
		log.Fatal("Error storing stops:", err)
	}

	fmt.Println("Successfully stored all stops in SQLite database")

	// Fetch and store route-stop data
	fmt.Println("\n=== Processing KMB Route-Stop Data ===")
	routeStops, err := fetchRouteStopData()
	if err != nil {
		log.Fatal("Error fetching route-stop data:", err)
	}

	fmt.Printf("Fetched %d route-stop relationships from API\n", len(routeStops))

	err = storeRouteStops(routeStops)
	if err != nil {
		log.Fatal("Error storing route-stops:", err)
	}

	fmt.Println("Successfully stored all route-stop relationships in SQLite database")
}

func initKmbDatabase() {
	var err error
	// Create routes table
	createRoutesTableSQL := `
	CREATE TABLE IF NOT EXISTS kmb_routes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		route TEXT NOT NULL,
		bound TEXT NOT NULL,
		service_type TEXT NOT NULL,
		orig_en TEXT NOT NULL,
		orig_tc TEXT NOT NULL,
		orig_sc TEXT NOT NULL,
		dest_en TEXT NOT NULL,
		dest_tc TEXT NOT NULL,
		dest_sc TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = busDB.Exec(createRoutesTableSQL)
	if err != nil {
		log.Fatal("Error creating routes table:", err)
	}

	// Create stops table
	createStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS kmb_stops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		stop TEXT NOT NULL UNIQUE,
		name_en TEXT NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		lat TEXT NOT NULL,
		long TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = busDB.Exec(createStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating stops table:", err)
	}

	// Create route_stops table
	createRouteStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS kmb_route_stops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		route TEXT NOT NULL,
		bound TEXT NOT NULL,
		service_type TEXT NOT NULL,
		seq TEXT NOT NULL,
		stop TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route, bound, service_type, seq)
	);`

	_, err = busDB.Exec(createRouteStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating route_stops table:", err)
	}

	fmt.Println("KMB database initialized successfully")
}

func fetchRouteData() ([]KmbRoute, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/route/"

	apiResponse, err := fetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var routes []KmbRoute
	err = json.Unmarshal(apiResponse.Data, &routes)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling routes data: %v", err)
	}

	return routes, nil
}

func fetchStopData() ([]KmbStop, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/stop/"

	apiResponse, err := fetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var stops []KmbStop
	err = json.Unmarshal(apiResponse.Data, &stops)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling stops data: %v", err)
	}

	return stops, nil
}

func fetchRouteStopData() ([]KmbRouteStop, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/route-stop/"

	apiResponse, err := fetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var routeStops []KmbRouteStop
	err = json.Unmarshal(apiResponse.Data, &routeStops)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling route-stop data: %v", err)
	}

	return routeStops, nil
}

func storeRoutes(routes []KmbRoute) error {
	// Begin transaction
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}

	// Prepare insert statement
	insertSQL := `
	INSERT INTO kmb_routes (route, bound, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()

	// Insert each route
	for _, route := range routes {
		_, err = stmt.Exec(
			route.Route,
			route.Bound,
			route.ServiceType,
			route.OrigEn,
			route.OrigTc,
			route.OrigSc,
			route.DestEn,
			route.DestTc,
			route.DestSc,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting route %s: %v", route.Route, err)
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}

func storeStops(stops []KmbStop) error {
	// Begin transaction
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}

	// Prepare insert statement with ON CONFLICT REPLACE to handle duplicates
	insertSQL := `
	INSERT OR REPLACE INTO kmb_stops (stop, name_en, name_tc, name_sc, lat, long)
	VALUES (?, ?, ?, ?, ?, ?)`

	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()

	// Insert each stop
	for _, stop := range stops {
		_, err = stmt.Exec(
			stop.Stop,
			stop.NameEn,
			stop.NameTc,
			stop.NameSc,
			stop.Lat,
			stop.Long,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting stop %s: %v", stop.Stop, err)
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}

func storeRouteStops(routeStops []KmbRouteStop) error {
	// Begin transaction
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}

	// Prepare insert statement with ON CONFLICT REPLACE to handle duplicates
	insertSQL := `
	INSERT OR REPLACE INTO kmb_route_stops (route, bound, service_type, seq, stop)
	VALUES (?, ?, ?, ?, ?)`

	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()

	// Insert each route-stop relationship
	for _, routeStop := range routeStops {
		_, err = stmt.Exec(
			routeStop.Route,
			routeStop.Bound,
			routeStop.ServiceType,
			routeStop.Seq,
			routeStop.Stop,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting route-stop %s-%s-%s-%s: %v", routeStop.Route, routeStop.Bound, routeStop.ServiceType, routeStop.Seq, err)
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}

func QueryKmbDatabase() {
	// Query routes count
	var routeCount int
	err := busDB.QueryRow("SELECT COUNT(*) FROM kmb_routes").Scan(&routeCount)
	if err != nil {
		log.Fatal("Error querying routes count:", err)
	}

	// Query stops count
	var stopCount int
	err = busDB.QueryRow("SELECT COUNT(*) FROM kmb_stops").Scan(&stopCount)
	if err != nil {
		log.Fatal("Error querying stops count:", err)
	}

	// Query route-stops count
	var routeStopCount int
	err = busDB.QueryRow("SELECT COUNT(*) FROM kmb_route_stops").Scan(&routeStopCount)
	if err != nil {
		log.Fatal("Error querying route-stops count:", err)
	}

	fmt.Printf("\n=== KMB Database Summary ===\n")
	fmt.Printf("Total routes in database: %d\n", routeCount)
	fmt.Printf("Total stops in database: %d\n", stopCount)
	fmt.Printf("Total route-stop relationships in database: %d\n\n", routeStopCount)

	// Query sample routes
	fmt.Println("=== Sample KMB Routes ===")
	routeRows, err := busDB.Query(`
		SELECT route, bound, service_type, orig_tc, dest_tc 
		FROM kmb_routes 
		ORDER BY route, bound 
		LIMIT 5
	`)
	if err != nil {
		log.Fatal("Error querying routes:", err)
	}
	defer routeRows.Close()

	fmt.Printf("%-8s %-6s %-12s %-20s %-20s\n", "Route", "Bound", "Service Type", "Origin", "Destination")
	fmt.Println("--------------------------------------------------------------------------------")

	for routeRows.Next() {
		var route, bound, serviceType, origTc, destTc string
		err := routeRows.Scan(&route, &bound, &serviceType, &origTc, &destTc)
		if err != nil {
			log.Fatal("Error scanning route row:", err)
		}
		fmt.Printf("%-8s %-6s %-12s %-20s %-20s\n", route, bound, serviceType, origTc, destTc)
	}

	if err = routeRows.Err(); err != nil {
		log.Fatal("Error iterating route rows:", err)
	}

	// Query sample stops
	fmt.Println("\n=== Sample KMB Stops ===")
	stopRows, err := busDB.Query(`
		SELECT stop, name_tc, lat, long 
		FROM kmb_stops 
		ORDER BY name_tc 
		LIMIT 5
	`)
	if err != nil {
		log.Fatal("Error querying stops:", err)
	}
	defer stopRows.Close()

	fmt.Printf("%-20s %-30s %-12s %-12s\n", "Stop ID", "Name (TC)", "Latitude", "Longitude")
	fmt.Println("--------------------------------------------------------------------------------")

	for stopRows.Next() {
		var stop, nameTc, lat, long string
		err := stopRows.Scan(&stop, &nameTc, &lat, &long)
		if err != nil {
			log.Fatal("Error scanning stop row:", err)
		}
		fmt.Printf("%-20s %-30s %-12s %-12s\n", stop, nameTc, lat, long)
	}

	if err = stopRows.Err(); err != nil {
		log.Fatal("Error iterating stop rows:", err)
	}

	// Query sample route-stops with stop names
	fmt.Println("\n=== Sample KMB Route-Stop Relationships ===")
	routeStopRows, err := busDB.Query(`
		SELECT rs.route, rs.bound, rs.service_type, rs.seq, s.name_tc
		FROM kmb_route_stops rs
		JOIN kmb_stops s ON rs.stop = s.stop
		WHERE rs.route = '1' AND rs.bound = 'O'
		ORDER BY rs.seq
		LIMIT 10
	`)
	if err != nil {
		log.Fatal("Error querying route-stops:", err)
	}
	defer routeStopRows.Close()

	fmt.Printf("%-8s %-6s %-12s %-6s %-30s\n", "Route", "Bound", "Service Type", "Seq", "Stop Name")
	fmt.Println("--------------------------------------------------------------------------------")

	for routeStopRows.Next() {
		var route, bound, serviceType, seq, stopName string
		err := routeStopRows.Scan(&route, &bound, &serviceType, &seq, &stopName)
		if err != nil {
			log.Fatal("Error scanning route-stop row:", err)
		}
		fmt.Printf("%-8s %-6s %-12s %-6s %-30s\n", route, bound, serviceType, seq, stopName)
	}

	if err = routeStopRows.Err(); err != nil {
		log.Fatal("Error iterating route-stop rows:", err)
	}

	// Close the KMB database connection
	busDB.Close()
}
