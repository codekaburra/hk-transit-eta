package bus

import (
	"encoding/json"
	"fmt"
	"log"
)

func FetchKmbData() {
	// Initialize KMB SQLite database
	// Note: Don't close the database here, it will be closed after QueryKmbDatabase

	// Fetch and store route data
	fmt.Println("=== Processing KMB Route Data ===")
	routes, err := fetchKmbRouteData()
	if err != nil {
		log.Printf("Error fetching KMB route data: %v", err)
		return
	}

	fmt.Printf("Fetched %d routes from API\n", len(routes))

	if err = storeRoutes(routes); err != nil {
		log.Printf("Error storing KMB routes: %v", err)
		return
	}

	fmt.Println("Successfully stored all KMB routes")

	// Fetch and store stop data
	fmt.Println("\n=== Processing KMB Stop Data ===")
	stops, err := fetchKmbStopData()
	if err != nil {
		log.Printf("Error fetching KMB stop data: %v", err)
		return
	}

	fmt.Printf("Fetched %d stops from API\n", len(stops))

	if err = storeStops(stops); err != nil {
		log.Printf("Error storing KMB stops: %v", err)
		return
	}

	fmt.Println("Successfully stored all KMB stops")

	// Fetch and store route-stop data
	fmt.Println("\n=== Processing KMB Route-Stop Data ===")
	routeStops, err := fetchKmbRouteStopData()
	if err != nil {
		log.Printf("Error fetching KMB route-stop data: %v", err)
		return
	}

	fmt.Printf("Fetched %d route-stop relationships from API\n", len(routeStops))

	if err = storeRouteStops(routeStops); err != nil {
		log.Printf("Error storing KMB route-stops: %v", err)
		return
	}

	fmt.Println("Successfully stored all KMB route-stop relationships")
}

func fetchKmbRouteData() ([]Route, error) {
	var routes []Route
	var _routes []KmbRoute
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/route/"

	apiResponse, err := FetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(apiResponse.Data, &_routes)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling routes data: %v", err)
	}

	for _, r := range _routes {
		var route Route
		route.Company = DatabaseCompany_KowloonBus
		route.Route = r.Route
		route.Direction = r.Bound
		route.ServiceType = r.ServiceType
		route.OrigEn = r.OrigEn
		route.OrigTc = r.OrigTc
		route.OrigSc = r.OrigSc
		route.DestEn = r.DestEn
		route.DestTc = r.DestTc
		route.DestSc = r.DestSc
		route.DataTimestamp = ""
		routes = append(routes, route)
	}
	return routes, nil
}

func fetchKmbStopData() ([]Stop, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/stop/"

	apiResponse, err := FetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var stops []Stop
	var _stops []KmbStop
	err = json.Unmarshal(apiResponse.Data, &_stops)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling stops data: %v", err)
	}
	for _, _stop := range _stops {
		var stop Stop
		stop.Company = DatabaseCompany_KowloonBus
		stop.Stop = _stop.Stop
		stop.NameEn = _stop.NameEn
		stop.NameTc = _stop.NameTc
		stop.NameSc = _stop.NameSc
		stop.Lat = _stop.Lat
		stop.Long = _stop.Long
		stop.DataTimestamp = ""
		stops = append(stops, stop)
	}
	return stops, nil
}

func fetchKmbRouteStopData() ([]RouteStop, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/route-stop/"

	apiResponse, err := FetchAPI(apiURL)
	if err != nil {
		return nil, err
	}
	var routeStops []RouteStop
	var _routeStops []KmbRouteStop
	err = json.Unmarshal(apiResponse.Data, &_routeStops)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling route-stop data: %v", err)
	}

	for _, _routeStop := range _routeStops {
		var routeStop RouteStop
		routeStop.Company = DatabaseCompany_KowloonBus
		routeStop.Route = _routeStop.Route
		routeStop.Direction = _routeStop.Bound
		routeStop.Seq = _routeStop.Seq
		routeStop.Stop = _routeStop.Stop
		routeStop.ServiceType = _routeStop.ServiceType
		routeStops = append(routeStops, routeStop)
	}
	return routeStops, nil
}

