package bus

import (
	"encoding/json"
	"fmt"
	"log"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/httpapi"
	"hk-transit-eta/internal/syncmeta"
)

const kmbCacheDir = "data/bus"

func FetchKmbData() {
	fmt.Println("=== Processing KMB Route Data ===")
	routes, err := fetchKmbRouteData()
	if err != nil {
		log.Printf("Error fetching KMB route data: %v", err)
		return
	}

	fmt.Printf("Fetched %d routes from API\n", len(routes))

	if err = cache.Save(kmbCacheDir+"/kmb_routes.json", routes); err != nil {
		log.Printf("Warning: could not save KMB routes cache: %v", err)
	}

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

	if err = cache.Save(kmbCacheDir+"/kmb_stops.json", stops); err != nil {
		log.Printf("Warning: could not save KMB stops cache: %v", err)
	}

	if err = storeStops(stops); err != nil {
		log.Printf("Error storing KMB stops: %v", err)
		return
	}

	fmt.Println("Successfully stored all KMB stops")

	fmt.Println("\n=== Processing KMB Route-Stop Data ===")
	routeStops, err := fetchKmbRouteStopData()
	if err != nil {
		log.Printf("Error fetching KMB route-stop data: %v", err)
		return
	}

	fmt.Printf("Fetched %d route-stop relationships from API\n", len(routeStops))

	if err = cache.Save(kmbCacheDir+"/kmb_route_stops.json", routeStops); err != nil {
		log.Printf("Warning: could not save KMB route-stops cache: %v", err)
	}

	if err = storeRouteStops(routeStops); err != nil {
		log.Printf("Error storing KMB route-stops: %v", err)
		return
	}

	fmt.Println("Successfully stored all KMB route-stop relationships")

	var ts string
	if len(routes) > 0 {
		ts = routes[0].DataTimestamp
	}
	if err := syncmeta.Record("kmb", ts); err != nil {
		log.Printf("Warning: could not record kmb sync: %v", err)
	}
}

func fetchKmbRouteData() ([]Route, error) {
	var routes []Route
	var _routes []KmbRoute
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/route/"

	apiResponse, err := httpapi.Fetch(apiURL)
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
		route.DataTimestamp = apiResponse.GeneratedTimestamp
		routes = append(routes, route)
	}
	return routes, nil
}

func fetchKmbStopData() ([]Stop, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/stop/"

	apiResponse, err := httpapi.Fetch(apiURL)
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
		stop.DataTimestamp = apiResponse.GeneratedTimestamp
		stops = append(stops, stop)
	}
	return stops, nil
}

func fetchKmbRouteStopData() ([]RouteStop, error) {
	apiURL := "https://data.etabus.gov.hk/v1/transport/kmb/route-stop/"

	apiResponse, err := httpapi.Fetch(apiURL)
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
		routeStop.DataTimestamp = apiResponse.GeneratedTimestamp
		routeStops = append(routeStops, routeStop)
	}
	return routeStops, nil
}
