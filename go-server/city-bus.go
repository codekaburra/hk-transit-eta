package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	_ "github.com/mattn/go-sqlite3"
)

func FetchCitybusData() {

	fmt.Println("Successfully stored Citybus company data in SQLite database")

	fmt.Println("\n=== Processing Citybus Route Data ===")
	routes, err := fetchCitybusRoutes()
	if err != nil {
		log.Fatal("Error fetching Citybus routes:", err)
	}
	fmt.Printf("Fetched %d Citybus routes from API\n", len(routes))
	err = storeRoutes(routes)
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
		err = storeRouteStops(routeStops)
		if err != nil {
			log.Fatal("Error storing Citybus route-stop data:", err)
		}
	}

	// Get unique stops from route_stops table to fetch stop details
	routeStopsInDb, err := busDB.Query("SELECT DISTINCT stop FROM route_stops where company = ?", DatabaseCompany_CityBus)
	if err != nil {
		log.Fatal("Error querying citybus route_stops:", err)
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
	err = storeStops(stops)
	fmt.Println("Successfully stored Citybus stops in SQLite database")

	fmt.Println("Successfully stored Citybus route-stop relationships in SQLite database")

}

func fetchCitybusRoutes() ([]Route, error) {
	var routes []Route
	var _routes []CitybusRoute

	apiURL := "https://rt.data.gov.hk/v2/transport/citybus/route/ctb"
	apiResponse, err := fetchAPI(apiURL)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(apiResponse.Data, &_routes)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling routes data: %v", err)
	}
	for _, r := range _routes {
		var route Route
		route.Company = DatabaseCompany_CityBus
		route.Route = r.Route
		route.Direction = ""
		route.ServiceType = ""
		route.OrigEn = r.OrigEn
		route.OrigTc = r.OrigTc
		route.OrigSc = r.OrigSc
		route.DestEn = r.DestEn
		route.DestTc = r.DestTc
		route.DestSc = r.DestSc
		route.DataTimestamp = r.DataTimestamp
		routes = append(routes, route)
	}
	return routes, nil
}

func fetchCitybusStops(stopIds []string) ([]Stop, error) {
	stopCount := len(stopIds)
	var stops []Stop
	for i, stopId := range stopIds {
		var _stop CitybusStop
		fmt.Printf("🖍️ Stop %d / %d - %s\n", i+1, stopCount, stopId)
		apiURL := "https://rt.data.gov.hk/v2/transport/citybus/stop/" + stopId
		apiResponse, err := fetchAPI(apiURL)
		if err != nil {
			return stops, err
		}
		err = json.Unmarshal(apiResponse.Data, &_stop)
		if err != nil {
			return stops, fmt.Errorf("error unmarshaling stops data: %v", err)
		}
		var stop Stop
		stop.Company = DatabaseCompany_CityBus
		stop.Stop = _stop.Stop
		stop.NameEn = _stop.NameEn
		stop.NameTc = _stop.NameTc
		stop.NameSc = _stop.NameSc
		stop.Lat = _stop.Lat
		stop.Long = _stop.Long
		stop.DataTimestamp = _stop.DataTimestamp
		stops = append(stops, stop)
	}
	return stops, nil
}

func fetchCitybusRouteStops(route string) ([]RouteStop, error) {
	apiURL := "https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb/" + route
	var routeStops []RouteStop
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
		for _, rs := range _routeStops {
			var routeStop RouteStop
			routeStop.Company = DatabaseCompany_CityBus
			routeStop.Route = rs.Route
			routeStop.Direction = rs.Dir
			routeStop.Seq = strconv.Itoa(rs.Seq)
			routeStop.Stop = rs.Stop
			routeStops = append(routeStops, routeStop)
		}
	}
	return routeStops, nil
}

// func queryCitybusDatabase() {
// 	var companyCount, routeCount, stopCount, routeStopCount int
// 	err := busDB.QueryRow("SELECT COUNT(*) FROM citybus_company").Scan(&companyCount)
// 	if err != nil {
// 		log.Fatal("Error querying company count:", err)
// 	}
// 	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_routes").Scan(&routeCount)
// 	if err != nil {
// 		log.Fatal("Error querying route count:", err)
// 	}
// 	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_stops").Scan(&stopCount)
// 	if err != nil {
// 		log.Fatal("Error querying stop count:", err)
// 	}
// 	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_route_stops").Scan(&routeStopCount)
// 	if err != nil {
// 		log.Fatal("Error querying route-stop count:", err)
// 	}

// 	fmt.Printf("\n=== Citybus Database Summary ===\n")
// 	fmt.Printf("Total companies in database: %d\n", companyCount)
// 	fmt.Printf("Total routes in database: %d\n", routeCount)
// 	fmt.Printf("Total stops in database: %d\n", stopCount)
// 	fmt.Printf("Total route-stop relationships in database: %d\n\n", routeStopCount)