// func storeKmbRoutes(routes []Route) error {
// 	// Begin transaction
// 	tx, err := database.Begin()
// 	if err != nil {
// 		return fmt.Errorf("error beginning transaction: %v", err)
// 	}

// 	// Prepare insert statement
// 	insertSQL := `
// 	INSERT INTO routes (company, route, bound, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc)
// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

// 	stmt, err := tx.Prepare(insertSQL)
// 	if err != nil {
// 		tx.Rollback()
// 		return fmt.Errorf("error preparing statement: %v", err)
// 	}
// 	defer stmt.Close()

// 	// Insert each route
// 	for _, route := range routes {
// 		_, err = stmt.Exec(
// 			DatabaseCompany_KowloonBus,
// 			route.Route,
// 			route.Bound,
// 			route.ServiceType,
// 			route.OrigEn,
// 			route.OrigTc,
// 			route.OrigSc,
// 			route.DestEn,
// 			route.DestTc,
// 			route.DestSc,
// 		)
// 		if err != nil {
// 			tx.Rollback()
// 			return fmt.Errorf("error inserting route %s: %v", route.Route, err)
// 		}
// 	}

// 	// Commit transaction
// 	err = tx.Commit()
// 	if err != nil {
// 		return fmt.Errorf("error committing transaction: %v", err)
// 	}

// 	return nil
// }

// func storeKmbStops(stops []Stop) error {
// 	// Begin transaction
// 	tx, err := database.Begin()
// 	if err != nil {
// 		return fmt.Errorf("error beginning transaction: %v", err)
// 	}

// 	// Prepare insert statement with ON CONFLICT REPLACE to handle duplicates
// 	insertSQL := `
// 	INSERT OR REPLACE INTO stops (company, stop, name_en, name_tc, name_sc, lat, long)
// 	VALUES (?, ?, ?, ?, ?, ?)`

// 	stmt, err := tx.Prepare(insertSQL)
// 	if err != nil {
// 		tx.Rollback()
// 		return fmt.Errorf("error preparing statement: %v", err)
// 	}
// 	defer stmt.Close()

// 	// Insert each stop
// 	for _, stop := range stops {
// 		_, err = stmt.Exec(
// 			DatabaseCompany_KowloonBus,
// 			stop.Stop,
// 			stop.NameEn,
// 			stop.NameTc,
// 			stop.NameSc,
// 			stop.Lat,
// 			stop.Long,
// 		)
// 		if err != nil {
// 			tx.Rollback()
// 			return fmt.Errorf("error inserting stop %s: %v", stop.Stop, err)
// 		}
// 	}

// 	// Commit transaction
// 	err = tx.Commit()
// 	if err != nil {
// 		return fmt.Errorf("error committing transaction: %v", err)
// 	}

// 	return nil
// }

// func storeKmbRouteStops(routeStops []RouteStop) error {
// 	// Begin transaction
// 	tx, err := database.Begin()
// 	if err != nil {
// 		return fmt.Errorf("error beginning transaction: %v", err)
// 	}

// 	// Prepare insert statement with ON CONFLICT REPLACE to handle duplicates
// 	insertSQL := `
// 	INSERT OR REPLACE INTO route_stops (company, route, direction, service_type, seq, stop)
// 	VALUES (?, ?, ?, ?, ?)`

// 	stmt, err := tx.Prepare(insertSQL)
// 	if err != nil {
// 		tx.Rollback()
// 		return fmt.Errorf("error preparing statement: %v", err)
// 	}
// 	defer stmt.Close()

// 	// Insert each route-stop relationship
// 	for _, routeStop := range routeStops {
// 		_, err = stmt.Exec(
// 			DatabaseCompany_KowloonBus,
// 			routeStop.Route,
// 			routeStop.Bound,
// 			routeStop.ServiceType,
// 			routeStop.Seq,
// 			routeStop.Stop,
// 		)
// 		if err != nil {
// 			tx.Rollback()
// 			return fmt.Errorf("error inserting route-stop %s-%s-%s-%s: %v", routeStop.Route, routeStop.Bound, routeStop.ServiceType, routeStop.Seq, err)
// 		}
// 	}

// 	// Commit transaction
// 	err = tx.Commit()
// 	if err != nil {
// 		return fmt.Errorf("error committing transaction: %v", err)
// 	}

// 	return nil
// }
