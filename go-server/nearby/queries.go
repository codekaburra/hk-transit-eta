package nearby

import (
	"strconv"
	"strings"
)

// The route lists are aggregated as one delimited string rather than a SQL
// array: scanning text[] through database/sql needs a driver-specific Scanner,
// and the project's driver is pgx without the array helpers. Route codes are
// alphanumeric, so the delimiter cannot appear inside one.
const routeSep = ","

// busNearbySQL returns the bus stops inside a bounding box, with the routes
// serving each.
//
// The box is a prefilter, not the answer: it is a rectangle around a circle, so
// its corners hold stops further from the centre than the radius. Those are
// dropped by the exact distance in Go.
//
// Coordinates are stored as text, so the cast is applied to every row that
// reaches it — a single unparseable value anywhere in the table would fail the
// whole query and take every search down with it. The CTE is MATERIALIZED so
// the regex filter runs first and the cast only ever sees numeric text. This is
// the same hazard bus.GetStopsNearby documents.
const busNearbySQL = `
	WITH numeric_stops AS MATERIALIZED (
		SELECT company, stop, name_en, name_tc,
		       CAST(lat AS DOUBLE PRECISION) AS lat,
		       CAST(long AS DOUBLE PRECISION) AS long
		FROM stops
		WHERE lat ~ '^-?[0-9]+(\.[0-9]+)?$' AND long ~ '^-?[0-9]+(\.[0-9]+)?$'
	)
	SELECT s.company, s.stop, s.name_en, s.name_tc, s.lat, s.long,
	       COALESCE(STRING_AGG(DISTINCT rs.route, ',' ORDER BY rs.route), '') AS routes
	FROM numeric_stops s
	LEFT JOIN route_stops rs ON rs.stop = s.stop AND rs.company = s.company
	WHERE s.lat BETWEEN $1 AND $2 AND s.long BETWEEN $3 AND $4
	GROUP BY s.company, s.stop, s.name_en, s.name_tc, s.lat, s.long`

func busStopsIn(b box, lat, lon float64, radiusM int) ([]Stop, error) {
	rows, err := database.Query(busNearbySQL, b.minLat, b.maxLat, b.minLon, b.maxLon)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stops := []Stop{}
	for rows.Next() {
		var s Stop
		var routes string
		if err := rows.Scan(&s.Company, &s.Stop, &s.NameEn, &s.NameTc, &s.Lat, &s.Long, &routes); err != nil {
			return nil, err
		}
		s.Kind = KindBus
		s.Routes = splitRoutes(routes)
		if !within(&s, lat, lon, radiusM) {
			continue
		}
		stops = append(stops, s)
	}
	return stops, rows.Err()
}

// minibusNearbySQL returns the minibus stops inside a bounding box.
//
// A minibus stop carries no name of its own: minibus_stop holds coordinates
// only, and the names live on minibus_route_stop, once per route serving the
// stop. Those can disagree, since each route describes the stop in its own
// terms, so one is picked by lowest route_id — an arbitrary choice, but a
// stable one, where letting the join decide would vary between runs.
//
// Disabled stops are excluded: they are in the data but are not places anyone
// can board.
const minibusNearbySQL = `
	SELECT s.stop_id, s.latitude, s.longitude,
	       COALESCE(MIN(n.name_en), ''), COALESCE(MIN(n.name_tc), ''), COALESCE(MIN(n.region), ''),
	       COALESCE(STRING_AGG(DISTINCT r.route_code, ',' ORDER BY r.route_code), '') AS routes
	FROM minibus_stop s
	LEFT JOIN LATERAL (
		SELECT rs.name_en, rs.name_tc, mr.region
		FROM minibus_route_stop rs
		JOIN minibus_route mr ON mr.route_id = rs.route_id AND mr.route_seq = rs.route_seq
		WHERE rs.stop_id = s.stop_id
		ORDER BY rs.route_id, rs.route_seq
		LIMIT 1
	) n ON TRUE
	LEFT JOIN minibus_route_stop mrs ON mrs.stop_id = s.stop_id
	LEFT JOIN minibus_route r ON r.route_id = mrs.route_id AND r.route_seq = mrs.route_seq
	WHERE s.enabled
	  AND s.latitude BETWEEN $1 AND $2
	  AND s.longitude BETWEEN $3 AND $4
	GROUP BY s.stop_id, s.latitude, s.longitude`

func minibusStopsIn(b box, lat, lon float64, radiusM int) ([]Stop, error) {
	rows, err := database.Query(minibusNearbySQL, b.minLat, b.maxLat, b.minLon, b.maxLon)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stops := []Stop{}
	for rows.Next() {
		var s Stop
		var stopID int
		var routes string
		if err := rows.Scan(&stopID, &s.Lat, &s.Long, &s.NameEn, &s.NameTc, &s.Company, &routes); err != nil {
			return nil, err
		}
		s.Kind = KindMinibus
		s.Stop = strconv.Itoa(stopID)
		s.Routes = splitRoutes(routes)
		if !within(&s, lat, lon, radiusM) {
			continue
		}
		stops = append(stops, s)
	}
	return stops, rows.Err()
}

// within reports whether a stop is inside the radius, setting its distance as a
// side effect so the caller does not compute it twice.
func within(s *Stop, lat, lon float64, radiusM int) bool {
	d := distanceM(lat, lon, s.Lat, s.Long)
	if d > float64(radiusM) {
		return false
	}
	s.DistanceM = int(d + 0.5)
	return true
}

// splitRoutes turns the aggregate into a list. STRING_AGG over no rows yields
// the empty string, which would otherwise split into a one-element list holding
// "" — a stop that appears to be served by a route with no name.
func splitRoutes(agg string) []string {
	if agg == "" {
		return []string{}
	}
	return strings.Split(agg, routeSep)
}
