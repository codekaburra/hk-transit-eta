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
				FROM minibus_route WHERE region = $1 ORDER BY route_code, route_seq`
		args = append(args, region)
	} else {
		query = `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en,
				orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en,
				direction_data_timestamp, data_timestamp
				FROM minibus_route ORDER BY region, route_code, route_seq`
	}

	rows, err := minibusDB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []map[string]interface{}
	for rows.Next() {
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

		routes = append(routes, map[string]interface{}{
			"region": region, "route_code": routeCode, "route_id": routeID, "route_seq": routeSeq,
			"description_tc": descTC, "description_sc": descSC, "description_en": descEN,
			"orig_tc": origTC, "orig_sc": origSC, "orig_en": origEN,
			"dest_tc": destTC, "dest_sc": destSC, "dest_en": destEN,
			"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
			"direction_data_timestamp": directionDataTimestamp, "data_timestamp": dataTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

// GetMinibusStops returns all minibus stops with coordinates
func GetMinibusStops(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetMinibusStops - Query: %s\n", r.URL.RawQuery)
	// DISTINCT ON is PostgreSQL syntax for "first row per group by stop_id"
	query := `SELECT DISTINCT ON (s.stop_id) s.stop_id, s.latitude, s.longitude, s.hk80_latitude, s.hk80_longitude,
			  s.enabled, s.remarks_tc, s.remarks_sc, s.remarks_en, s.data_timestamp,
			  rs.name_tc, rs.name_sc, rs.name_en
			  FROM minibus_stop s
			  LEFT JOIN minibus_route_stop rs ON s.stop_id = rs.stop_id
			  ORDER BY s.stop_id LIMIT 100`
	rows, err := minibusDB.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []map[string]interface{}
	for rows.Next() {
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

		stops = append(stops, map[string]interface{}{
			"stop_id": stopID, "latitude": lat, "longitude": lng,
			"hk80_latitude": hk80Lat, "hk80_longitude": hk80Lng, "enabled": enabled,
			"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
			"data_timestamp": dataTimestamp, "name_tc": nameTC, "name_sc": nameSC, "name_en": nameEN,
		})
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
				 WHERE rs.route_id = $1 AND rs.route_seq = $2
				 ORDER BY rs.stop_seq`
		args = []interface{}{routeID, routeSeq}
	} else {
		query = `SELECT rs.route_id, rs.route_seq, rs.stop_seq, rs.stop_id, rs.name_tc, rs.name_sc, rs.name_en,
				 s.latitude, s.longitude, s.enabled
				 FROM minibus_route_stop rs
				 LEFT JOIN minibus_stop s ON rs.stop_id = s.stop_id
				 WHERE rs.route_id = $1
				 ORDER BY rs.route_seq, rs.stop_seq`
		args = []interface{}{routeID}
	}

	rows, err := minibusDB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStops []map[string]interface{}
	for rows.Next() {
		var routeID, routeSeq, stopSeq, stopID int
		var nameTC, nameSC, nameEN string
		var lat, lng *float64
		var enabled *bool

		err := rows.Scan(&routeID, &routeSeq, &stopSeq, &stopID, &nameTC, &nameSC, &nameEN, &lat, &lng, &enabled)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		routeStops = append(routeStops, map[string]interface{}{
			"route_id": routeID, "route_seq": routeSeq, "stop_seq": stopSeq, "stop_id": stopID,
			"name_tc": nameTC, "name_sc": nameSC, "name_en": nameEN,
			"latitude": lat, "longitude": lng, "enabled": enabled,
		})
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

	like := "%" + query + "%"
	sql := `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en,
			orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en,
			direction_data_timestamp, data_timestamp
			FROM minibus_route
			WHERE route_code ILIKE $1 OR description_tc ILIKE $2 OR description_sc ILIKE $3 OR description_en ILIKE $4
			ORDER BY region, route_code, route_seq LIMIT 50`
	rows, err := minibusDB.Query(sql, like, like, like, like)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []map[string]interface{}
	for rows.Next() {
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

		routes = append(routes, map[string]interface{}{
			"region": region, "route_code": routeCode, "route_id": routeID, "route_seq": routeSeq,
			"description_tc": descTC, "description_sc": descSC, "description_en": descEN,
			"orig_tc": origTC, "orig_sc": origSC, "orig_en": origEN,
			"dest_tc": destTC, "dest_sc": destSC, "dest_en": destEN,
			"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
			"direction_data_timestamp": directionDataTimestamp, "data_timestamp": dataTimestamp,
		})
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

	like := "%" + query + "%"
	// DISTINCT ON (s.stop_id) replaces the SQLite GROUP BY s.stop_id pattern
	sql := `SELECT DISTINCT ON (s.stop_id) s.stop_id, s.latitude, s.longitude, s.hk80_latitude, s.hk80_longitude,
			s.enabled, s.remarks_tc, s.remarks_sc, s.remarks_en, s.data_timestamp,
			rs.name_tc, rs.name_sc, rs.name_en
			FROM minibus_stop s
			LEFT JOIN minibus_route_stop rs ON s.stop_id = rs.stop_id
			WHERE rs.name_tc ILIKE $1 OR rs.name_sc ILIKE $2 OR rs.name_en ILIKE $3
			ORDER BY s.stop_id LIMIT 50`
	rows, err := minibusDB.Query(sql, like, like, like)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []map[string]interface{}
	for rows.Next() {
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

		stops = append(stops, map[string]interface{}{
			"stop_id": stopID, "latitude": lat, "longitude": lng,
			"hk80_latitude": hk80Lat, "hk80_longitude": hk80Lng, "enabled": enabled,
			"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
			"data_timestamp": dataTimestamp, "name_tc": nameTC, "name_sc": nameSC, "name_en": nameEN,
		})
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

	query := `SELECT DISTINCT ON (s.stop_id) s.stop_id, s.latitude, s.longitude, s.hk80_latitude, s.hk80_longitude,
			  s.enabled, s.remarks_tc, s.remarks_sc, s.remarks_en, s.data_timestamp,
			  rs.name_tc, rs.name_sc, rs.name_en
			  FROM minibus_stop s
			  LEFT JOIN minibus_route_stop rs ON s.stop_id = rs.stop_id
			  WHERE s.stop_id = $1
			  ORDER BY s.stop_id`

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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"stop_id": stopID, "latitude": lat, "longitude": lng,
		"hk80_latitude": hk80Lat, "hk80_longitude": hk80Lng, "enabled": enabled,
		"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
		"data_timestamp": dataTimestamp, "name_tc": nameTC, "name_sc": nameSC, "name_en": nameEN,
	})
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

	query := `SELECT DISTINCT mr.region, mr.route_code, mr.route_id, mr.route_seq,
			  mr.description_tc, mr.description_sc, mr.description_en,
			  mr.orig_tc, mr.orig_sc, mr.orig_en, mr.dest_tc, mr.dest_sc, mr.dest_en,
			  mr.remarks_tc, mr.remarks_sc, mr.remarks_en, mr.direction_data_timestamp, mr.data_timestamp
			  FROM minibus_route mr
			  JOIN minibus_route_stop rs ON mr.route_id = rs.route_id AND mr.route_seq = rs.route_seq
			  WHERE rs.stop_id = $1
			  ORDER BY mr.region, mr.route_code, mr.route_seq`

	rows, err := minibusDB.Query(query, stopId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []map[string]interface{}
	for rows.Next() {
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

		routes = append(routes, map[string]interface{}{
			"region": region, "route_code": routeCode, "route_id": routeID, "route_seq": routeSeq,
			"description_tc": descTC, "description_sc": descSC, "description_en": descEN,
			"orig_tc": origTC, "orig_sc": origSC, "orig_en": origEN,
			"dest_tc": destTC, "dest_sc": destSC, "dest_en": destEN,
			"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
			"direction_data_timestamp": directionDataTimestamp, "data_timestamp": dataTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

// GetRouteByRouteIdAndDirection returns route details with headways
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

	routeQuery := `SELECT region, route_code, route_id, route_seq, description_tc, description_sc, description_en,
				orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en, remarks_tc, remarks_sc, remarks_en,
				direction_data_timestamp, data_timestamp
				FROM minibus_route WHERE route_id = $1 AND route_seq = $2`

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

	headwayQuery := `SELECT headway_seq, weekday_monday, weekday_tuesday, weekday_wednesday,
					weekday_thursday, weekday_friday, weekday_saturday, weekday_sunday,
					public_holiday, start_time, end_time, frequency, frequency_upper
					FROM minibus_headway WHERE route_id = $1 AND route_seq = $2 ORDER BY headway_seq`

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

		headways = append(headways, map[string]interface{}{
			"headway_seq":     headwaySeq,
			"weekdays":        []bool{mon, tue, wed, thu, fri, sat, sun},
			"public_holiday":  publicHoliday,
			"start_time":      startTime,
			"end_time":        endTime,
			"frequency":       frequency,
			"frequency_upper": frequencyUpper,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"route_id": dbRouteId, "route_seq": dbRouteSeq, "region": region, "route_code": routeCode,
		"description_tc": descTC, "description_sc": descSC, "description_en": descEN,
		"orig_tc": origTC, "orig_sc": origSC, "orig_en": origEN,
		"dest_tc": destTC, "dest_sc": destSC, "dest_en": destEN,
		"remarks_tc": remarksTC, "remarks_sc": remarksSC, "remarks_en": remarksEN,
		"headways":                 headways,
		"direction_data_timestamp": directionDataTimestamp, "data_timestamp": dataTimestamp,
	})
}

// GetRouteCount returns the total number of minibus routes
func GetRouteCount(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRouteCount - Type: minibus\n")
	var count int
	if err := minibusDB.QueryRow("SELECT COUNT(*) FROM minibus_route").Scan(&count); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type":  "minibus",
		"count": count,
	})
}