// 	fmt.Println("=== Citybus Company Information ===")
// 	rows, err := busDB.Query(`
// 		SELECT co, name_en, name_tc, name_sc, url, data_timestamp
// 		FROM citybus_company
// 		ORDER BY co
// 	`)
// 	if err != nil {
// 		log.Fatal("Error querying company data:", err)
// 	}
// 	defer rows.Close()
// 	fmt.Printf("%-6s %-20s %-20s %-20s %-40s %-25s\n", "Code", "Name (EN)", "Name (TC)", "Name (SC)", "URL", "Data Timestamp")
// 	fmt.Println("--------------------------------------------------------------------------------------------------------------------------------")
// 	for rows.Next() {
// 		var co, nameEn, nameTc, nameSc, url, dataTimestamp string
// 		err := rows.Scan(&co, &nameEn, &nameTc, &nameSc, &url, &dataTimestamp)
// 		if err != nil {
// 			log.Fatal("Error scanning company row:", err)
// 		}
// 		fmt.Printf("%-6s %-20s %-20s %-20s %-40s %-25s\n", co, nameEn, nameTc, nameSc, url, dataTimestamp)
// 	}
// 	if err = rows.Err(); err != nil {
// 		log.Fatal("Error iterating company rows:", err)
// 	}

// 	fmt.Println("\n=== Sample Citybus Routes ===")
// 	routeRows, err := busDB.Query(`
// 		SELECT route, orig_tc, dest_tc, orig_en, dest_en
// 		FROM citybus_routes
// 		ORDER BY route
// 		LIMIT 5
// 	`)
// 	if err != nil {
// 		log.Fatal("Error querying routes:", err)
// 	}
// 	defer routeRows.Close()
// 	fmt.Printf("%-8s %-20s %-20s %-20s %-20s\n", "Route", "Origin (TC)", "Destination (TC)", "Origin (EN)", "Destination (EN)")
// 	fmt.Println("-----------------------------------------------------------------------------------------------------------")
// 	for routeRows.Next() {
// 		var route, origTc, destTc, origEn, destEn string
// 		err := routeRows.Scan(&route, &origTc, &destTc, &origEn, &destEn)
// 		if err != nil {
// 			log.Fatal("Error scanning route row:", err)
// 		}
// 		fmt.Printf("%-8s %-20s %-20s %-20s %-20s\n", route, origTc, destTc, origEn, destEn)
// 	}
// 	if err = routeRows.Err(); err != nil {
// 		log.Fatal("Error iterating route rows:", err)
// 	}

// 	fmt.Println("\n=== Sample Citybus Stops ===")
// 	stopRows, err := busDB.Query(`
// 		SELECT stop, name_tc, lat, long
// 		FROM citybus_stops
// 		ORDER BY name_tc
// 		LIMIT 5
// 	`)
// 	if err != nil {
// 		log.Fatal("Error querying stops:", err)
// 	}
// 	defer stopRows.Close()
// 	fmt.Printf("%-20s %-30s %-12s %-12s\n", "Stop ID", "Name (TC)", "Latitude", "Longitude")
// 	fmt.Println("--------------------------------------------------------------------------------")
// 	for stopRows.Next() {
// 		var stop, nameTc, lat, long string
// 		err := stopRows.Scan(&stop, &nameTc, &lat, &long)
// 		if err != nil {
// 			log.Fatal("Error scanning stop row:", err)
// 		}
// 		fmt.Printf("%-20s %-30s %-12s %-12s\n", stop, nameTc, lat, long)
// 	}
// 	if err = stopRows.Err(); err != nil {
// 		log.Fatal("Error iterating stop rows:", err)
// 	}

// 	fmt.Println("\n=== Sample Citybus Route-Stop Relationships ===")
// 	routeStopRows, err := busDB.Query(`
// 		SELECT rs.route, rs.dir, rs.seq, s.name_tc
// 		FROM citybus_route_stops rs
// 		JOIN citybus_stops s ON rs.stop = s.stop
// 		WHERE rs.route = '1' AND rs.dir = 'I'
// 		ORDER BY rs.seq
// 		LIMIT 10
// 	`)
// 	if err != nil {
// 		log.Fatal("Error querying route-stops:", err)
// 	}
// 	defer routeStopRows.Close()
// 	fmt.Printf("%-8s %-4s %-6s %-30s\n", "Route", "Dir", "Seq", "Stop Name")
// 	fmt.Println("--------------------------------------------------------------")
// 	for routeStopRows.Next() {
// 		var route, dir, seq, stopName string
// 		err := routeStopRows.Scan(&route, &dir, &seq, &stopName)
// 		if err != nil {
// 			log.Fatal("Error scanning route-stop row:", err)
// 		}
// 		fmt.Printf("%-8s %-4s %-6s %-30s\n", route, dir, seq, stopName)
// 	}
// 	if err = routeStopRows.Err(); err != nil {
// 		log.Fatal("Error iterating route-stop rows:", err)
// 	}
// }
