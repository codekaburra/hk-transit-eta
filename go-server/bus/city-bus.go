package bus

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

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

	if err = cache.Save(busCacheDir+"/ctb_routes.json", routes); err != nil {
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

	if err = cache.Save(busCacheDir+"/ctb_route_stops.json", allRouteStops); err != nil {
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

	if err = storeStops(stops); err != nil {
		log.Printf("Warning: failed to store Citybus stops: %v", err)
	}
	fmt.Println("Successfully stored Citybus stops")

	// Export from the database, not from `stops`: a partial fetch would
	// otherwise overwrite the snapshot with fewer stops than it already had.
	if err = exportStopsSnapshot(DatabaseCompany_CityBus, busCacheDir+"/ctb_stops.json"); err != nil {
		log.Printf("Warning: could not save CTB stops cache: %v", err)
	}

	var ts string
	if len(routes) > 0 {
		ts = routes[0].DataTimestamp
	}
	if err := syncmeta.Record("ctb", ts); err != nil {
		log.Printf("Warning: could not record ctb sync: %v", err)
	}
}

// busCacheDir is relative to the working directory the server runs from.
// Tests point it at a temporary directory so a run does not write snapshot
// files into the package directory.
var busCacheDir = "data/bus"

func fetchCitybusRoutes() ([]Route, error) {
	var routes []Route
	var _routes []CitybusRoute

	apiURL := citybusAPIBase + "/route/ctb"
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

// Citybus exposes no bulk stop endpoint, so the whole stop list is fetched one
// request at a time. These are variables rather than constants so tests can
// point at a local server and drop the pacing.
var (
	citybusAPIBase       = "https://rt.data.gov.hk/v2/transport/citybus"
	citybusStopInterval  = 50 * time.Millisecond
	citybusRetryAttempts = 3
	citybusRetryDelay    = 2 * time.Second
)

// fetchCitybusStops looks up each stop's details individually.
//
// A failure on one stop must not abandon the rest: this previously returned on
// the first error, so a single timeout part-way through ~2,500 sequential
// requests left every later stop unfetched. Those stops then disappeared from
// route pages entirely, because the stop query inner-joins route_stops against
// stops. Failures are retried, then skipped and reported, so the caller can
// store what did come back and fill the gaps on the next run.
func fetchCitybusStops(stopIds []string) ([]Stop, error) {
	stopCount := len(stopIds)
	stops := make([]Stop, 0, stopCount)
	var failed []string

	for i, stopId := range stopIds {
		if i > 0 {
			time.Sleep(citybusStopInterval)
		}
		if i%100 == 0 {
			fmt.Printf("Citybus stop %d / %d\n", i+1, stopCount)
		}

		apiURL := citybusAPIBase + "/stop/" + stopId
		apiResponse, err := httpapi.FetchWithRetry(apiURL, citybusRetryAttempts, citybusRetryDelay)
		if err != nil {
			log.Printf("Warning: skipping Citybus stop %s: %v", stopId, err)
			failed = append(failed, stopId)
			continue
		}

		var _stop CitybusStop
		if err := json.Unmarshal(apiResponse.Data, &_stop); err != nil {
			log.Printf("Warning: skipping Citybus stop %s: unmarshal: %v", stopId, err)
			failed = append(failed, stopId)
			continue
		}
		// An unknown stop id yields an empty payload rather than an error.
		if _stop.Stop == "" {
			log.Printf("Warning: Citybus stop %s returned no data", stopId)
			failed = append(failed, stopId)
			continue
		}

		stops = append(stops, Stop{
			Company:       DatabaseCompany_CityBus,
			Stop:          _stop.Stop,
			NameEn:        _stop.NameEn,
			NameTc:        _stop.NameTc,
			NameSc:        _stop.NameSc,
			Lat:           _stop.Lat,
			Long:          _stop.Long,
			DataTimestamp: _stop.DataTimestamp,
		})
	}

	fmt.Printf("Fetched %d / %d Citybus stops\n", len(stops), stopCount)
	if len(failed) > 0 {
		return stops, fmt.Errorf("%d of %d Citybus stops could not be fetched", len(failed), stopCount)
	}
	return stops, nil
}

func fetchCitybusRouteStops(route string) ([]RouteStop, error) {
	apiURL := citybusAPIBase + "/route-stop/ctb/" + route
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
