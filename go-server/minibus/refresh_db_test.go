package minibus

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"hk-transit-eta/internal/syncmeta"
	"hk-transit-eta/internal/testdb"
)

var minibusTables = []string{
	"minibus_headway", "minibus_route_stop", "minibus_route", "minibus_stop",
}

func setupDB(t *testing.T) {
	t.Helper()
	db := testdb.Connect(t)
	SetDatabase(db)
	InitMinibusDatabase()
	if err := syncmeta.Init(db); err != nil {
		t.Fatalf("syncmeta.Init: %v", err)
	}
	testdb.Truncate(t, db, minibusTables...)
}

// withGMBServer points the fetcher at srv and removes the request pacing.
func withGMBServer(t *testing.T, srv *httptest.Server) {
	t.Helper()
	base, interval, dir := gmbAPIBase, gmbRequestInterval, snapshotDir
	t.Cleanup(func() {
		gmbAPIBase, gmbRequestInterval, snapshotDir = base, interval, dir
	})
	gmbAPIBase = srv.URL
	gmbRequestInterval = 0
	// Keep the exported snapshot out of the package directory.
	snapshotDir = t.TempDir()
}

// gmbServer answers the endpoints Refresh calls. routeCodes is per region, and
// lastUpdate maps route_id to the timestamp the API reports.
func gmbServer(t *testing.T, routeCodes map[string][]string, lastUpdate map[int]string,
	detail func(region, code string) string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case strings.HasPrefix(path, "/last-update/route"):
			var entries []string
			for id, ts := range lastUpdate {
				entries = append(entries, fmt.Sprintf(`{"route_id":%d,"last_update_date":%q}`, id, ts))
			}
			fmt.Fprintf(w, `{"type":"Last-Update","version":"1.0",
				"generated_timestamp":"2026-07-31T00:00:00+08:00",
				"data":[%s]}`, strings.Join(entries, ","))

		case strings.HasPrefix(path, "/route-stop/"):
			fmt.Fprint(w, `{"type":"Route-Stop","version":"1.0",
				"generated_timestamp":"2026-07-31T00:00:00+08:00",
				"data":{"route_stops":[],"data_timestamp":"2026-07-31T00:00:00+08:00"}}`)

		case strings.HasPrefix(path, "/route/"):
			parts := strings.Split(strings.TrimPrefix(path, "/route/"), "/")
			if len(parts) == 1 { // region listing
				var quoted []string
				for _, c := range routeCodes[parts[0]] {
					quoted = append(quoted, fmt.Sprintf("%q", c))
				}
				fmt.Fprintf(w, `{"type":"Routes-Regional","version":"1.0",
					"generated_timestamp":"2026-07-31T00:00:00+08:00",
					"data":{"routes":[%s],"data_timestamp":"2026-07-31T00:00:00+08:00"}}`,
					strings.Join(quoted, ","))
				return
			}
			fmt.Fprint(w, detail(parts[0], parts[1]))

		case strings.HasPrefix(path, "/stop/"):
			fmt.Fprint(w, `{"type":"Stop","version":"1.0",
				"generated_timestamp":"2026-07-31T00:00:00+08:00",
				"data":{"coordinates":{"wgs84":{"latitude":22.3,"longitude":114.2},
				"hk80":{"latitude":812000,"longitude":832000}},"enabled":true,
				"data_timestamp":"2026-07-31T00:00:00+08:00"}}`)

		default:
			http.NotFound(w, r)
		}
	}))
}

func routeDetail(routeID int, description string) string {
	return fmt.Sprintf(`{"type":"Route","version":"1.0",
		"generated_timestamp":"2026-07-31T00:00:00+08:00",
		"data":[{"route_id":%d,"description_tc":%q,"description_sc":%q,"description_en":%q,
		"data_timestamp":"2026-07-31T00:00:00+08:00",
		"directions":[{"route_seq":1,"orig_tc":"起","orig_sc":"起","orig_en":"Orig",
		"dest_tc":"終","dest_sc":"终","dest_en":"Dest",
		"data_timestamp":"2026-07-31T00:00:00+08:00","headways":[]}]}]}`,
		routeID, description, description, description)
}

