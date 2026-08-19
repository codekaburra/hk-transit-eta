// Package nearby answers "what can I catch from here" for a pair of
// coordinates, across every mode the database holds.
//
// The bus package already has GetStopsNearby, but it is keyed by an existing
// stop: it looks that stop up to get a centre, then searches a fixed box around
// it. That cannot serve a free coordinate, and the fixed box is not a radius —
// callers here choose how far to look.
//
// Bus and minibus stops live in different tables, with different column types
// and different ideas of where a stop's name lives, so the two are queried
// separately and merged in Go rather than unioned in SQL.
package nearby

import (
	"database/sql"
	"fmt"
	"net/http"
	"sort"
	"strconv"

	"hk-transit-eta/internal/httpjson"
)

var database *sql.DB

// SetDatabase sets the database connection for the nearby package.
func SetDatabase(db *sql.DB) {
	database = db
}

// Kind distinguishes the modes in a merged list, since a bus stop id and a
// minibus stop id say nothing about which is which.
const (
	KindBus     = "bus"
	KindMinibus = "minibus"
)

// Stop is one result. Coordinates are numbers here even though the bus table
// stores them as text: a client that has to parse them before it can plot them
// is being handed the same problem twice.
type Stop struct {
	Kind string `json:"kind"`
	// Company is the operator for a bus stop (KMB, CTB) and the region for a
	// minibus stop (HKI, KLN, NT), which is how the minibus data identifies it.
	Company   string   `json:"company"`
	Stop      string   `json:"stop"`
	NameEn    string   `json:"name_en"`
	NameTc    string   `json:"name_tc"`
	Lat       float64  `json:"lat"`
	Long      float64  `json:"long"`
	DistanceM int      `json:"distance_m"`
	Routes    []string `json:"routes"`
}

// Response is the response body.
type Response struct {
	// Centre echoes the coordinates that were searched, so a client rendering a
	// map does not have to keep them in step itself.
	Centre  Centre `json:"centre"`
	RadiusM int    `json:"radius_m"`
	Stops   []Stop `json:"stops"`
}

type Centre struct {
	Lat  float64 `json:"lat"`
	Long float64 `json:"long"`
}

// Hong Kong plus its waters. A coordinate outside this is a caller mistake —
// a swapped lat/long pair lands in the Arabian Sea, and answering it with an
// empty list looks like "no stops near you" rather than "you asked wrong".
const (
	minLat, maxLat = 22.10, 22.60
	minLon, maxLon = 113.80, 114.45
)

// Radius bounds. The lower bound keeps a search from being pointlessly empty;
// the upper one bounds the scan, since the bounding box below is the only thing
// standing between this and a full table scan.
const (
	minRadiusM     = 50
	maxRadiusM     = 2000
	defaultRadiusM = 500
)

// GetStopsNearby serves GET /api/stops/nearby.
func GetStopsNearby(w http.ResponseWriter, r *http.Request) {
	lat, ok := floatQuery(w, r, "lat", minLat, maxLat)
	if !ok {
		return
	}
	lon, ok := floatQuery(w, r, "lon", minLon, maxLon)
	if !ok {
		return
	}

	radius := defaultRadiusM
	if raw := r.URL.Query().Get("radius"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			httpjson.BadRequest(w, "Query parameter 'radius' must be a number")
			return
		}
		if parsed < minRadiusM || parsed > maxRadiusM {
			httpjson.BadRequest(w, fmt.Sprintf(
				"Query parameter 'radius' must be between %d and %d metres", minRadiusM, maxRadiusM))
			return
		}
		radius = parsed
	}

	box := boundingBox(lat, lon, float64(radius))

	stops, err := busStopsIn(box, lat, lon, radius)
	if err != nil {
		httpjson.Internal(w, "GetStopsNearby bus", err)
		return
	}
	minibusStops, err := minibusStopsIn(box, lat, lon, radius)
	if err != nil {
		httpjson.Internal(w, "GetStopsNearby minibus", err)
		return
	}
	stops = append(stops, minibusStops...)

	// Merged from two queries, so the ordering has to be reapplied. Ties broken
	// by id, otherwise two stops at the same distance swap places between
	// requests and the list appears to shuffle on its own.
	sort.Slice(stops, func(i, j int) bool {
		if stops[i].DistanceM != stops[j].DistanceM {
			return stops[i].DistanceM < stops[j].DistanceM
		}
		return stops[i].Stop < stops[j].Stop
	})

	httpjson.Write(w, Response{
		Centre:  Centre{Lat: lat, Long: lon},
		RadiusM: radius,
		Stops:   stops,
	})
}

func floatQuery(w http.ResponseWriter, r *http.Request, name string, min, max float64) (float64, bool) {
	raw, ok := httpjson.RequiredQuery(w, r, name)
	if !ok {
		return 0, false
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		httpjson.BadRequest(w, "Query parameter '"+name+"' must be a number")
		return 0, false
	}
	if value < min || value > max {
		httpjson.BadRequest(w, fmt.Sprintf(
			"Query parameter '%s' must be between %g and %g — outside Hong Kong", name, min, max))
		return 0, false
	}
	return value, true
}
