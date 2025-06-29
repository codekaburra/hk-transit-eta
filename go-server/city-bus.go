package main

import (
	"encoding/json"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func FetchCitybusData() {
	initCitybusDatabase()

	fmt.Println("=== Processing Citybus Company Data ===")
	company, err := fetchCitybusCompanyData()
	if err != nil {
		log.Fatal("Error fetching Citybus company data:", err)
	}
	fmt.Printf("Fetched Citybus company data: %s (%s)\n", company.NameEn, company.NameTc)
	err = storeCitybusCompany(company)
	if err != nil {
		log.Fatal("Error storing Citybus company data:", err)
	}
	fmt.Println("Successfully stored Citybus company data in SQLite database")

	fmt.Println("\n=== Processing Citybus Route Data ===")
	routes, err := fetchCitybusRoutes()
	if err != nil {
		log.Fatal("Error fetching Citybus routes:", err)
	}
	fmt.Printf("Fetched %d Citybus routes from API\n", len(routes))
	err = storeCitybusRoutes(routes)
	if err != nil {
		log.Fatal("Error storing Citybus routes:", err)
	}
	fmt.Println("Successfully stored Citybus routes in SQLite database")

	fmt.Println("\n=== Processing Citybus Route-Stop Data ===")
	for i, route := range routes {
		fmt.Printf("🖍️ RouteStop %d / %d - %s\n", i, len(routes), route.Route)
		routeStops, err := fetchCitybusRouteStops(route.Route)
		if err != nil {
			log.Fatal("Error fetching Citybus route-stop data:", err)
		}
		fmt.Printf("Fetched %d Citybus route-stop relationships from API\n", len(routeStops))
		err = storeCitybusRouteStops(routeStops)
		if err != nil {
			log.Fatal("Error storing Citybus route-stop data:", err)
		}
	}

	// Get unique stops from route_stops table to fetch stop details
	routeStopsInDb, err := busDB.Query("SELECT DISTINCT stop FROM citybus_route_stops")
	if err != nil {
		log.Fatal("Error querying citybus_route_stops:", err)
	}
	defer routeStopsInDb.Close()

	var stopIds []string
	for routeStopsInDb.Next() {
		var stopId string
		err := routeStopsInDb.Scan(&stopId)
		if err != nil {
			log.Printf("Error fetching Citybus stop %s: %v", stopId, err)
			continue
		}
		stopIds = append(stopIds, stopId)
	}

	stops, _ := fetchCitybusStops(stopIds)
	fmt.Println("\n=== Processing Citybus Stop Data ===")
	err = storeCitybusStop(stops)
	fmt.Println("Successfully stored Citybus stops in SQLite database")

	// fmt.Println("Successfully stored Citybus route-stop relationships in SQLite database")

	queryCitybusDatabase()
}

func initCitybusDatabase() {
	var err error

	createCompanyTableSQL := `
	CREATE TABLE IF NOT EXISTS citybus_company (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		co TEXT NOT NULL UNIQUE,
		name_en TEXT NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		url TEXT NOT NULL,
		data_timestamp TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = busDB.Exec(createCompanyTableSQL)
	if err != nil {
		log.Fatal("Error creating citybus_company table:", err)
	}

	createRoutesTableSQL := `
	CREATE TABLE IF NOT EXISTS citybus_routes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		co TEXT NOT NULL,
		route TEXT NOT NULL,
		orig_en TEXT NOT NULL,
		orig_tc TEXT NOT NULL,
		orig_sc TEXT NOT NULL,
		dest_en TEXT NOT NULL,
		dest_tc TEXT NOT NULL,
		dest_sc TEXT NOT NULL,
		data_timestamp TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(co, route)
	);`
	_, err = busDB.Exec(createRoutesTableSQL)
	if err != nil {
		log.Fatal("Error creating citybus_routes table:", err)
	}

	createStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS citybus_stops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		stop TEXT NOT NULL UNIQUE,
		name_en TEXT NOT NULL,
		name_tc TEXT NOT NULL,
		name_sc TEXT NOT NULL,
		lat TEXT NOT NULL,
		long TEXT NOT NULL,
		data_timestamp TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = busDB.Exec(createStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating citybus_stops table:", err)
	}

	createRouteStopsTableSQL := `
	CREATE TABLE IF NOT EXISTS citybus_route_stops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		route TEXT NOT NULL,
		dir TEXT NOT NULL,
		seq TEXT NOT NULL,
		stop TEXT NOT NULL,
		data_timestamp TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(route, dir, seq)
	);`
	_, err = busDB.Exec(createRouteStopsTableSQL)
	if err != nil {
		log.Fatal("Error creating citybus_route_stops table:", err)
	}

	fmt.Println("Citybus database initialized successfully")
}

func fetchCitybusCompanyData() (*CitybusCompany, error) {
	apiURL := "https://rt.data.gov.hk/v2/transport/citybus/company/ctb"
	apiResponse, err := fetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var company CitybusCompany
	err = json.Unmarshal(apiResponse.Data, &company)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling company data: %v", err)
	}
	return &company, nil
}

func fetchCitybusRoutes() ([]CitybusRoute, error) {
	apiURL := "https://rt.data.gov.hk/v2/transport/citybus/route/ctb"
	apiResponse, err := fetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var routes []CitybusRoute
	err = json.Unmarshal(apiResponse.Data, &routes)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling routes data: %v", err)
	}
	return routes, nil
}

func fetchCitybusStops(stopIds []string) ([]CitybusStop, error) {
	stopCount := len(stopIds)
	var stops []CitybusStop
	for i, stopId := range stopIds {
		var stop CitybusStop
		fmt.Printf("🖍️ Stop %d / %d - %s\n", i+1, stopCount, stopId)
		apiURL := "https://rt.data.gov.hk/v2/transport/citybus/stop/" + stopId
		apiResponse, err := fetchAPI(apiURL)
		if err != nil {
			return stops, err
		}
		err = json.Unmarshal(apiResponse.Data, &stop)
		if err != nil {
			return stops, fmt.Errorf("error unmarshaling stops data: %v", err)
		}
		stops = append(stops, stop)
	}
	return stops, nil
}

func fetchCitybusRouteStops(route string) ([]CitybusRouteStop, error) {
	apiURL := "https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb/" + route
	var routeStops []CitybusRouteStop
	for _, dir := range []string{"inbound", "outbound"} {
		fmt.Printf("💬 Citybus RouteStop %s %s \n", route, dir)
		_apiURL := apiURL + "/" + dir
		var _routeStops []CitybusRouteStop
		apiResponse, err := fetchAPI(_apiURL)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(apiResponse.Data, &_routeStops)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling route-stop data %s : %v", _apiURL, err)
		}
		routeStops = append(routeStops, _routeStops...)
	}
	return routeStops, nil
}

func storeCitybusCompany(company *CitybusCompany) error {
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO citybus_company (co, name_en, name_tc, name_sc, url, data_timestamp)
	VALUES (?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(
		company.Co,
		company.NameEn,
		company.NameTc,
		company.NameSc,
		company.URL,
		company.DataTimestamp,
	)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error inserting company data: %v", err)
	}
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}
	return nil
}

func storeCitybusRoutes(routes []CitybusRoute) error {
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO citybus_routes (co, route, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc, data_timestamp)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	for _, route := range routes {
		_, err = stmt.Exec(
			route.Co,
			route.Route,
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

func storeCitybusStop(stops []CitybusStop) error {
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO citybus_stops (stop, name_en, name_tc, name_sc, lat, long, data_timestamp)
	VALUES (?, ?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	for _, stop := range stops {
		_, err = stmt.Exec(
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

func storeCitybusRouteStops(routeStops []CitybusRouteStop) error {
	tx, err := busDB.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}
	insertSQL := `
	INSERT OR REPLACE INTO citybus_route_stops (route, dir, seq, stop, data_timestamp)
	VALUES (?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()
	for _, rs := range routeStops {
		fmt.Printf("💾 Citybus RouteStop %s %s %d %s\n", rs.Route, rs.Dir, rs.Seq, rs.Stop)
		_, err = stmt.Exec(
			rs.Route,
			rs.Dir,
			rs.Seq,
			rs.Stop,
			rs.DataTimestamp,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting route-stop %s-%s-%s: %v", rs.Route, rs.Dir, rs.Seq, err)
		}
	}
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}
	return nil
}