// The diff must converge: a second refresh with unchanged upstream data has to
// fetch nothing. Comparing against the route detail's own timestamp instead of
// the stored last_update_date made every run re-fetch all ~569 routes.
func TestRefreshConvergesWhenNothingChanged(t *testing.T) {
	setupDB(t)

	lastUpdate := map[int]string{101: "2026-07-01T00:00:00+00:00"}
	srv := gmbServer(t,
		map[string][]string{"HKI": {"1"}, "KLN": nil, "NT": nil},
		lastUpdate,
		func(region, code string) string { return routeDetail(101, "first") })
	defer srv.Close()
	withGMBServer(t, srv)

	if err := Refresh(); err != nil {
		t.Fatalf("first Refresh: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "minibus_route", "route_id = 101"); n != 1 {
		t.Fatalf("route not stored by the first refresh (%d rows)", n)
	}
	var stored string
	if err := db.QueryRow(
		`SELECT COALESCE(last_update_date,'') FROM minibus_route WHERE route_id = 101`).
		Scan(&stored); err != nil {
		t.Fatalf("reading last_update_date: %v", err)
	}
	if stored != lastUpdate[101] {
		t.Fatalf("stored last_update_date = %q, want the upstream value %q — "+
			"without it the next diff cannot converge", stored, lastUpdate[101])
	}

	// Second run: upstream unchanged, so nothing should be re-fetched.
	var detailCalls int
	srv2 := gmbServer(t,
		map[string][]string{"HKI": {"1"}, "KLN": nil, "NT": nil},
		lastUpdate,
		func(region, code string) string {
			detailCalls++
			return routeDetail(101, "first")
		})
	defer srv2.Close()
	withGMBServer(t, srv2)

	if err := Refresh(); err != nil {
		t.Fatalf("second Refresh: %v", err)
	}
	if detailCalls != 0 {
		t.Errorf("second refresh fetched %d route details, want 0 — the diff did not converge", detailCalls)
	}
}

// A changed last_update_date must trigger a re-fetch of exactly that route.
func TestRefreshRefetchesChangedRoutes(t *testing.T) {
	setupDB(t)

	srv := gmbServer(t,
		map[string][]string{"HKI": {"1"}, "KLN": nil, "NT": nil},
		map[int]string{101: "2026-07-01T00:00:00+00:00"},
		func(region, code string) string { return routeDetail(101, "before") })
	defer srv.Close()
	withGMBServer(t, srv)

	if err := Refresh(); err != nil {
		t.Fatalf("first Refresh: %v", err)
	}

	// Upstream publishes a newer timestamp and new content.
	srv2 := gmbServer(t,
		map[string][]string{"HKI": {"1"}, "KLN": nil, "NT": nil},
		map[int]string{101: "2026-07-15T00:00:00+00:00"},
		func(region, code string) string { return routeDetail(101, "after") })
	defer srv2.Close()
	withGMBServer(t, srv2)

	if err := Refresh(); err != nil {
		t.Fatalf("second Refresh: %v", err)
	}

	db := testdb.Connect(t)
	var description string
	if err := db.QueryRow(
		`SELECT description_en FROM minibus_route WHERE route_id = 101`).Scan(&description); err != nil {
		t.Fatalf("reading description: %v", err)
	}
	if description != "after" {
		t.Errorf("description = %q, want the refreshed value", description)
	}
}

// A route the operator has withdrawn must be removed, along with its children.
func TestRefreshRemovesWithdrawnRoutes(t *testing.T) {
	setupDB(t)

	srv := gmbServer(t,
		map[string][]string{"HKI": {"1"}, "KLN": nil, "NT": nil},
		map[int]string{101: "2026-07-01T00:00:00+00:00"},
		func(region, code string) string { return routeDetail(101, "doomed") })
	defer srv.Close()
	withGMBServer(t, srv)

	if err := Refresh(); err != nil {
		t.Fatalf("first Refresh: %v", err)
	}

	// The route code disappears from the region listing.
	srv2 := gmbServer(t,
		map[string][]string{"HKI": nil, "KLN": nil, "NT": nil},
		map[int]string{},
		func(region, code string) string { return routeDetail(101, "doomed") })
	defer srv2.Close()
	withGMBServer(t, srv2)

	if err := Refresh(); err != nil {
		t.Fatalf("second Refresh: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "minibus_route", "route_id = 101"); n != 0 {
		t.Errorf("withdrawn route still present (%d rows)", n)
	}
}

// The GMB API rejects rapid back-to-back requests with HTTP 403, so calls are
// paced. Guard the interval against being reset to zero.
func TestGMBRequestsArePaced(t *testing.T) {
	if gmbRequestInterval <= 0 {
		t.Fatal("gmbRequestInterval must stay positive; the API returns 403 when hammered")
	}
	if gmbRequestInterval > time.Second {
		t.Errorf("gmbRequestInterval = %v, unreasonably slow for thousands of requests", gmbRequestInterval)
	}
}
