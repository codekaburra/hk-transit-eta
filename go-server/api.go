package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func getRoutes(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc FROM routes LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []Route
	for rows.Next() {
		var route Route
		err := rows.Scan(&route.Company, &route.Route, &route.Direction, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
		if err != nil {
			continue
		}
		routes = append(routes, route)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

func getStops(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT company, stop, name_en, name_tc, name_sc, lat, long FROM stops LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []Stop
	for rows.Next() {
		var stop Stop
		err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			continue
		}
		stops = append(stops, stop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stops)
}

func getRouteStops(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT company, route, bound, service_type, seq, stop FROM route_stops LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStops []RouteStop
	for rows.Next() {
		var routeStop RouteStop
		err := rows.Scan(&routeStop.Company, &routeStop.Route, &routeStop.Direction, &routeStop.ServiceType, &routeStop.Seq, &routeStop.Stop)
		if err != nil {
			continue
		}
		routeStops = append(routeStops, routeStop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routeStops)
}

// Search API Handlers
func searchRoutes(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// Search in both KMB and Citybus routes
	var allRoutes []Route

	// Search KMB routes
	rows, err := busDB.Query(`
		SELECT company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc 
		FROM routes 
		WHERE route LIKE ? OR orig_en LIKE ? OR dest_en LIKE ? OR orig_tc LIKE ? OR dest_tc LIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var route Route
			err := rows.Scan(&route.Company, &route.Route, &route.Direction, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
			if err == nil {
				allRoutes = append(allRoutes, route)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allRoutes)
}

func searchStops(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// Search in both KMB and Citybus stops
	var allStops []Stop

	// Search KMB stops
	rows, err := busDB.Query(`
		SELECT company, stop, name_en, name_tc, name_sc, lat, long 
		FROM stops 
		WHERE stop LIKE ? OR name_en LIKE ? OR name_tc LIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var stop Stop
			err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
			if err == nil {
				allStops = append(allStops, stop)
			}
		}
	}

	// // Search Citybus stops
	// rows, err = busDB.Query(`
	// 	SELECT stop, name_en, name_tc, name_sc, lat, long
	// 	FROM citybus_stops
	// 	WHERE stop LIKE ? OR name_en LIKE ? OR name_tc LIKE ?
	// 	LIMIT 50
	// `, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	// if err == nil {
	// 	defer rows.Close()
	// 	for rows.Next() {
	// 		var stop KmbStop
	// 		err := rows.Scan(&stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
	// 		if err == nil {
	// 			allStops = append(allStops, stop)
	// 		}
	// 	}
	// }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allStops)
}

// getStopsByRouteId returns all stops for a specific route
func getStopsByRouteId(w http.ResponseWriter, r *http.Request) {
	routeId := r.URL.Query().Get("routeId")
	direction := r.URL.Query().Get("direction")
	if routeId == "" {
		http.Error(w, "Query parameter 'routeId' is required", http.StatusBadRequest)
		return
	}
	if direction == "" {
		http.Error(w, "Query parameter 'direction' is required", http.StatusBadRequest)
		return
	}

	// Get stops for the specified route with stop details
	rows, err := busDB.Query(`
		SELECT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, rs.stop,
		       s.name_en, s.name_tc, s.name_sc, s.lat, s.long
		FROM route_stops rs
		JOIN stops s ON rs.stop = s.stop AND rs.company = s.company
		WHERE rs.route = ?
		AND rs.direction = ?
		ORDER BY rs.seq
	`, routeId, direction)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStopsWithDetails []map[string]interface{}
	for rows.Next() {
		var company, route, direction, serviceType, seq, stop, nameEn, nameTc, nameSc, lat, long string
		err := rows.Scan(&company, &route, &direction, &serviceType, &seq, &stop, &nameEn, &nameTc, &nameSc, &lat, &long)
		if err != nil {
			continue
		}

		routeStop := map[string]interface{}{
			"company":      company,
			"route":        route,
			"direction":    direction,
			"service_type": serviceType,
			"seq":          seq,
			"stop":         stop,
			"name_en":      nameEn,
			"name_tc":      nameTc,
			"name_sc":      nameSc,
			"lat":          lat,
			"long":         long,
		}
		routeStopsWithDetails = append(routeStopsWithDetails, routeStop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routeStopsWithDetails)
}

// getRoutesByStopId returns all routes that pass through a specific stop
func getRoutesByStopId(w http.ResponseWriter, r *http.Request) {
	stopId := r.URL.Query().Get("stopId")
	if stopId == "" {
		http.Error(w, "Query parameter 'stopId' is required", http.StatusBadRequest)
		return
	}
	// Get routes for the specified stop with route details
	rows, err := busDB.Query(`
		select r.id, r.company, r.route, r.service_type, 
		r.orig_en, r.orig_tc, r.orig_sc, 
		r.dest_en, r.dest_tc, r.dest_sc 
		from routes r where route in 
		(select route from route_stops where stop=?)
	`, stopId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routesWithDetails []Route
	for rows.Next() {
		var id, company, route, serviceType, origEn, origTc, origSc, destEn, destTc, destSc string
		err := rows.Scan(&id, &company, &route, &serviceType, &origEn, &origTc, &origSc, &destEn, &destTc, &destSc)
		if err != nil {
			continue
		}

		routeWithDetails := Route{
			Id:          id,
			Company:     company,
			Route:       route,
			ServiceType: serviceType,
			OrigEn:      origEn,
			OrigTc:      origTc,
			OrigSc:      origSc,
			DestEn:      destEn,
			DestTc:      destTc,
			DestSc:      destSc,
		}

		routesWithDetails = append(routesWithDetails, routeWithDetails)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routesWithDetails)
}

// getStopsNearby returns stops within ±0.001 latitude and ±0.001 longitude from a given stop
func getStopsNearby(w http.ResponseWriter, r *http.Request) {
	stopId := r.URL.Query().Get("stopId")
	if stopId == "" {
		http.Error(w, "Query parameter 'stopId' is required", http.StatusBadRequest)
		return
	}

	// First get the latitude and longitude of the given stop
	var targetLat, targetLong string
	err := busDB.QueryRow("SELECT lat, long FROM stops WHERE stop = ?", stopId).Scan(&targetLat, &targetLong)
	if err != nil {
		http.Error(w, "Stop not found", http.StatusNotFound)
		return
	}

	// Convert latitude and longitude to float for comparison
	var latFloat, longFloat float64
	_, err = fmt.Sscanf(targetLat, "%f", &latFloat)
	if err != nil {
		http.Error(w, "Invalid latitude format", http.StatusInternalServerError)
		return
	}
	_, err = fmt.Sscanf(targetLong, "%f", &longFloat)
	if err != nil {
		http.Error(w, "Invalid longitude format", http.StatusInternalServerError)
		return
	}

	// Find stops within ±0.001 latitude AND ±0.001 longitude range
	rows, err := busDB.Query(`
		SELECT company, stop, name_en, name_tc, name_sc, lat, long
		FROM stops
		WHERE CAST(lat AS REAL) BETWEEN ? AND ?
		AND CAST(long AS REAL) BETWEEN ? AND ?
		ORDER BY ABS(CAST(lat AS REAL) - ?) + ABS(CAST(long AS REAL) - ?), stop
	`, latFloat-0.001, latFloat+0.001, longFloat-0.001, longFloat+0.001, latFloat, longFloat)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var nearbyStops []Stop
	for rows.Next() {
		var stop Stop
		err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			continue
		}
		nearbyStops = append(nearbyStops, stop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(nearbyStops)
}

// getStopByStopId returns the stop details for a specific stopId
func getStopByStopId(w http.ResponseWriter, r *http.Request) {
	stopId := r.URL.Query().Get("stopId")
	if stopId == "" {
		http.Error(w, "Query parameter 'stopId' is required", http.StatusBadRequest)
		return
	}

	row := busDB.QueryRow(`
		SELECT id, company, stop, name_en, name_tc, name_sc, lat, long, data_timestamp
		FROM stops
		WHERE stop = ?
	`, stopId)

	var stop Stop
	err := row.Scan(&stop.Id, &stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long, &stop.DataTimestamp)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			http.Error(w, "Stop not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stop)
}
