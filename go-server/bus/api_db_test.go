package bus

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// callJSON invokes a handler and decodes its JSON body.
func callJSON(t *testing.T, h http.HandlerFunc, target string, out interface{}) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodGet, target, nil))
	if out != nil && rec.Code == http.StatusOK {
		if err := json.NewDecoder(rec.Body).Decode(out); err != nil {
			t.Fatalf("decoding response for %s: %v", target, err)
		}
	}
	return rec
}

// seedTwoOperatorRoute sets up route "1" as both KMB (two directions) and CTB,
// which is the real shape that made the route page render four interleaved
// sequences as one list.
func seedTwoOperatorRoute(t *testing.T) {
	t.Helper()
	if err := storeRoutes([]Route{
		route("KMB", "1", "O", "1"),
		route("KMB", "1", "I", "1"),
		route("CTB", "1", "", ""),
	}); err != nil {
		t.Fatalf("seeding routes: %v", err)
	}
	if err := storeStops([]Stop{
		stop("KMB", "K1"), stop("KMB", "K2"), stop("CTB", "C1"),
	}); err != nil {
		t.Fatalf("seeding stops: %v", err)
	}
	if err := storeRouteStops([]RouteStop{
		routeStop("KMB", "1", "O", "1", "1", "K1"),
		routeStop("KMB", "1", "O", "1", "2", "K2"),
		routeStop("KMB", "1", "I", "1", "1", "K2"),
		routeStop("CTB", "1", "O", "", "1", "C1"),
	}); err != nil {
		t.Fatalf("seeding route-stops: %v", err)
	}
}

func TestGetStopsByRouteIdFilters(t *testing.T) {
	setupDB(t)
	seedTwoOperatorRoute(t)

	cases := []struct {
		name   string
		target string
		want   int
	}{
		{"unfiltered returns every operator and direction", "/?routeId=1", 4},
		{"company narrows to one operator", "/?routeId=1&company=KMB", 3},
		{"company and direction give one sequence", "/?routeId=1&company=KMB&direction=O", 2},
		{"the opposite direction is reachable", "/?routeId=1&company=KMB&direction=I", 1},
		{"the other operator is unaffected", "/?routeId=1&company=CTB", 1},
		{"an unknown route yields nothing", "/?routeId=NOPE", 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var got []map[string]interface{}
			rec := callJSON(t, GetStopsByRouteId, tc.target, &got)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", rec.Code)
			}
			if len(got) != tc.want {
				t.Errorf("got %d stops, want %d", len(got), tc.want)
			}
		})
	}
}

// seq is stored as text, so ordering has to cast it — otherwise stop 10 sorts
// between 1 and 2.
func TestGetStopsByRouteIdOrdersSequenceNumerically(t *testing.T) {
	setupDB(t)
	if err := storeStops([]Stop{
		stop("KMB", "S1"), stop("KMB", "S2"), stop("KMB", "S10"),
	}); err != nil {
		t.Fatalf("seeding stops: %v", err)
	}
	if err := storeRouteStops([]RouteStop{
		routeStop("KMB", "1", "O", "1", "10", "S10"),
		routeStop("KMB", "1", "O", "1", "2", "S2"),
		routeStop("KMB", "1", "O", "1", "1", "S1"),
	}); err != nil {
		t.Fatalf("seeding route-stops: %v", err)
	}

	var got []map[string]interface{}
	callJSON(t, GetStopsByRouteId, "/?routeId=1&company=KMB&direction=O", &got)

	var seqs []string
	for _, s := range got {
		seqs = append(seqs, s["seq"].(string))
	}
	want := []string{"1", "2", "10"}
	for i := range want {
		if i >= len(seqs) || seqs[i] != want[i] {
			t.Fatalf("sequence order = %v, want %v", seqs, want)
		}
	}
}

// A stop with no details must stay in the sequence. An inner join dropped it
// silently, so Citybus 50M rendered 19 stops numbered 1 to 20 — stop 003759 has
// no published details.
func TestGetStopsByRouteIdKeepsStopsWithoutDetails(t *testing.T) {
	setupDB(t)
	if err := storeStops([]Stop{stop("CTB", "001026")}); err != nil {
		t.Fatalf("seeding stops: %v", err)
	}
	// Deliberately no stops row for 003759.
	if err := storeRouteStops([]RouteStop{
		routeStop("CTB", "50M", "O", "", "1", "001026"),
		routeStop("CTB", "50M", "O", "", "2", "003759"),
	}); err != nil {
		t.Fatalf("seeding route-stops: %v", err)
	}

	var got []map[string]interface{}
	callJSON(t, GetStopsByRouteId, "/?routeId=50M&company=CTB", &got)

	if len(got) != 2 {
		t.Fatalf("got %d stops, want both — the one without details must not be dropped", len(got))
	}
	missing := got[1]
	if missing["stop"] != "003759" {
		t.Fatalf("second stop = %v, want 003759", missing["stop"])
	}
	// Empty rather than null, so the client can fall back to the stop id.
	for _, field := range []string{"name_en", "name_tc", "lat", "long"} {
		if missing[field] != "" {
			t.Errorf("%s = %v, want an empty string for a stop with no details", field, missing[field])
		}
	}
}

