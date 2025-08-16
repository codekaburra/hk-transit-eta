package minibus

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// GetMinibusRoutes returns all minibus routes with optional region filter
func GetMinibusRoutes(w http.ResponseWriter, r *http.Request) {
	region := r.URL.Query().Get("region")
	fmt.Printf("GetMinibusRoutes - Region: %s\n", region)

	var query string
	var args []interface{}

	if region != "" {
		query = `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en, 
				orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en, 
				direction_data_timestamp, data_timestamp 
				FROM minibus_route WHERE region = ? ORDER BY route_code, route_seq`
		args = append(args, region)
	} else {
		query = `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en, 
				orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en, 
				direction_data_timestamp, data_timestamp 
				FROM minibus_route ORDER BY region, route_code, route_seq`
		args = []interface{}{}
	}

	fmt.Printf("SQL: %s\n", query)
	fmt.Printf("SQL Parameters: %v\n", args)
	rows, err := minibusDB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []map[string]interface{}
	for rows.Next() {
		var route map[string]interface{} = make(map[string]interface{})
		var region, routeCode, descTC, descSC, descEN string
		var origTC, origSC, origEN, destTC, destSC, destEN string
		var remarksTC, remarksSC, remarksEN, directionDataTimestamp, dataTimestamp string
		var routeID, routeSeq int

		err := rows.Scan(&region, &routeCode, &routeID, &routeSeq, &descTC, &descSC, &descEN,
			&origTC, &origSC, &origEN, &destTC, &destSC, &destEN,
			&remarksTC, &remarksSC, &remarksEN, &directionDataTimestamp, &dataTimestamp)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		route["region"] = region
		route["route_code"] = routeCode
		route["route_id"] = routeID
		route["route_seq"] = routeSeq
		route["description_tc"] = descTC
		route["description_sc"] = descSC
		route["description_en"] = descEN
		route["orig_tc"] = origTC
		route["orig_sc"] = origSC
		route["orig_en"] = origEN
		route["dest_tc"] = destTC
		route["dest_sc"] = destSC
		route["dest_en"] = destEN
		route["remarks_tc"] = remarksTC
		route["remarks_sc"] = remarksSC
		route["remarks_en"] = remarksEN
		route["direction_data_timestamp"] = directionDataTimestamp
		route["data_timestamp"] = dataTimestamp

		routes = append(routes, route)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

// GetMinibusStops returns all minibus stops with coordinates
func GetMinibusStops(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetMinibusStops - Query: %s\n", r.URL.RawQuery)
	query := `SELECT s.stop_id, s.latitude, s.longitude, s.hk80_latitude, s.hk80_longitude, 
			  s.enabled, s.remarks_tc, s.remarks_sc, s.remarks_en, s.data_timestamp,
			  rs.name_tc, rs.name_sc, rs.name_en
			  FROM minibus_stop s
			  LEFT JOIN minibus_route_stop rs ON s.stop_id = rs.stop_id
			  GROUP BY s.stop_id
			  ORDER BY s.stop_id LIMIT 100`
	fmt.Printf("SQL: %s\n", query)
	rows, err := minibusDB.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []map[string]interface{}
	for rows.Next() {
		var stop map[string]interface{} = make(map[string]interface{})
		var stopID int
		var lat, lng, hk80Lat, hk80Lng float64
		var enabled bool
		var remarksTC, remarksSC, remarksEN, dataTimestamp *string
		var nameTC, nameSC, nameEN *string

		err := rows.Scan(&stopID, &lat, &lng, &hk80Lat, &hk80Lng, &enabled,
			&remarksTC, &remarksSC, &remarksEN, &dataTimestamp, &nameTC, &nameSC, &nameEN)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		stop["stop_id"] = stopID
		stop["latitude"] = lat
		stop["longitude"] = lng
		stop["hk80_latitude"] = hk80Lat
		stop["hk80_longitude"] = hk80Lng
		stop["enabled"] = enabled
		stop["remarks_tc"] = remarksTC
		stop["remarks_sc"] = remarksSC
		stop["remarks_en"] = remarksEN
		stop["data_timestamp"] = dataTimestamp
		stop["name_tc"] = nameTC
		stop["name_sc"] = nameSC
		stop["name_en"] = nameEN

		stops = append(stops, stop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stops)
}

// GetMinibusRouteStops returns stops for a specific route and direction
func GetMinibusRouteStops(w http.ResponseWriter, r *http.Request) {
	routeIDStr := r.URL.Query().Get("routeId")
	routeSeqStr := r.URL.Query().Get("routeSeq")
	fmt.Printf("GetMinibusRouteStops - RouteId: %s, RouteSeq: %s\n", routeIDStr, routeSeqStr)

	if routeIDStr == "" {
		http.Error(w, "routeId parameter is required", http.StatusBadRequest)
		return
	}

	routeID, err := strconv.Atoi(routeIDStr)
	if err != nil {
		http.Error(w, "Invalid routeId", http.StatusBadRequest)
		return
	}

	var query string
	var args []interface{}

	if routeSeqStr != "" {
		routeSeq, err := strconv.Atoi(routeSeqStr)
		if err != nil {
			http.Error(w, "Invalid routeSeq", http.StatusBadRequest)
			return
		}
		query = `SELECT rs.route_id, rs.route_seq, rs.stop_seq, rs.stop_id, rs.name_tc, rs.name_sc, rs.name_en,
				 s.latitude, s.longitude, s.enabled
				 FROM minibus_route_stop rs
				 LEFT JOIN minibus_stop s ON rs.stop_id = s.stop_id
				 WHERE rs.route_id = ? AND rs.route_seq = ?
				 ORDER BY rs.stop_seq`
		args = []interface{}{routeID, routeSeq}
	} else {
		query = `SELECT rs.route_id, rs.route_seq, rs.stop_seq, rs.stop_id, rs.name_tc, rs.name_sc, rs.name_en,
				 s.latitude, s.longitude, s.enabled
				 FROM minibus_route_stop rs
				 LEFT JOIN minibus_stop s ON rs.stop_id = s.stop_id
				 WHERE rs.route_id = ?
				 ORDER BY rs.route_seq, rs.stop_seq`
		args = []interface{}{routeID}
	}

	fmt.Printf("SQL: %s\n", query)
	fmt.Printf("SQL Parameters: %v\n", args)
	rows, err := minibusDB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStops []map[string]interface{}
	for rows.Next() {
		var routeStop map[string]interface{} = make(map[string]interface{})
		var routeID, routeSeq, stopSeq, stopID int
		var nameTC, nameSC, nameEN string
		var lat, lng *float64
		var enabled *bool

		err := rows.Scan(&routeID, &routeSeq, &stopSeq, &stopID, &nameTC, &nameSC, &nameEN, &lat, &lng, &enabled)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		routeStop["route_id"] = routeID
		routeStop["route_seq"] = routeSeq
		routeStop["stop_seq"] = stopSeq
		routeStop["stop_id"] = stopID
		routeStop["name_tc"] = nameTC
		routeStop["name_sc"] = nameSC
		routeStop["name_en"] = nameEN
		routeStop["latitude"] = lat
		routeStop["longitude"] = lng
		routeStop["enabled"] = enabled

		routeStops = append(routeStops, routeStop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routeStops)
}

// SearchMinibusRoutes searches routes by route code or description
func SearchMinibusRoutes(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	fmt.Printf("SearchMinibusRoutes - Query: %s\n", query)
	if query == "" {
		http.Error(w, "Search query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	sql := `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en, 
			orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en, 
			direction_data_timestamp, data_timestamp 
			FROM minibus_route 
			WHERE route_code LIKE ? OR description_tc LIKE ? OR description_sc LIKE ? OR description_en LIKE ?
			ORDER BY region, route_code, route_seq LIMIT 50`
	fmt.Printf("SQL: %s\n", sql)
	fmt.Printf("SQL Parameters: [%s, %s, %s, %s]\n", "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	rows, err := minibusDB.Query(sql, "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []map[string]interface{}
	for rows.Next() {
		var route map[string]interface{} = make(map[string]interface{})
		var region, routeCode, descTC, descSC, descEN string
		var origTC, origSC, origEN, destTC, destSC, destEN string
		var remarksTC, remarksSC, remarksEN, directionDataTimestamp, dataTimestamp string
		var routeID, routeSeq int

		err := rows.Scan(&region, &routeCode, &routeID, &routeSeq, &descTC, &descSC, &descEN,
			&origTC, &origSC, &origEN, &destTC, &destSC, &destEN,
			&remarksTC, &remarksSC, &remarksEN, &directionDataTimestamp, &dataTimestamp)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		route["region"] = region
		route["route_code"] = routeCode
		route["route_id"] = routeID
		route["route_seq"] = routeSeq
		route["description_tc"] = descTC
		route["description_sc"] = descSC
		route["description_en"] = descEN
		route["orig_tc"] = origTC
		route["orig_sc"] = origSC
		route["orig_en"] = origEN
		route["dest_tc"] = destTC
		route["dest_sc"] = destSC
		route["dest_en"] = destEN
		route["remarks_tc"] = remarksTC
		route["remarks_sc"] = remarksSC
		route["remarks_en"] = remarksEN
		route["direction_data_timestamp"] = directionDataTimestamp
		route["data_timestamp"] = dataTimestamp

		routes = append(routes, route)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

// SearchMinibusStops searches stops by name
func SearchMinibusStops(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	fmt.Printf("SearchMinibusStops - Query: %s\n", query)
	if query == "" {
		http.Error(w, "Search query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	sql := `SELECT DISTINCT s.stop_id, s.latitude, s.longitude, s.hk80_latitude, s.hk80_longitude, 
			s.enabled, s.remarks_tc, s.remarks_sc, s.remarks_en, s.data_timestamp,
			rs.name_tc, rs.name_sc, rs.name_en
			FROM minibus_stop s
			LEFT JOIN minibus_route_stop rs ON s.stop_id = rs.stop_id
			WHERE rs.name_tc LIKE ? OR rs.name_sc LIKE ? OR rs.name_en LIKE ?
			GROUP BY s.stop_id
			ORDER BY s.stop_id LIMIT 50`
	fmt.Printf("SQL: %s\n", sql)
	fmt.Printf("SQL Parameters: [%s, %s, %s]\n", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	rows, err := minibusDB.Query(sql, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []map[string]interface{}
	for rows.Next() {
		var stop map[string]interface{} = make(map[string]interface{})
		var stopID int
		var lat, lng float64
		var enabled bool
		var nameTC, nameSC, nameEN string

		err := rows.Scan(&stopID, &lat, &lng, &enabled, &nameTC, &nameSC, &nameEN)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		stop["stop_id"] = stopID
		stop["latitude"] = lat
		stop["longitude"] = lng
		stop["enabled"] = enabled
		stop["name_tc"] = nameTC
		stop["name_sc"] = nameSC
		stop["name_en"] = nameEN

		stops = append(stops, stop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stops)
}

// GetMinibusStopById returns detailed information for a specific stop
func GetMinibusStopById(w http.ResponseWriter, r *http.Request) {
	stopIdStr := r.URL.Query().Get("stopId")
	fmt.Printf("GetMinibusStopById - StopId: %s\n", stopIdStr)
	if stopIdStr == "" {
		http.Error(w, "stopId parameter is required", http.StatusBadRequest)
		return
	}

	stopId, err := strconv.Atoi(stopIdStr)
	if err != nil {
		http.Error(w, "Invalid stopId", http.StatusBadRequest)
		return
	}

	query := `SELECT s.stop_id, s.latitude, s.longitude, s.hk80_latitude, s.hk80_longitude,
			  s.enabled, s.remarks_tc, s.remarks_sc, s.remarks_en, s.data_timestamp,
			  rs.name_tc, rs.name_sc, rs.name_en
			  FROM minibus_stop s
			  LEFT JOIN minibus_route_stop rs ON s.stop_id = rs.stop_id
			  WHERE s.stop_id = ?
			  LIMIT 1`
	fmt.Printf("SQL: %s\n", query)
	fmt.Printf("SQL Parameters: [%d]\n", stopId)

	var stop map[string]interface{} = make(map[string]interface{})
	var stopID int
	var lat, lng, hk80Lat, hk80Lng float64
	var enabled bool
	var remarksTC, remarksSC, remarksEN, dataTimestamp *string
	var nameTC, nameSC, nameEN *string

	err = minibusDB.QueryRow(query, stopId).Scan(&stopID, &lat, &lng, &hk80Lat, &hk80Lng,
		&enabled, &remarksTC, &remarksSC, &remarksEN, &dataTimestamp, &nameTC, &nameSC, &nameEN)

	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			http.Error(w, "Stop not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	stop["stop_id"] = stopID
	stop["latitude"] = lat
	stop["longitude"] = lng
	stop["hk80_latitude"] = hk80Lat
	stop["hk80_longitude"] = hk80Lng
	stop["enabled"] = enabled
	stop["remarks_tc"] = remarksTC
	stop["remarks_sc"] = remarksSC
	stop["remarks_en"] = remarksEN
	stop["data_timestamp"] = dataTimestamp
	stop["name_tc"] = nameTC
	stop["name_sc"] = nameSC
	stop["name_en"] = nameEN

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stop)
}

// GetMinibusRoutesByStopId returns all routes that serve a specific stop
func GetMinibusRoutesByStopId(w http.ResponseWriter, r *http.Request) {
	stopIdStr := r.URL.Query().Get("stopId")
	fmt.Printf("GetMinibusRoutesByStopId - StopId: %s\n", stopIdStr)
	if stopIdStr == "" {
		http.Error(w, "stopId parameter is required", http.StatusBadRequest)
		return
	}

	stopId, err := strconv.Atoi(stopIdStr)
	if err != nil {
		http.Error(w, "Invalid stopId", http.StatusBadRequest)
		return
	}

	query := `SELECT DISTINCT mr.region, mr.route_code, mr.route_id, mr.route_seq, mr.description_tc, mr.description_sc, mr.description_en,
			  mr.orig_tc, mr.orig_sc, mr.orig_en, mr.dest_tc, mr.dest_sc, mr.dest_en, 
			  mr.remarks_tc, mr.remarks_sc, mr.remarks_en, mr.direction_data_timestamp, mr.data_timestamp
			  FROM minibus_route mr
			  JOIN minibus_route_stop rs ON mr.route_id = rs.route_id AND mr.route_seq = rs.route_seq
			  WHERE rs.stop_id = ?
			  ORDER BY mr.region, mr.route_code, mr.route_seq`
	fmt.Printf("SQL: %s\n", query)
	fmt.Printf("SQL Parameters: [%d]\n", stopId)

	rows, err := minibusDB.Query(query, stopId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []map[string]interface{}
	for rows.Next() {
		var route map[string]interface{} = make(map[string]interface{})
		var region, routeCode, descTC, descSC, descEN string
		var origTC, origSC, origEN, destTC, destSC, destEN string
		var remarksTC, remarksSC, remarksEN, directionDataTimestamp, dataTimestamp string
		var routeID, routeSeq int

		err := rows.Scan(&region, &routeCode, &routeID, &routeSeq, &descTC, &descSC, &descEN,
			&origTC, &origSC, &origEN, &destTC, &destSC, &destEN,
			&remarksTC, &remarksSC, &remarksEN, &directionDataTimestamp, &dataTimestamp)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		route["region"] = region
		route["route_code"] = routeCode
		route["route_id"] = routeID
		route["route_seq"] = routeSeq
		route["description_tc"] = descTC
		route["description_sc"] = descSC
		route["description_en"] = descEN
		route["orig_tc"] = origTC
		route["orig_sc"] = origSC
		route["orig_en"] = origEN
		route["dest_tc"] = destTC
		route["dest_sc"] = destSC
		route["dest_en"] = destEN
		route["remarks_tc"] = remarksTC
		route["remarks_sc"] = remarksSC
		route["remarks_en"] = remarksEN
		route["direction_data_timestamp"] = directionDataTimestamp
		route["data_timestamp"] = dataTimestamp

		routes = append(routes, route)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

// GetRouteByRouteIdAndDirection returns detailed route information with headways for a specific route ID and direction
func GetRouteByRouteIdAndDirection(w http.ResponseWriter, r *http.Request) {
	routeIdStr := r.URL.Query().Get("routeId")
	routeSeqStr := r.URL.Query().Get("routeSeq")
	fmt.Printf("GetRouteByRouteIdAndDirection - RouteId: %s, RouteSeq: %s\n", routeIdStr, routeSeqStr)

	if routeIdStr == "" || routeSeqStr == "" {
		http.Error(w, "routeId and routeSeq parameters are required", http.StatusBadRequest)
		return
	}

	routeId, err := strconv.Atoi(routeIdStr)
	if err != nil {
		http.Error(w, "Invalid routeId", http.StatusBadRequest)
		return
	}

	routeSeq, err := strconv.Atoi(routeSeqStr)
	if err != nil {
		http.Error(w, "Invalid routeSeq", http.StatusBadRequest)
		return
	}

	// Get route information
	routeQuery := `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en, 
				orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en, 
				direction_data_timestamp, data_timestamp 
				FROM minibus_route WHERE route_id = ? AND route_seq = ?`
	fmt.Printf("SQL 1 (Route): %s\n", routeQuery)
	fmt.Printf("SQL 1 Parameters: [%d, %d]\n", routeId, routeSeq)

	var region, routeCode, descTC, descSC, descEN string
	var origTC, origSC, origEN, destTC, destSC, destEN string
	var remarksTC, remarksSC, remarksEN, directionDataTimestamp, dataTimestamp string
	var dbRouteId, dbRouteSeq int

	err = minibusDB.QueryRow(routeQuery, routeId, routeSeq).Scan(
		&region, &routeCode, &dbRouteId, &dbRouteSeq, &descTC, &descSC, &descEN,
		&origTC, &origSC, &origEN, &destTC, &destSC, &destEN,
		&remarksTC, &remarksSC, &remarksEN, &directionDataTimestamp, &dataTimestamp)

	if err != nil {
		http.Error(w, "Route not found", http.StatusNotFound)
		return
	}

	// Get headways for this route
	headwayQuery := `SELECT headway_seq, weekday_monday, weekday_tuesday, weekday_wednesday, 
					weekday_thursday, weekday_friday, weekday_saturday, weekday_sunday, 
					public_holiday, start_time, end_time, frequency, frequency_upper
					FROM minibus_headway WHERE route_id = ? AND route_seq = ? ORDER BY headway_seq`
	fmt.Printf("SQL 2 (Headway): %s\n", headwayQuery)
	fmt.Printf("SQL 2 Parameters: [%d, %d]\n", routeId, routeSeq)

	headwayRows, err := minibusDB.Query(headwayQuery, routeId, routeSeq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer headwayRows.Close()

	var headways []map[string]interface{}
	for headwayRows.Next() {
		var headwaySeq, frequency int
		var frequencyUpper *int
		var mon, tue, wed, thu, fri, sat, sun, publicHoliday bool
		var startTime, endTime string

		err := headwayRows.Scan(&headwaySeq, &mon, &tue, &wed, &thu, &fri, &sat, &sun,
			&publicHoliday, &startTime, &endTime, &frequency, &frequencyUpper)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		headway := map[string]interface{}{
			"headway_seq":     headwaySeq,
			"weekdays":        []bool{mon, tue, wed, thu, fri, sat, sun},
			"public_holiday":  publicHoliday,
			"start_time":      startTime,
			"end_time":        endTime,
			"frequency":       frequency,
			"frequency_upper": frequencyUpper,
		}
		headways = append(headways, headway)
	}

	// Build response
	response := map[string]interface{}{
		"route_id":                 dbRouteId,
		"route_seq":                dbRouteSeq,
		"region":                   region,
		"route_code":               routeCode,
		"description_tc":           descTC,
		"description_sc":           descSC,
		"description_en":           descEN,
		"orig_tc":                  origTC,
		"orig_sc":                  origSC,
		"orig_en":                  origEN,
		"dest_tc":                  destTC,
		"dest_sc":                  destSC,
		"dest_en":                  destEN,
		"remarks_tc":               remarksTC,
		"remarks_sc":               remarksSC,
		"remarks_en":               remarksEN,
		"headways":                 headways,
		"direction_data_timestamp": directionDataTimestamp,
		"data_timestamp":           dataTimestamp,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetRouteCount returns the total number of minibus routes
func GetRouteCount(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRouteCount - Type: minibus\n")
	var count int
	sql := "SELECT COUNT(*) FROM minibus_route"
	fmt.Printf("SQL: %s\n", sql)
	err := minibusDB.QueryRow(sql).Scan(&count)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"type":  "minibus",
		"count": count,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
