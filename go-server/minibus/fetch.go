package minibus

import (
	"encoding/json"
	"fmt"
	"log"
)

func FetchMinibusRoutes() {
	fmt.Println("=== Processing Minibus Route Data ===")

	regions := []string{MinibusRegionHKI, MinibusRegionKLN, MinibusRegionNT}

	for _, region := range regions {
		fmt.Printf("Fetching routes for region: %s\n", region)
		err := fetchMinibusRoutesByRegion(region)
		if err != nil {
			log.Printf("Error fetching minibus routes for region %s: %v", region, err)
			continue
		}
		fmt.Printf("Successfully processed routes for region: %s\n", region)
	}

	fmt.Println("=== Minibus Route Data Processing Complete ===")

	// After all routes are processed, fetch stop coordinates
	err := FetchAndStoreStopCoordinates()
	if err != nil {
		log.Printf("Error fetching stop coordinates: %v", err)
	}
}

func fetchMinibusRoutesByRegion(region string) error {
	// Step 1: Get route codes for the region
	apiURL := fmt.Sprintf("https://data.etagmb.gov.hk/route/%s", region)

	response, err := fetchAPI(apiURL)
	if err != nil {
		return fmt.Errorf("error fetching minibus route codes for region %s: %v", region, err)
	}

	var apiData MinibusRegionalAPIResponse
	err = json.Unmarshal(response.Data, &apiData)
	if err != nil {
		return fmt.Errorf("error unmarshaling minibus route codes for region %s: %v", region, err)
	}

	fmt.Printf("Found %d minibus route codes for region %s\n", len(apiData.Routes), region)

	// Step 2: Fetch detailed information for each route
	var detailedRoutes []MinibusRoute

	for _, routeCode := range apiData.Routes {
		fmt.Printf("Fetching detailed info for route %s in region %s\n", routeCode, region)

		routeDetail, err := fetchRouteDetail(region, routeCode)
		if err != nil {
			log.Printf("Error fetching route detail for %s/%s: %v", region, routeCode, err)
			continue
		}

		// Add region information to each route
		for i := range routeDetail {
			routeDetail[i].Region = region
			routeDetail[i].RouteCode = routeCode
		}

		detailedRoutes = append(detailedRoutes, routeDetail...)
	}

	fmt.Printf("Successfully fetched detailed info for %d routes in region %s\n", len(detailedRoutes), region)

	if err = saveCache(minbusCacheDir+"/gmb_routes_"+region+".json", detailedRoutes); err != nil {
		log.Printf("Warning: could not save GMB routes cache for %s: %v", region, err)
	}

	err = storeMinibusRoutes(detailedRoutes, region)
	if err != nil {
		return fmt.Errorf("error storing minibus routes for region %s: %v", region, err)
	}

	return nil
}

func fetchRouteDetail(region, routeCode string) ([]MinibusRoute, error) {
	apiURL := fmt.Sprintf("https://data.etagmb.gov.hk/route/%s/%s", region, routeCode)

	response, err := fetchAPI(apiURL)
	if err != nil {
		return nil, fmt.Errorf("error fetching route detail: %v", err)
	}

	var routes []MinibusRoute
	err = json.Unmarshal(response.Data, &routes)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling route detail: %v", err)
	}

	return routes, nil
}

func fetchRouteStops(routeID, routeSeq int) (*MinibusRouteStopResponse, error) {
	apiURL := fmt.Sprintf("https://data.etagmb.gov.hk/route-stop/%d/%d", routeID, routeSeq)

	response, err := fetchAPI(apiURL)
	if err != nil {
		return nil, fmt.Errorf("error fetching route stops: %v", err)
	}

	var routeStops MinibusRouteStopResponse
	err = json.Unmarshal(response.Data, &routeStops)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling route stops: %v", err)
	}

	return &routeStops, nil
}