func TestGetStopsByRouteIdRequiresRouteId(t *testing.T) {
	setupDB(t)
	rec := callJSON(t, GetStopsByRouteId, "/", nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 when routeId is absent", rec.Code)
	}
}

// An empty result must encode as [] — null would break clients that map over
// the response.
func TestGetStopsByRouteIdEncodesEmptyAsArray(t *testing.T) {
	setupDB(t)
	rec := callJSON(t, GetStopsByRouteId, "/?routeId=NOPE", nil)
	if body := rec.Body.String(); body != "[]\n" {
		t.Errorf("body = %q, want an empty JSON array", body)
	}
}

func TestGetRouteVariants(t *testing.T) {
	setupDB(t)
	seedTwoOperatorRoute(t)

	t.Run("returns one entry per direction, outbound first", func(t *testing.T) {
		var got []map[string]interface{}
		callJSON(t, GetRouteVariants, "/?routeId=1&company=KMB", &got)

		if len(got) != 2 {
			t.Fatalf("got %d variants, want one per direction", len(got))
		}
		if got[0]["direction"] != "O" || got[1]["direction"] != "I" {
			t.Errorf("order = %v then %v, want outbound before inbound",
				got[0]["direction"], got[1]["direction"])
		}
	})

	t.Run("without a company both operators are returned", func(t *testing.T) {
		var got []map[string]interface{}
		callJSON(t, GetRouteVariants, "/?routeId=1", &got)
		if len(got) != 3 {
			t.Errorf("got %d variants, want all 3 across both operators", len(got))
		}
	})

	t.Run("matches the route exactly, not as a prefix", func(t *testing.T) {
		if err := storeRoutes([]Route{route("KMB", "1A", "O", "1")}); err != nil {
			t.Fatalf("seeding 1A: %v", err)
		}
		var got []map[string]interface{}
		callJSON(t, GetRouteVariants, "/?routeId=1&company=KMB", &got)
		for _, v := range got {
			if v["route"] != "1" {
				t.Errorf("returned route %v; the lookup must be exact", v["route"])
			}
		}
	})

	t.Run("an unknown route yields an empty array", func(t *testing.T) {
		rec := callJSON(t, GetRouteVariants, "/?routeId=NOPE", nil)
		if body := rec.Body.String(); body != "[]\n" {
			t.Errorf("body = %q, want an empty JSON array", body)
		}
	})

	t.Run("requires routeId", func(t *testing.T) {
		rec := callJSON(t, GetRouteVariants, "/", nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})
}

// Search is case-insensitive: Postgres LIKE is case-sensitive, unlike the
// SQLite the queries were originally written against.
func TestSearchRoutesIsCaseInsensitive(t *testing.T) {
	setupDB(t)
	r := route("KMB", "1", "O", "1")
	r.OrigEn = "Central"
	if err := storeRoutes([]Route{r}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	for _, q := range []string{"central", "CENTRAL", "Central"} {
		var got []Route
		callJSON(t, SearchRoutes, "/?q="+url.QueryEscape(q), &got)
		if len(got) != 1 {
			t.Errorf("q=%q returned %d routes, want 1", q, len(got))
		}
	}
}

func TestSearchStopsIsCaseInsensitive(t *testing.T) {
	setupDB(t)
	s := stop("KMB", "A1")
	s.NameEn = "Star Ferry"
	if err := storeStops([]Stop{s}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	for _, q := range []string{"star ferry", "STAR FERRY", "Star Ferry"} {
		var got []Stop
		callJSON(t, SearchStops, "/?q="+url.QueryEscape(q), &got)
		if len(got) != 1 {
			t.Errorf("q=%q returned %d stops, want 1", q, len(got))
		}
	}
}

func TestGetStopByStopId(t *testing.T) {
	setupDB(t)
	if err := storeStops([]Stop{stop("KMB", "A1")}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	t.Run("returns the stop", func(t *testing.T) {
		var got Stop
		callJSON(t, GetStopByStopId, "/?stopId=A1", &got)
		if got.Stop != "A1" {
			t.Errorf("stop = %q, want A1", got.Stop)
		}
	})

	t.Run("unknown stop is a 404", func(t *testing.T) {
		rec := callJSON(t, GetStopByStopId, "/?stopId=NOPE", nil)
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})
}
