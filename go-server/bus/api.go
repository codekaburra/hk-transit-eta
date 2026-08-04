package bus

import (
	"fmt"
	"net/http"

	"hk-transit-eta/internal/httpjson"
)

func GetRoutes(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRoutes - Query: %s\n", r.URL.RawQuery)
	sql := "SELECT company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc FROM routes LIMIT 100"
	rows, err := database.Query(sql)
	if err != nil {
		httpjson.Internal(w, "GetRoutes", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	routes := []Route{}
	for rows.Next() {
		var route Route
		err := rows.Scan(&route.Company, &route.Route, &route.Direction, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
		if err != nil {
			httpjson.Internal(w, "GetRoutes", err)
			return
		}
		routes = append(routes, route)
	}

	if !httpjson.CheckRows(w, rows, "GetRoutes") {
		return
	}

	httpjson.Write(w, routes)
}

func GetStops(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetStops - Query: %s\n", r.URL.RawQuery)
	sql := "SELECT company, stop, name_en, name_tc, name_sc, lat, long FROM stops LIMIT 100"
	rows, err := database.Query(sql)
	if err != nil {
		httpjson.Internal(w, "GetStops", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	stops := []Stop{}
	for rows.Next() {
		var stop Stop
		err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			httpjson.Internal(w, "GetStops", err)
			return
		}
		stops = append(stops, stop)
	}

	if !httpjson.CheckRows(w, rows, "GetStops") {
		return
	}

	httpjson.Write(w, stops)
}

func GetRouteStops(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRouteStops - Query: %s\n", r.URL.RawQuery)
	sql := "SELECT company, route, direction, service_type, seq, stop FROM route_stops LIMIT 100"
	rows, err := database.Query(sql)
	if err != nil {
		httpjson.Internal(w, "GetRouteStops", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	routeStops := []RouteStop{}
	for rows.Next() {
		var routeStop RouteStop
		err := rows.Scan(&routeStop.Company, &routeStop.Route, &routeStop.Direction, &routeStop.ServiceType, &routeStop.Seq, &routeStop.Stop)
		if err != nil {
			httpjson.Internal(w, "GetRouteStops", err)
			return
		}
		routeStops = append(routeStops, routeStop)
	}

	if !httpjson.CheckRows(w, rows, "GetRouteStops") {
		return
	}

	httpjson.Write(w, routeStops)
}

func SearchRoutes(w http.ResponseWriter, r *http.Request) {
	query, ok := httpjson.RequiredQuery(w, r, "q")
	if !ok {
		return
	}
	fmt.Printf("SearchRoutes - Query: %s\n", query)

	like := "%" + query + "%"
	sql := `SELECT company, route, direction, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc
		FROM routes
		WHERE route ILIKE $1 OR orig_en ILIKE $2 OR dest_en ILIKE $3 OR orig_tc ILIKE $4 OR dest_tc ILIKE $5
		ORDER BY route, company, direction, service_type
		LIMIT 50`
	rows, err := database.Query(sql, like, like, like, like, like)
	if err != nil {
		httpjson.Internal(w, "SearchRoutes", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	allRoutes := []Route{}
	for rows.Next() {
		var route Route
		err := rows.Scan(&route.Company, &route.Route, &route.Direction, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
		if err != nil {
			httpjson.Internal(w, "SearchRoutes", err)
			return
		}
		allRoutes = append(allRoutes, route)
	}

	if !httpjson.CheckRows(w, rows, "SearchRoutes") {
		return
	}

	httpjson.Write(w, allRoutes)
}

func SearchStops(w http.ResponseWriter, r *http.Request) {
	query, ok := httpjson.RequiredQuery(w, r, "q")
	if !ok {
		return
	}
	fmt.Printf("SearchStops - Query: %s\n", query)

	like := "%" + query + "%"
	sql := `SELECT company, stop, name_en, name_tc, name_sc, lat, long
		FROM stops
		WHERE stop ILIKE $1 OR name_en ILIKE $2 OR name_tc ILIKE $3 OR name_sc ILIKE $4
		ORDER BY stop, company
		LIMIT 50`
	rows, err := database.Query(sql, like, like, like, like)
	if err != nil {
		httpjson.Internal(w, "SearchStops", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	allStops := []Stop{}
	for rows.Next() {
		var stop Stop
		err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			httpjson.Internal(w, "SearchStops", err)
			return
		}
		allStops = append(allStops, stop)
	}

	if !httpjson.CheckRows(w, rows, "SearchStops") {
		return
	}

	httpjson.Write(w, allStops)
}

// buildStopsByRouteQuery builds the stop lookup for a route. Each non-empty
// filter narrows the result; company and serviceType matter because a route
// number can be served by two operators and can run several service types in
// the same direction, and those form separate stop sequences.
func buildStopsByRouteQuery(routeId, company, direction, serviceType string) (string, []interface{}) {
	// LEFT JOIN, not INNER: a stop whose details are missing must still appear
	// in the sequence. An inner join drops it silently, so the route renders
	// with a hole — Citybus 50M is missing stop 003759, for which the operator
	// returns an empty payload, and outbound then showed 19 stops numbered
	// 1 to 20. Missing columns come back empty for the client to fall back on.
	sql := `SELECT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, rs.stop,
		COALESCE(s.name_en, ''), COALESCE(s.name_tc, ''),
		COALESCE(s.lat, ''), COALESCE(s.long, '')
		FROM route_stops rs
		LEFT JOIN stops s ON rs.stop = s.stop AND rs.company = s.company
		WHERE rs.route = $1`
	args := []interface{}{routeId}

	for _, f := range []struct {
		column string
		value  string
	}{
		{"rs.company", company},
		{"rs.direction", direction},
		{"rs.service_type", serviceType},
	} {
		if f.value == "" {
			continue
		}
		args = append(args, f.value)
		sql += fmt.Sprintf(" AND %s = $%d", f.column, len(args))
	}

	// Keep each (company, direction, service_type) sequence contiguous and in
	// stop order; seq is stored as text, so it must be cast to sort correctly.
	sql += ` ORDER BY rs.company, rs.direction, rs.service_type, CAST(rs.seq AS INTEGER)`
	return sql, args
}

// buildRouteVariantsQuery builds the exact-match route lookup, ordered
// outbound before inbound so the UI ordering is stable.
func buildRouteVariantsQuery(routeId, company string) (string, []interface{}) {
	sql := `SELECT company, route, direction, service_type,
		orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc, COALESCE(data_timestamp, '')
		FROM routes
		WHERE route = $1`
	args := []interface{}{routeId}
	if company != "" {
		args = append(args, company)
		sql += fmt.Sprintf(" AND company = $%d", len(args))
	}
	sql += ` ORDER BY company,
		CASE direction WHEN 'O' THEN 0 WHEN 'I' THEN 1 ELSE 2 END,
		service_type`
	return sql, args
}

// GetRouteVariants returns the route rows for an exact route number — one per
// travelling direction (and service type, for routes with special departures).
//
// This exists because route detail pages previously resolved a route via the
// fuzzy search endpoint, which is unsuitable for exact lookup: it matches
// substrings (searching "1" also matches 1A, 10, 100 and any origin or
// destination containing "1" — several hundred rows), caps the result at 50
// and has no ORDER BY, so whether the wanted route is returned at all is left
// to the database.
func GetRouteVariants(w http.ResponseWriter, r *http.Request) {
	routeId, ok := httpjson.RequiredQuery(w, r, "routeId")
	if !ok {
		return
	}
	company := r.URL.Query().Get("company")
	fmt.Printf("GetRouteVariants - RouteId: %s, Company: %s\n", routeId, company)

	sql, args := buildRouteVariantsQuery(routeId, company)

	rows, err := database.Query(sql, args...)
	if err != nil {
		httpjson.Internal(w, "GetRouteVariants", err)
		return
	}
	defer rows.Close()

	variants := []map[string]interface{}{}
	for rows.Next() {
		var company, route, direction, serviceType string
		var origEn, origTc, origSc, destEn, destTc, destSc, dataTimestamp string
		if err := rows.Scan(&company, &route, &direction, &serviceType,
			&origEn, &origTc, &origSc, &destEn, &destTc, &destSc, &dataTimestamp); err != nil {
			httpjson.Internal(w, "GetRouteVariants", err)
			return
		}
		variants = append(variants, map[string]interface{}{
			"company": company, "route": route,
			"direction": direction, "service_type": serviceType,
			"orig_en": origEn, "orig_tc": origTc, "orig_sc": origSc,
			"dest_en": destEn, "dest_tc": destTc, "dest_sc": destSc,
			"data_timestamp": dataTimestamp,
		})
	}

	if !httpjson.CheckRows(w, rows, "GetRouteVariants") {
		return
	}

	httpjson.Write(w, variants)
}

// GetStopsByRouteId returns the stops of a route. company, direction and
// serviceType are optional filters; without them a route number shared by two
// operators (e.g. KMB and Citybus both run a "1") returns both operators'
// stops for every direction interleaved, which cannot be rendered as a
// sequence.
func GetStopsByRouteId(w http.ResponseWriter, r *http.Request) {
	routeId, ok := httpjson.RequiredQuery(w, r, "routeId")
	if !ok {
		return
	}
	direction := r.URL.Query().Get("direction")
	company := r.URL.Query().Get("company")
	serviceType := r.URL.Query().Get("serviceType")
	fmt.Printf("GetStopsByRouteId - RouteId: %s, Company: %s, Direction: %s, ServiceType: %s\n",
		routeId, company, direction, serviceType)

	sql, args := buildStopsByRouteQuery(routeId, company, direction, serviceType)

	rows, err := database.Query(sql, args...)
	if err != nil {
		httpjson.Internal(w, "GetStopsByRouteId", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	routeStopsWithDetails := []map[string]interface{}{}
	for rows.Next() {
		var company, route, direction, serviceType, seq, stop, nameEn, nameTc, lat, long string
		err := rows.Scan(&company, &route, &direction, &serviceType, &seq, &stop, &nameEn, &nameTc, &lat, &long)
		if err != nil {
			httpjson.Internal(w, "GetStopsByRouteId", err)
			return
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

	if !httpjson.CheckRows(w, rows, "GetStopsByRouteId") {
		return
	}

	httpjson.Write(w, routeStopsWithDetails)
}

// GetRoutesByStopId returns all routes that pass through a specific stop
func GetRoutesByStopId(w http.ResponseWriter, r *http.Request) {
	stopId, ok := httpjson.RequiredQuery(w, r, "stopId")
	if !ok {
		return
	}
	fmt.Printf("GetRoutesByStopId - StopId: %s\n", stopId)

	sql := `SELECT DISTINCT rs.company, rs.route, rs.direction, rs.service_type, rs.seq, rs.stop
		FROM route_stops rs
		WHERE rs.stop = $1
		ORDER BY rs.route, rs.direction`
	rows, err := database.Query(sql, stopId)
	if err != nil {
		httpjson.Internal(w, "GetRoutesByStopId", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	routesWithDetails := []map[string]interface{}{}
	for rows.Next() {
		var company, route, direction, serviceType, seq, stop string
		err := rows.Scan(&company, &route, &direction, &serviceType, &seq, &stop)
		if err != nil {
			httpjson.Internal(w, "GetRoutesByStopId", err)
			return
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

	if !httpjson.CheckRows(w, rows, "GetRoutesByStopId") {
		return
	}

	httpjson.Write(w, routesWithDetails)
}

// GetStopsNearby returns stops within ±0.001 lat/long from a given stop
func GetStopsNearby(w http.ResponseWriter, r *http.Request) {
	stopId, ok := httpjson.RequiredQuery(w, r, "stopId")
	if !ok {
		return
	}
	fmt.Printf("GetStopsNearby - StopId: %s\n", stopId)

	var targetLat, targetLong string
	err := database.QueryRow("SELECT lat, long FROM stops WHERE stop = $1", stopId).Scan(&targetLat, &targetLong)
	if err != nil {
		httpjson.NotFound(w, "Stop not found")
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

	// Coordinates are stored as text, so the cast is applied to every row that
	// reaches it — a single unparseable value anywhere in the table would fail
	// the whole query and take every nearby search down with it. The CTE is
	// MATERIALIZED so the filter is applied first and the cast only ever sees
	// numeric text.
	sql := `WITH numeric_stops AS MATERIALIZED (
			SELECT company, stop, name_en, name_tc, name_sc, lat, long
			FROM stops
			WHERE lat ~ '^-?[0-9]+(\.[0-9]+)?$' AND long ~ '^-?[0-9]+(\.[0-9]+)?$'
		)
		SELECT company, stop, name_en, name_tc, name_sc, lat, long
		FROM numeric_stops
		WHERE CAST(lat AS DOUBLE PRECISION) BETWEEN $1 AND $2
		AND CAST(long AS DOUBLE PRECISION) BETWEEN $3 AND $4
		ORDER BY ABS(CAST(lat AS DOUBLE PRECISION) - $5) + ABS(CAST(long AS DOUBLE PRECISION) - $6), stop`
	rows, err := database.Query(sql,
		latFloat-0.001, latFloat+0.001,
		longFloat-0.001, longFloat+0.001,
		latFloat, longFloat,
	)
	if err != nil {
		httpjson.Internal(w, "GetStopsNearby", err)
		return
	}
	defer rows.Close()

	// Non-nil so an empty result encodes as [] rather than null.
	nearbyStops := []Stop{}
	for rows.Next() {
		var stop Stop
		err := rows.Scan(&stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			httpjson.Internal(w, "GetStopsNearby", err)
			return
		}
		nearbyStops = append(nearbyStops, stop)
	}

	if !httpjson.CheckRows(w, rows, "GetStopsNearby") {
		return
	}

	httpjson.Write(w, nearbyStops)
}

// GetStopByStopId returns the stop details for a specific stopId
func GetStopByStopId(w http.ResponseWriter, r *http.Request) {
	stopId, ok := httpjson.RequiredQuery(w, r, "stopId")
	if !ok {
		return
	}
	fmt.Printf("GetStopByStopId - StopId: %s\n", stopId)

	sql := `SELECT id, company, stop, name_en, name_tc, name_sc, lat, long, data_timestamp
		FROM stops
		WHERE stop = $1`
	row := database.QueryRow(sql, stopId)

	var stop Stop
	err := row.Scan(&stop.Id, &stop.Company, &stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long, &stop.DataTimestamp)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			httpjson.NotFound(w, "Stop not found")
			return
		}
		httpjson.Internal(w, "GetStopByStopId", err)
		return
	}

	httpjson.Write(w, stop)
}

// GetRouteCount returns the total number of bus routes
func GetRouteCount(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRouteCount - Type: bus\n")
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM routes").Scan(&count)
	if err != nil {
		httpjson.Internal(w, "GetRouteCount", err)
		return
	}

	httpjson.Write(w, map[string]interface{}{
		"type":  "bus",
		"count": count,
	})
}
