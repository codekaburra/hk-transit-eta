package nearby

import (
	"database/sql"
	"net/http"
	"strconv"
	"testing"

	"hk-transit-eta/bus"
	"hk-transit-eta/internal/testdb"
	"hk-transit-eta/internal/testhttp"
	"hk-transit-eta/minibus"
)

// The tables this package reads. It owns none of them — bus and minibus create
// them — so setup initialises both schemas and then empties what it touches.
var readTables = []string{"stops", "route_stops", "routes", "minibus_stop", "minibus_route_stop", "minibus_route"}

func setupDB(t *testing.T) *sql.DB {
	t.Helper()
	db := testdb.Connect(t)

	bus.SetDatabase(db)
	bus.InitBusDatabase()
	minibus.SetDatabase(db)
	minibus.InitMinibusDatabase()

	SetDatabase(db)
	InitNearbyIndexes()

	testdb.Truncate(t, db, readTables...)
	return db
}

// Central, near the ferry piers, used as the search centre throughout.
const (
	centreLat = 22.2870
	centreLon = 114.1600
)

func seedBusStop(t *testing.T, db *sql.DB, company, stop, lat, long string, routes ...string) {
	t.Helper()
	_, err := db.Exec(
		`INSERT INTO stops (company, stop, name_en, name_tc, name_sc, lat, long)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		company, stop, "Stop "+stop, "車站 "+stop, "车站 "+stop, lat, long)
	if err != nil {
		t.Fatalf("seeding stop %s: %v", stop, err)
	}
	// route_stops is unique on (company, route, direction, service_type, seq),
	// so a route repeated in the argument list is seeded as the inbound leg —
	// which is how a route genuinely appears twice at one stop.
	seen := map[string]bool{}
	for i, route := range routes {
		direction := "O"
		if seen[route] {
			direction = "I"
		}
		seen[route] = true
		_, err := db.Exec(
			`INSERT INTO route_stops (company, route, direction, service_type, seq, stop)
			 VALUES ($1, $2, $3, '1', $4, $5)`,
			company, route, direction, strconv.Itoa(i+1), stop)
		if err != nil {
			t.Fatalf("seeding route %s at %s: %v", route, stop, err)
		}
	}
}

func seedMinibusStop(t *testing.T, db *sql.DB, stopID int, lat, long float64, enabled bool, region, routeCode string) {
	t.Helper()
	if _, err := db.Exec(
		`INSERT INTO minibus_stop (stop_id, latitude, longitude, enabled) VALUES ($1, $2, $3, $4)`,
		stopID, lat, long, enabled); err != nil {
		t.Fatalf("seeding minibus stop %d: %v", stopID, err)
	}
	// A route id unique per stop is enough where the route itself is incidental.
	seedMinibusRouteAtStop(t, db, stopID, stopID, region, routeCode,
		"Minibus stop "+routeCode, "小巴站 "+routeCode)
}

// seedMinibusRouteAtStop attaches one route to an existing minibus stop, with
// the name that route gives it. Separate from seedMinibusStop because a stop
// can be named differently by each route serving it, which is the case the name
// selection has to resolve.
func seedMinibusRouteAtStop(t *testing.T, db *sql.DB, stopID, routeID int, region, routeCode, nameEn, nameTc string) {
	t.Helper()
	if _, err := db.Exec(
		`INSERT INTO minibus_route (region, route_code, route_id, route_seq) VALUES ($1, $2, $3, 1)`,
		region, routeCode, routeID); err != nil {
		t.Fatalf("seeding minibus route %s: %v", routeCode, err)
	}
	if _, err := db.Exec(
		`INSERT INTO minibus_route_stop (route_id, route_seq, stop_seq, stop_id, name_tc, name_sc, name_en)
		 VALUES ($1, 1, 1, $2, $3, $4, $5)`,
		routeID, stopID, nameTc, nameTc, nameEn); err != nil {
		t.Fatalf("seeding minibus route-stop for %d: %v", stopID, err)
	}
}

func search(t *testing.T, query string) (*Response, int) {
	t.Helper()
	var got Response
	rec := testhttp.CallJSON(t, GetStopsNearby, "/?"+query, &got)
	return &got, rec.Code
}

func TestGetStopsNearbyReturnsBothModes(t *testing.T) {
	db := setupDB(t)
	seedBusStop(t, db, "KMB", "BUS_NEAR", "22.2872", "114.1602", "1", "5X")
	seedMinibusStop(t, db, 20001, 22.2873, 114.1601, true, "HKI", "8")

	got, code := search(t, "lat=22.2870&lon=114.1600&radius=300")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200", code)
	}

	kinds := map[string]string{}
	for _, s := range got.Stops {
		kinds[s.Kind] = s.Stop
	}
	if kinds[KindBus] != "BUS_NEAR" {
		t.Errorf("bus stop = %q, want BUS_NEAR", kinds[KindBus])
	}
	if kinds[KindMinibus] != "20001" {
		t.Errorf("minibus stop = %q, want 20001", kinds[KindMinibus])
	}
}

// The radius is a circle, but the SQL prefilter is the rectangle around it. A
// stop in a corner of that rectangle is inside the box and outside the radius,
// and only the exact distance tells them apart.
func TestGetStopsNearbyExcludesTheBoxCorners(t *testing.T) {
	db := setupDB(t)
	// 300 m north and 300 m east of centre: inside the box, but 424 m from the
	// centre on the diagonal.
	seedBusStop(t, db, "KMB", "CORNER", "22.28970", "114.16292")
	seedBusStop(t, db, "KMB", "INSIDE", "22.28970", "114.16000")

	got, _ := search(t, "lat=22.2870&lon=114.1600&radius=350")

	found := map[string]bool{}
	for _, s := range got.Stops {
		found[s.Stop] = true
	}
	if !found["INSIDE"] {
		t.Error("a stop 300 m due north was not returned within a 350 m radius")
	}
	if found["CORNER"] {
		t.Error("a stop 424 m away on the diagonal was returned within a 350 m radius — the box was served as the answer")
	}
}

func TestGetStopsNearbyOrdersByTrueDistance(t *testing.T) {
	db := setupDB(t)
	// Equal offsets in degrees, but a degree of longitude is the shorter here,
	// so EAST is the nearer of the two. Ordering by |dLat| + |dLon| would call
	// them equal and leave the order to chance.
	seedBusStop(t, db, "KMB", "NORTH", "22.28880", "114.16000")
	seedBusStop(t, db, "KMB", "EAST", "22.28700", "114.16180")
	seedBusStop(t, db, "KMB", "CLOSEST", "22.28710", "114.16010")

	got, _ := search(t, "lat=22.2870&lon=114.1600&radius=500")

	if len(got.Stops) != 3 {
		t.Fatalf("got %d stops, want 3", len(got.Stops))
	}
	order := []string{got.Stops[0].Stop, got.Stops[1].Stop, got.Stops[2].Stop}
	want := []string{"CLOSEST", "EAST", "NORTH"}
	for i := range want {
		if order[i] != want[i] {
			t.Fatalf("order = %v, want %v", order, want)
		}
	}
	if got.Stops[0].DistanceM > got.Stops[1].DistanceM {
		t.Error("reported distances do not match the order")
	}
}

func TestGetStopsNearbyReportsRoutes(t *testing.T) {
	db := setupDB(t)
	seedBusStop(t, db, "KMB", "SERVED", "22.2871", "114.1601", "1", "5X", "1")
	seedBusStop(t, db, "KMB", "UNSERVED", "22.2872", "114.1602")

	got, _ := search(t, "lat=22.2870&lon=114.1600&radius=300")

	byStop := map[string][]string{}
	for _, s := range got.Stops {
		byStop[s.Stop] = s.Routes
	}
	// Duplicated in route_stops by direction and service type; the list is of
	// routes a rider can catch, so it is deduplicated.
	if len(byStop["SERVED"]) != 2 {
		t.Errorf("routes = %v, want 1 and 5X deduplicated", byStop["SERVED"])
	}
	// A stop with no routes must encode as [] rather than null, and must not
	// hold one empty string from splitting an empty aggregate.
	if byStop["UNSERVED"] == nil || len(byStop["UNSERVED"]) != 0 {
		t.Errorf("routes for an unserved stop = %#v, want an empty list", byStop["UNSERVED"])
	}
}

// Disabled minibus stops are in the data but cannot be boarded.
func TestGetStopsNearbyExcludesDisabledMinibusStops(t *testing.T) {
	db := setupDB(t)
	seedMinibusStop(t, db, 20001, 22.2871, 114.1601, true, "HKI", "8")
	seedMinibusStop(t, db, 20002, 22.2872, 114.1602, false, "HKI", "9")

	got, _ := search(t, "lat=22.2870&lon=114.1600&radius=300")

	for _, s := range got.Stops {
		if s.Stop == "20002" {
			t.Error("a disabled minibus stop was returned")
		}
	}
	if len(got.Stops) != 1 {
		t.Errorf("got %d stops, want only the enabled one", len(got.Stops))
	}
}

// Coordinates are text on the bus table, so a malformed value is a row in the
// result set rather than an error at insert time. One such row must not fail
// every search.
func TestGetStopsNearbyToleratesMalformedCoordinates(t *testing.T) {
	db := setupDB(t)
	seedBusStop(t, db, "KMB", "GOOD", "22.2871", "114.1601")
	seedBusStop(t, db, "CTB", "CORRUPT", "not-a-number", "also-not")
	seedBusStop(t, db, "CTB", "EMPTY", "", "")

	got, code := search(t, "lat=22.2870&lon=114.1600&radius=300")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200 — one bad row must not fail every search", code)
	}
	if len(got.Stops) != 1 || got.Stops[0].Stop != "GOOD" {
		t.Errorf("stops = %v, want only GOOD", got.Stops)
	}
}

func TestGetStopsNearbyEchoesTheSearch(t *testing.T) {
	setupDB(t)
	got, _ := search(t, "lat=22.2870&lon=114.1600&radius=250")

	if got.Centre.Lat != 22.2870 || got.Centre.Long != 114.1600 {
		t.Errorf("centre = %v, want the coordinates searched", got.Centre)
	}
	if got.RadiusM != 250 {
		t.Errorf("radius_m = %d, want 250", got.RadiusM)
	}
	// Non-nil so an empty result encodes as [] rather than null.
	if got.Stops == nil {
		t.Error("stops encoded as null; want an empty array")
	}
}

func TestGetStopsNearbyDefaultsTheRadius(t *testing.T) {
	setupDB(t)
	got, code := search(t, "lat=22.2870&lon=114.1600")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200 — radius is optional", code)
	}
	if got.RadiusM != defaultRadiusM {
		t.Errorf("radius_m = %d, want the default %d", got.RadiusM, defaultRadiusM)
	}
}

func TestGetStopsNearbyRejectsBadParameters(t *testing.T) {
	setupDB(t)

	cases := []struct{ name, query string }{
		{"lat is required", "lon=114.16"},
		{"lon is required", "lat=22.287"},
		{"lat must be a number", "lat=north&lon=114.16"},
		{"radius must be a number", "lat=22.287&lon=114.16&radius=far"},
		{"radius has an upper bound", "lat=22.287&lon=114.16&radius=50000"},
		{"radius has a lower bound", "lat=22.287&lon=114.16&radius=1"},
		// Swapping the pair is the mistake this catches: 114.16 is not a
		// latitude anywhere near Hong Kong.
		{"a swapped pair is rejected rather than answered empty", "lat=114.16&lon=22.287"},
		{"a coordinate outside Hong Kong is rejected", "lat=51.5&lon=114.16"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := testhttp.CallJSON(t, GetStopsNearby, "/?"+c.query, nil)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want 400", rec.Code)
			}
		})
	}
}

// A minibus stop has no name of its own, only the names the routes serving it
// give it, and those disagree. The query picks by lowest route_id — arbitrary,
// but the point is that it is decided rather than left to the join, which would
// otherwise vary between runs and rename the stop under the reader.
func TestGetStopsNearbyNamesAMinibusStopStably(t *testing.T) {
	db := setupDB(t)
	if _, err := db.Exec(
		`INSERT INTO minibus_stop (stop_id, latitude, longitude, enabled) VALUES (20001, 22.2871, 114.1601, true)`,
	); err != nil {
		t.Fatalf("seeding stop: %v", err)
	}
	// Seeded highest-first, so a query that simply took what the join offered
	// would be more likely to return the wrong one.
	seedMinibusRouteAtStop(t, db, 20001, 900, "HKI", "9", "Later name", "後來的名")
	seedMinibusRouteAtStop(t, db, 20001, 100, "HKI", "8", "Lowest route name", "最小路線的名")

	for attempt := 0; attempt < 3; attempt++ {
		got, _ := search(t, "lat=22.2870&lon=114.1600&radius=300")
		if len(got.Stops) != 1 {
			t.Fatalf("got %d stops, want the one seeded", len(got.Stops))
		}
		if got.Stops[0].NameTc != "最小路線的名" {
			t.Fatalf("name = %q, want the lowest route_id's name", got.Stops[0].NameTc)
		}
		// Both routes still reach the rider, whichever supplied the name.
		if len(got.Stops[0].Routes) != 2 {
			t.Errorf("routes = %v, want both 8 and 9", got.Stops[0].Routes)
		}
	}
}

// Two stops at the same distance are ordered by id.
//
// The tie has to span the two modes to mean anything: bus and minibus are
// separate queries whose results are appended in that order, so without the
// tie-break the bus stop wins every tie by virtue of being concatenated first,
// whatever its id. Here the minibus id sorts first, so only the tie-break can
// put it there.
func TestGetStopsNearbyBreaksDistanceTiesStably(t *testing.T) {
	db := setupDB(t)
	// Mirrored north and south of the centre: the same distance to the metre.
	seedBusStop(t, db, "KMB", "ZZZ_BUS", "22.28800", "114.16000")
	seedMinibusStop(t, db, 20001, 22.28600, 114.16000, true, "HKI", "8")

	for attempt := 0; attempt < 3; attempt++ {
		got, _ := search(t, "lat=22.2870&lon=114.1600&radius=300")
		if len(got.Stops) != 2 {
			t.Fatalf("got %d stops, want 2", len(got.Stops))
		}
		if got.Stops[0].DistanceM != got.Stops[1].DistanceM {
			t.Fatalf("the two stops are %d m and %d m apart; the fixture must place them equidistant",
				got.Stops[0].DistanceM, got.Stops[1].DistanceM)
		}
		if got.Stops[0].Stop != "20001" {
			t.Fatalf("order = %s, %s; want the id to break the tie across modes",
				got.Stops[0].Stop, got.Stops[1].Stop)
		}
	}
}

// distance_m is rounded for display while the filter runs on the unrounded
// distance, so the two disagree either side of the limit. A stop at 199.6 m is
// a result and shows as "200 m"; one at 200.4 m also rounds to 200 but is not a
// result. The rounding must not decide membership, and a stop displaying the
// radius exactly must not look like a mistake.
//
// The inclusive-or-exclusive question at exactly the radius is not asserted
// here: it is a comparison of floats that no fixture can land on reliably.
func TestGetStopsNearbyRoundsDistanceWithoutWideningTheRadius(t *testing.T) {
	db := setupDB(t)
	// JUST_OUTSIDE is placed on the diagonal deliberately. Due north the box
	// and the radius coincide, so a stop past the limit is dropped by the SQL
	// prefilter and the distance check never runs — the test would pass on the
	// box alone. On the diagonal it is inside the box and outside the circle,
	// which is the only place the distance check decides anything.
	seedBusStop(t, db, "KMB", "JUST_INSIDE", "22.2887945", "114.1600")     // 199.5 m, due north
	seedBusStop(t, db, "KMB", "JUST_OUTSIDE", "22.2882744", "114.1613773") // 200.4 m, on the diagonal

	got, _ := search(t, "lat=22.2870&lon=114.1600&radius=200")

	if len(got.Stops) != 1 {
		t.Fatalf("got %d stops, want only the one inside the radius: %v", len(got.Stops), got.Stops)
	}
	if got.Stops[0].Stop != "JUST_INSIDE" {
		t.Fatalf("stop = %s, want JUST_INSIDE", got.Stops[0].Stop)
	}
	if got.Stops[0].DistanceM != 200 {
		t.Errorf("distance_m = %d, want 200 — rounded for display", got.Stops[0].DistanceM)
	}
}

// The response spells the field "long", so a caller reading the body and
// writing the next request naturally sends long=. Rejecting that with "'lon' is
// required" names a parameter the caller believes it supplied.
func TestGetStopsNearbyAcceptsEitherSpellingOfLongitude(t *testing.T) {
	db := setupDB(t)
	seedBusStop(t, db, "KMB", "BUS_NEAR", "22.2872", "114.1602", "1")

	for _, query := range []string{
		"lat=22.2870&lon=114.1600&radius=300",
		"lat=22.2870&long=114.1600&radius=300",
	} {
		got, code := search(t, query)
		if code != http.StatusOK {
			t.Fatalf("%s: status = %d, want 200", query, code)
		}
		if len(got.Stops) != 1 {
			t.Fatalf("%s: got %d stops, want the one seeded", query, len(got.Stops))
		}
		if got.Centre.Long != 114.1600 {
			t.Errorf("%s: centre long = %v, want 114.16", query, got.Centre.Long)
		}
	}
}

// A longitude out of range must still be reported against the name the caller
// used, or the message points at a parameter that is not in the request.
func TestGetStopsNearbyNamesTheLongitudeTheCallerSent(t *testing.T) {
	setupDB(t)

	_, code := search(t, "lat=22.2870&long=140.0")
	if code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", code)
	}
}
