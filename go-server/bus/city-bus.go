package bus

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/httpapi"
	"hk-transit-eta/internal/syncmeta"
)

func FetchCitybusData() {
	fmt.Println("\n=== Processing Citybus Route Data ===")
	routes, err := fetchCitybusRoutes()
	if err != nil {
		log.Printf("Error fetching Citybus routes: %v", err)
		return
	}
	fmt.Printf("Fetched %d Citybus routes from API\n", len(routes))

	if err = cache.Save(ctbCacheDir+"/ctb_routes.json", routes); err != nil {
		log.Printf("Warning: could not save CTB routes cache: %v", err)
	}

	if err = storeRoutes(routes); err != nil {
		log.Printf("Error storing Citybus routes: %v", err)
		return
	}
	fmt.Println("Successfully stored Citybus routes")

	fmt.Println("\n=== Processing Citybus Route-Stop Data ===")
	var allRouteStops []RouteStop
	for i, route := range routes {
		fmt.Printf("🖍️ RouteStop %d / %d - %s\n", i+1, len(routes), route.Route)
		routeStops, err := fetchCitybusRouteStops(route.Route)
		if err != nil {
			log.Printf("Warning: skipping route-stops for Citybus route %s: %v", route.Route, err)
			continue
		}
		fmt.Printf("Fetched %d Citybus route-stop relationships from API\n", len(routeStops))
		allRouteStops = append(allRouteStops, routeStops...)
		if err = storeRouteStops(routeStops); err != nil {
			log.Printf("Warning: failed to store route-stops for Citybus route %s: %v", route.Route, err)
		}
	}

	if err = cache.Save(ctbCacheDir+"/ctb_route_stops.json", allRouteStops); err != nil {
		log.Printf("Warning: could not save CTB route-stops cache: %v", err)
	}

	// Get unique stops from route_stops table to fetch stop details
	routeStopsInDb, err := database.Query("SELECT DISTINCT stop FROM route_stops WHERE company = $1", DatabaseCompany_CityBus)
	if err != nil {
		log.Printf("Error querying citybus route_stops: %v", err)
		return
	}
	defer routeStopsInDb.Close()

	var stopIds []string
	for routeStopsInDb.Next() {
		var stopId string
		if err := routeStopsInDb.Scan(&stopId); err != nil {
			log.Printf("Error scanning Citybus stop ID: %v", err)
			continue
		}
		stopIds = append(stopIds, stopId)
	}

	fmt.Println("\n=== Processing Citybus Stop Data ===")
	stops, err := fetchCitybusStops(stopIds)
	if err != nil {
		// Keep whatever was fetched before the failure; store partial results.
		log.Printf("Warning: Citybus stop fetch incomplete (%d fetched): %v", len(stops), err)
	}

	if err = cache.Save(ctbCacheDir+"/ctb_stops.json", stops); err != nil {
		log.Printf("Warning: could not save CTB stops cache: %v", err)
	}

	if err = storeStops(stops); err != nil {
		log.Printf("Warning: failed to store Citybus stops: %v", err)
	}
	fmt.Println("Successfully stored Citybus stops")

	var ts string
	if len(routes) > 0 {
		ts = routes[0].DataTimestamp
	}
	if err := syncmeta.Record("ctb", ts); err != nil {
		log.Printf("Warning: could not record ctb sync: %v", err)
	}
}

const ctbCacheDir = "data/bus"

func fetchCitybusRoutes() ([]Route, error) {
	var routes []Route
	var _routes []CitybusRoute

	apiURL := "https://rt.data.gov.hk/v2/transport/citybus/route/ctb"
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
		apiResponse, err := httpapi.Fetch(apiURL)
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
		apiResponse, err := httpapi.Fetch(_apiURL)
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
			routeStop.DataTimestamp = rs.DataTimestamp
			routeStops = append(routeStops, routeStop)
		}
	}
	return routeStops, nil
}
