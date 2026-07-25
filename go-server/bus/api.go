package bus

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func GetRoutes(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRoutes - Query: %s\n", r.URL.RawQuery)
	sql := "SELECT company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc FROM routes LIMIT 100"
	rows, err := database.Query(sql)
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

func GetStops(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetStops - Query: %s\n", r.URL.RawQuery)
	sql := "SELECT company, stop, name_en, name_tc, name_sc, lat, long FROM stops LIMIT 100"
	rows, err := database.Query(sql)
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

func GetRouteStops(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRouteStops - Query: %s\n", r.URL.RawQuery)
	sql := "SELECT company, route, direction, service_type, seq, stop FROM route_stops LIMIT 100"
	rows, err := database.Query(sql)
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

func SearchRoutes(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	fmt.Printf("SearchRoutes - Query: %s\n", query)
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	like := "%" + query + "%"
	sql := `SELECT company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc
		FROM routes
		WHERE route ILIKE $1 OR orig_en ILIKE $2 OR dest_en ILIKE $3 OR orig_tc ILIKE $4 OR dest_tc ILIKE $5
		LIMIT 50`
	rows, err := database.Query(sql, like, like, like, like, like)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allRoutes []Route
	for rows.Next() {
		var route Route
		err := rows.Scan(&route.Company, &route.Route, &route.Direction, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
		if err == nil {
			allRoutes = append(allRoutes, route)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allRoutes)
}

func SearchStops(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	fmt.Printf("SearchStops - Query: %s\n", query)
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	like := "%" + query + "%"
	sql := `SELECT company, stop, name_en, name_tc, name_sc, lat, long
		FROM stops
		WHERE stop ILIKE $1 OR name_en ILIKE $2 OR name_tc ILIKE $3 OR name_sc ILIKE $4
		LIMIT 50`
	rows, err := database.Query(sql, like, like, like, like)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allStops []Stop
	for rows.Next() {
		var stop Stop
		err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err == nil {
			allStops = append(allStops, stop)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allStops)
}

// GetStopsByRouteId returns all stops for a specific route
func GetStopsByRouteId(w http.ResponseWriter, r *http.Request) {
	routeId := r.URL.Query().Get("routeId")
	direction := r.URL.Query().Get("direction")
	fmt.Printf("GetStopsByRouteId - RouteId: %s, Direction: %s\n", routeId, direction)
	if routeId == "" {
		http.Error(w, "Query parameter 'routeId' is required", http.StatusBadRequest)
		return
	}

	var sql string
	var args []interface{}

	if direction != "" {
		sql = `SELECT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, rs.stop,
			s.name_en, s.name_tc, s.lat, s.long
			FROM route_stops rs
			JOIN stops s ON rs.stop = s.stop AND rs.company = s.company
			WHERE rs.route = $1 AND rs.direction = $2
			ORDER BY CAST(rs.seq AS INTEGER)`
		args = []interface{}{routeId, direction}
	} else {
		sql = `SELECT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, rs.stop,
			s.name_en, s.name_tc, s.lat, s.long
			FROM route_stops rs
			JOIN stops s ON rs.stop = s.stop AND rs.company = s.company
			WHERE rs.route = $1
			ORDER BY rs.direction, CAST(rs.seq AS INTEGER)`
		args = []interface{}{routeId}
	}

	rows, err := database.Query(sql, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStopsWithDetails []map[string]interface{}
	for rows.Next() {
		var company, route, direction, serviceType, seq, stop, nameEn, nameTc, lat, long string
		err := rows.Scan(&company, &route, &direction, &serviceType, &seq, &stop, &nameEn, &nameTc, &lat, &long)
		if err != nil {
			continue
		}
		routeStopsWithDetails = append(routeStopsWithDetails, map[string]interface{}{
			"company":      company,
			"route":        route,
			"direction":    direction,
			"service_type": serviceType,
			"seq":          seq,
			"stop":         stop,
			"name_en":      nameEn,
			"name_tc":      nameTc,
			"lat":          lat,
			"long":         long,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routeStopsWithDetails)
}

// GetRoutesByStopId returns all routes that pass through a specific stop
func GetRoutesByStopId(w http.ResponseWriter, r *http.Request) {
	stopId := r.URL.Query().Get("stopId")
	fmt.Printf("GetRoutesByStopId - StopId: %s\n", stopId)
	if stopId == "" {
		http.Error(w, "Query parameter 'stopId' is required", http.StatusBadRequest)
		return
	}

	sql := `SELECT DISTINCT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, rs.stop
		FROM route_stops rs
		WHERE rs.stop = $1
		ORDER BY rs.route, rs.direction`
	rows, err := database.Query(sql, stopId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routesWithDetails []map[string]interface{}
	for rows.Next() {
		var company, route, direction, serviceType, seq, stop string
		err := rows.Scan(&company, &route, &direction, &serviceType, &seq, &stop)
		if err != nil {
			continue
		}
		routesWithDetails = append(routesWithDetails, map[string]interface{}{
			"company":      company,
			"route":        route,
			"direction":    direction,
			"service_type": serviceType,
			"seq":          seq,
			"stop":         stop,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routesWithDetails)
}

// GetStopsNearby returns stops within ±0.001 lat/long from a given stop
func GetStopsNearby(w http.ResponseWriter, r *http.Request) {
	stopId := r.URL.Query().Get("stopId")
	fmt.Printf("GetStopsNearby - StopId: %s\n", stopId)
	if stopId == "" {
		http.Error(w, "Query parameter 'stopId' is required", http.StatusBadRequest)
		return
	}

	var targetLat, targetLong string
	err := database.QueryRow("SELECT lat, long FROM stops WHERE stop = $1", stopId).Scan(&targetLat, &targetLong)
	if err != nil {
		http.Error(w, "Stop not found", http.StatusNotFound)
		return
	}

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

	sql := `SELECT company, stop, name_en, name_tc, name_sc, lat, long
		FROM stops
		WHERE CAST(lat AS DOUBLE PRECISION) BETWEEN $1 AND $2
		AND CAST(long AS DOUBLE PRECISION) BETWEEN $3 AND $4
		ORDER BY ABS(CAST(lat AS DOUBLE PRECISION) - $5) + ABS(CAST(long AS DOUBLE PRECISION) - $6), stop`
	rows, err := database.Query(sql,
		latFloat-0.001, latFloat+0.001,
		longFloat-0.001, longFloat+0.001,
		latFloat, longFloat,
	)
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

// GetStopByStopId returns the stop details for a specific stopId
func GetStopByStopId(w http.ResponseWriter, r *http.Request) {
	stopId := r.URL.Query().Get("stopId")
	fmt.Printf("GetStopByStopId - StopId: %s\n", stopId)
	if stopId == "" {
		http.Error(w, "Query parameter 'stopId' is required", http.StatusBadRequest)
		return
	}

	sql := `SELECT id, company, stop, name_en, name_tc, name_sc, lat, long, data_timestamp
		FROM stops
		WHERE stop = $1`
	row := database.QueryRow(sql, stopId)

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

// GetRouteCount returns the total number of bus routes
func GetRouteCount(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRouteCount - Type: bus\n")
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM routes").Scan(&count)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type":  "bus",
		"count": count,
	})
}
