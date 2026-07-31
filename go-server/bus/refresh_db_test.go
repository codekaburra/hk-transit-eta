package bus

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"hk-transit-eta/internal/testdb"
)

// withCitybusServer points the Citybus fetchers at srv and removes the pacing
// and retry backoff.
func withCitybusServer(t *testing.T, srv *httptest.Server) {
	t.Helper()
	base, interval, attempts, delay, dir :=
		citybusAPIBase, citybusStopInterval, citybusRetryAttempts, citybusRetryDelay, busCacheDir
	t.Cleanup(func() {
		citybusAPIBase, citybusStopInterval = base, interval
		citybusRetryAttempts, citybusRetryDelay, busCacheDir = attempts, delay, dir
	})
	citybusAPIBase = srv.URL
	citybusStopInterval = 0
	citybusRetryAttempts = 2
	citybusRetryDelay = time.Millisecond
	// Keep exported snapshots out of the package directory.
	busCacheDir = t.TempDir()
}

// citybusServer answers the three endpoints a Citybus refresh calls. routes
// maps a route number to the data_timestamp the API reports for it.
func citybusServer(t *testing.T, routes map[string]string, onRouteStops func(route string)) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case strings.HasPrefix(path, "/route/ctb"):
			var entries []string
			for route, ts := range routes {
				entries = append(entries, fmt.Sprintf(
					`{"co":"CTB","route":%q,"orig_en":"Origin","orig_tc":"起","orig_sc":"起",
					  "dest_en":"Dest","dest_tc":"終","dest_sc":"终","data_timestamp":%q}`, route, ts))
			}
			fmt.Fprintf(w, `{"type":"RouteList","version":"2.0",
				"generated_timestamp":"2026-07-31T00:00:00+08:00","data":[%s]}`,
				strings.Join(entries, ","))

		case strings.HasPrefix(path, "/route-stop/ctb/"):
			route := strings.Split(strings.TrimPrefix(path, "/route-stop/ctb/"), "/")[0]
			if onRouteStops != nil {
				onRouteStops(route)
			}
			// One stop per direction keeps the fixture small.
			fmt.Fprintf(w, `{"type":"RouteStop","version":"2.0",
				"generated_timestamp":"2026-07-31T00:00:00+08:00",
				"data":[{"co":"CTB","route":%q,"dir":"I","seq":1,"stop":"001026",
				         "data_timestamp":"2026-07-31T00:00:00+08:00"}]}`, route)

		case strings.HasPrefix(path, "/stop/"):
			id := strings.TrimPrefix(path, "/stop/")
			fmt.Fprintf(w, `{"type":"Stop","version":"2.0",
				"generated_timestamp":"2026-07-31T00:00:00+08:00",
				"data":{"stop":%q,"name_en":"Stop","name_tc":"站","name_sc":"站",
				        "lat":"22.28","long":"114.15",
				        "data_timestamp":"2026-07-31T00:00:00+08:00"}}`, id)

		default:
			http.NotFound(w, r)
		}
	}))
}

// An unchanged data_timestamp must not re-fetch the route's stops. This is the
// Citybus counterpart of the GMB convergence bug, where every refresh
// re-fetched everything.
func TestRefreshCitybusSkipsUnchangedRoutes(t *testing.T) {
	setupDB(t)

	routes := map[string]string{"1": "2026-07-01T05:00:00+08:00"}
	srv := citybusServer(t, routes, nil)
	defer srv.Close()
	withCitybusServer(t, srv)

	if err := refreshCitybus(); err != nil {
		t.Fatalf("first refresh: %v", err)
	}

	// Second run against the same timestamps: no route-stop fetch at all.
	var refetched []string
	srv2 := citybusServer(t, routes, func(route string) {
		refetched = append(refetched, route)
	})
	defer srv2.Close()
	withCitybusServer(t, srv2)

	if err := refreshCitybus(); err != nil {
		t.Fatalf("second refresh: %v", err)
	}
	if len(refetched) != 0 {
		t.Errorf("re-fetched %v, want nothing — the diff did not converge", refetched)
	}
}

func TestRefreshCitybusRefetchesChangedRoutes(t *testing.T) {
	setupDB(t)

	srv := citybusServer(t, map[string]string{"1": "2026-07-01T05:00:00+08:00"}, nil)
	defer srv.Close()
	withCitybusServer(t, srv)

	if err := refreshCitybus(); err != nil {
		t.Fatalf("first refresh: %v", err)
	}

	var refetched []string
	srv2 := citybusServer(t, map[string]string{"1": "2026-07-15T05:00:00+08:00"},
		func(route string) { refetched = append(refetched, route) })
	defer srv2.Close()
	withCitybusServer(t, srv2)

	if err := refreshCitybus(); err != nil {
		t.Fatalf("second refresh: %v", err)
	}
	if len(refetched) == 0 {
		t.Error("a changed data_timestamp should have re-fetched the route's stops")
	}
}

// A route the operator withdraws must be removed along with its stop sequence.
func TestRefreshCitybusRemovesWithdrawnRoutes(t *testing.T) {
	setupDB(t)

	srv := citybusServer(t, map[string]string{
		"1":  "2026-07-01T05:00:00+08:00",
		"5B": "2026-07-01T05:00:00+08:00",
	}, nil)
	defer srv.Close()
	withCitybusServer(t, srv)

	if err := refreshCitybus(); err != nil {
		t.Fatalf("first refresh: %v", err)
	}

	// 5B disappears from the route list.
	srv2 := citybusServer(t, map[string]string{"1": "2026-07-01T05:00:00+08:00"}, nil)
	defer srv2.Close()
	withCitybusServer(t, srv2)

	if err := refreshCitybus(); err != nil {
		t.Fatalf("second refresh: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "routes", "company = 'CTB' AND route = '5B'"); n != 0 {
		t.Errorf("withdrawn route still present (%d rows)", n)
	}
	if n := testdb.Count(t, db, "route_stops", "company = 'CTB' AND route = '5B'"); n != 0 {
		t.Errorf("withdrawn route still has %d stop rows", n)
	}
}

// The backfill exists because a stop referenced by route_stops but missing
// from stops is dropped by the join, leaving a hole in the sequence.
func TestBackfillCitybusStopsFillsMissingStops(t *testing.T) {
	setupDB(t)

	if err := storeRouteStops([]RouteStop{
		routeStop("CTB", "1", "O", "", "1", "001026"),
	}); err != nil {
		t.Fatalf("seeding route-stop: %v", err)
	}

	srv := citybusServer(t, map[string]string{}, nil)
	defer srv.Close()
	withCitybusServer(t, srv)

	if err := BackfillCitybusStops(); err != nil {
		t.Fatalf("BackfillCitybusStops: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "stops", "company = 'CTB' AND stop = '001026'"); n != 1 {
		t.Errorf("the referenced stop was not backfilled (%d rows)", n)
	}
}
