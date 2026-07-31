package bus

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// stopAt places a stop at explicit coordinates. They are stored as text, which
// is why the query has to cast and the handler has to parse.
func stopAt(company, id, lat, long string) Stop {
	return Stop{
		Company: company, Stop: id,
		NameEn: "Stop " + id, NameTc: "車站 " + id, NameSc: "车站 " + id,
		Lat: lat, Long: long,
	}
}

func TestGetStopsNearby(t *testing.T) {
	setupDB(t)

	// The handler searches a +/-0.001 box around the target.
	if err := storeStops([]Stop{
		stopAt("KMB", "CENTRE", "22.300000", "114.200000"),
		stopAt("KMB", "NEAR", "22.300500", "114.200500"),    // inside
		stopAt("KMB", "EDGE", "22.301000", "114.200000"),    // exactly on the edge
		stopAt("KMB", "OUTSIDE", "22.310000", "114.200000"), // well outside
	}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	var got []Stop
	rec := callJSON(t, GetStopsNearby, "/?stopId=CENTRE", &got)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	found := map[string]bool{}
	for _, s := range got {
		found[s.Stop] = true
	}

	if !found["NEAR"] {
		t.Error("a stop inside the box was not returned")
	}
	if found["OUTSIDE"] {
		t.Error("a stop outside the box was returned")
	}
	// The target itself falls inside its own box; the client filters it out.
	if !found["CENTRE"] {
		t.Error("the target stop should be within its own search box")
	}
}

// Results are ordered by distance, so the nearest stop comes first — the list
// is rendered in order without further sorting.
func TestGetStopsNearbyOrdersByDistance(t *testing.T) {
	setupDB(t)
	if err := storeStops([]Stop{
		stopAt("KMB", "CENTRE", "22.300000", "114.200000"),
		stopAt("KMB", "FAR", "22.300900", "114.200000"),
		stopAt("KMB", "CLOSE", "22.300100", "114.200000"),
	}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	var got []Stop
	callJSON(t, GetStopsNearby, "/?stopId=CENTRE", &got)

	if len(got) < 3 {
		t.Fatalf("got %d stops, want all 3 within the box", len(got))
	}
	// CENTRE is at distance zero, then CLOSE, then FAR.
	if got[0].Stop != "CENTRE" || got[1].Stop != "CLOSE" || got[2].Stop != "FAR" {
		t.Errorf("order = %s, %s, %s; want CENTRE, CLOSE, FAR",
			got[0].Stop, got[1].Stop, got[2].Stop)
	}
}

func TestGetStopsNearbyErrors(t *testing.T) {
	setupDB(t)

	t.Run("stopId is required", func(t *testing.T) {
		rec := callJSON(t, GetStopsNearby, "/", nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("an unknown stop is a 404", func(t *testing.T) {
		rec := callJSON(t, GetStopsNearby, "/?stopId=NOPE", nil)
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})

	// Coordinates are stored as text, so a malformed value reaches the handler
	// rather than being rejected by the column type.
	t.Run("a malformed latitude on the target is reported, not rendered", func(t *testing.T) {
		if err := storeStops([]Stop{stopAt("KMB", "BAD_LAT", "not-a-number", "114.2")}); err != nil {
			t.Fatalf("seeding: %v", err)
		}
		rec := callJSON(t, GetStopsNearby, "/?stopId=BAD_LAT", nil)
		if rec.Code == http.StatusOK {
			t.Error("a stop with an unparseable latitude should not return results")
		}
	})
}

// The query casts every row it reaches, so one unparseable coordinate anywhere
// in the table would fail the cast and take every nearby search down with it —
// not just searches for the offending stop.
func TestGetStopsNearbyToleratesMalformedCoordinatesElsewhere(t *testing.T) {
	setupDB(t)
	if err := storeStops([]Stop{
		stopAt("KMB", "CENTRE", "22.300000", "114.200000"),
		stopAt("KMB", "NEAR", "22.300500", "114.200500"),
		// Unrelated to the search, and far from it, but in the same table.
		stopAt("CTB", "CORRUPT", "not-a-number", "also-not-a-number"),
		stopAt("CTB", "EMPTY_COORDS", "", ""),
	}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	var got []Stop
	rec := callJSON(t, GetStopsNearby, "/?stopId=CENTRE", &got)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 — one bad row must not fail every search", rec.Code)
	}
	found := map[string]bool{}
	for _, s := range got {
		found[s.Stop] = true
	}
	if !found["NEAR"] {
		t.Error("the valid nearby stop was not returned")
	}
	if found["CORRUPT"] || found["EMPTY_COORDS"] {
		t.Error("a stop with unparseable coordinates was returned as a result")
	}
}

// assertEmptyJSONArray checks the response is exactly an empty array with a
// 200, rather than merely "not null" — which a 500 or an object would pass.
func assertEmptyJSONArray(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if body := rec.Body.String(); body != "[]\n" {
		t.Errorf("body = %q, want exactly an empty JSON array", body)
	}
}

func TestGetRoutesByStopId(t *testing.T) {
	setupDB(t)
	if err := storeStops([]Stop{stop("KMB", "SHARED"), stop("KMB", "OTHER")}); err != nil {
		t.Fatalf("seeding stops: %v", err)
	}
	if err := storeRouteStops([]RouteStop{
		routeStop("KMB", "1", "O", "1", "5", "SHARED"),
		routeStop("KMB", "2", "O", "1", "3", "SHARED"),
		routeStop("KMB", "3", "O", "1", "1", "OTHER"),
	}); err != nil {
		t.Fatalf("seeding route-stops: %v", err)
	}

	t.Run("returns only the routes serving the stop", func(t *testing.T) {
		var got []map[string]interface{}
		callJSON(t, GetRoutesByStopId, "/?stopId=SHARED", &got)

		if len(got) != 2 {
			t.Fatalf("got %d routes, want the 2 serving SHARED", len(got))
		}
		for _, r := range got {
			if r["route"] == "3" {
				t.Error("returned a route that does not serve the stop")
			}
		}
	})

	t.Run("stopId is required", func(t *testing.T) {
		rec := callJSON(t, GetRoutesByStopId, "/", nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("an unserved stop yields exactly an empty array", func(t *testing.T) {
		assertEmptyJSONArray(t, callJSON(t, GetRoutesByStopId, "/?stopId=NOBODY", nil))
	})
}

func TestBusGetRouteCount(t *testing.T) {
	setupDB(t)
	if err := storeRoutes([]Route{
		route("KMB", "1", "O", "1"),
		route("KMB", "1", "I", "1"),
		route("CTB", "1", "", ""),
	}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	var got map[string]interface{}
	callJSON(t, GetRouteCount, "/", &got)

	if got["type"] != "bus" {
		t.Errorf("type = %v, want bus", got["type"])
	}
	if got["count"].(float64) != 3 {
		t.Errorf("count = %v, want 3", got["count"])
	}
}