func queryCitybusDatabase() {
	var companyCount, routeCount, stopCount, routeStopCount int
	err := busDB.QueryRow("SELECT COUNT(*) FROM citybus_company").Scan(&companyCount)
	if err != nil {
		log.Fatal("Error querying company count:", err)
	}
	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_routes").Scan(&routeCount)
	if err != nil {
		log.Fatal("Error querying route count:", err)
	}
	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_stops").Scan(&stopCount)
	if err != nil {
		log.Fatal("Error querying stop count:", err)
	}
	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_route_stops").Scan(&routeStopCount)
	if err != nil {
		log.Fatal("Error querying route-stop count:", err)
	}

	fmt.Printf("\n=== Citybus Database Summary ===\n")
	fmt.Printf("Total companies in database: %d\n", companyCount)
	fmt.Printf("Total routes in database: %d\n", routeCount)
	fmt.Printf("Total stops in database: %d\n", stopCount)
	fmt.Printf("Total route-stop relationships in database: %d\n\n", routeStopCount)

	fmt.Println("=== Citybus Company Information ===")
	rows, err := busDB.Query(`
		SELECT co, name_en, name_tc, name_sc, url, data_timestamp 
		FROM citybus_company 
		ORDER BY co
	`)
	if err != nil {
		log.Fatal("Error querying company data:", err)
	}
	defer rows.Close()
	fmt.Printf("%-6s %-20s %-20s %-20s %-40s %-25s\n", "Code", "Name (EN)", "Name (TC)", "Name (SC)", "URL", "Data Timestamp")
	fmt.Println("--------------------------------------------------------------------------------------------------------------------------------")
	for rows.Next() {
		var co, nameEn, nameTc, nameSc, url, dataTimestamp string
		err := rows.Scan(&co, &nameEn, &nameTc, &nameSc, &url, &dataTimestamp)
		if err != nil {
			log.Fatal("Error scanning company row:", err)
		}
		fmt.Printf("%-6s %-20s %-20s %-20s %-40s %-25s\n", co, nameEn, nameTc, nameSc, url, dataTimestamp)
	}
	if err = rows.Err(); err != nil {
		log.Fatal("Error iterating company rows:", err)
	}

	fmt.Println("\n=== Sample Citybus Routes ===")
	routeRows, err := busDB.Query(`
		SELECT route, orig_tc, dest_tc, orig_en, dest_en 
		FROM citybus_routes 
		ORDER BY route 
		LIMIT 5
	`)
	if err != nil {
		log.Fatal("Error querying routes:", err)
	}
	defer routeRows.Close()
	fmt.Printf("%-8s %-20s %-20s %-20s %-20s\n", "Route", "Origin (TC)", "Destination (TC)", "Origin (EN)", "Destination (EN)")
	fmt.Println("-----------------------------------------------------------------------------------------------------------")
	for routeRows.Next() {
		var route, origTc, destTc, origEn, destEn string
		err := routeRows.Scan(&route, &origTc, &destTc, &origEn, &destEn)
		if err != nil {
			log.Fatal("Error scanning route row:", err)
		}
		fmt.Printf("%-8s %-20s %-20s %-20s %-20s\n", route, origTc, destTc, origEn, destEn)
	}
	if err = routeRows.Err(); err != nil {
		log.Fatal("Error iterating route rows:", err)
	}

	fmt.Println("\n=== Sample Citybus Stops ===")
	stopRows, err := busDB.Query(`
		SELECT stop, name_tc, lat, long 
		FROM citybus_stops 
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

	fmt.Println("\n=== Sample Citybus Route-Stop Relationships ===")
	routeStopRows, err := busDB.Query(`
		SELECT rs.route, rs.dir, rs.seq, s.name_tc
		FROM citybus_route_stops rs
		JOIN citybus_stops s ON rs.stop = s.stop
		WHERE rs.route = '1' AND rs.dir = 'I'
		ORDER BY rs.seq
		LIMIT 10
	`)
	if err != nil {
		log.Fatal("Error querying route-stops:", err)
	}
	defer routeStopRows.Close()
	fmt.Printf("%-8s %-4s %-6s %-30s\n", "Route", "Dir", "Seq", "Stop Name")
	fmt.Println("--------------------------------------------------------------")
	for routeStopRows.Next() {
		var route, dir, seq, stopName string
		err := routeStopRows.Scan(&route, &dir, &seq, &stopName)
		if err != nil {
			log.Fatal("Error scanning route-stop row:", err)
		}
		fmt.Printf("%-8s %-4s %-6s %-30s\n", route, dir, seq, stopName)
	}
	if err = routeStopRows.Err(); err != nil {
		log.Fatal("Error iterating route-stop rows:", err)
	}
}
