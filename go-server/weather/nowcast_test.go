package weather

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// The real file's header is Chinese; only its presence matters, since it is
// discarded and the data columns are numeric.
const header = "更新日期及時間（以本地時間表示）,完結日期及時間（以本地時間表示）,緯度（度）,經度（度）,臨近預測半小時累計雨量（毫米）"

func row(updated, ends string, lat, lon, mm float64) string {
	return fmt.Sprintf("%s,%s,%.3f,%.3f,%.2f", updated, ends, lat, lon, mm)
}

func csvBody(rows ...string) string {
	return header + "\n" + strings.Join(rows, "\n") + "\n"
}

// resetCache clears the package-level cache so each test starts cold.
func resetCache(t *testing.T) {
	t.Helper()
	mu.Lock()
	cached, cachedAt = nil, time.Time{}
	mu.Unlock()
}

func withServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	original := nowcastURL
	nowcastURL = srv.URL
	t.Cleanup(func() { nowcastURL = original; srv.Close() })
	return srv
}

// The columns are updated-time, end-time, latitude, longitude, rainfall. Taking
// the first three as lat/long/rainfall — which is what the frontend did before
// this endpoint existed — plots two timestamps as coordinates and reports the
// latitude as the rainfall figure.
func TestParseNowcastReadsTheCoordinateColumns(t *testing.T) {
	body := csvBody(row("202608050012", "202608050042", 22.30, 114.17, 4.25))

	got, err := parseNowcast(strings.NewReader(body))
	if err != nil {
		t.Fatalf("parseNowcast: %v", err)
	}
	if len(got.Windows) != 1 || len(got.Windows[0].Points) != 1 {
		t.Fatalf("got %d windows", len(got.Windows))
	}

	p := got.Windows[0].Points[0]
	if p[0] != 22.30 || p[1] != 114.17 || p[2] != 4.25 {
		t.Errorf("point = %v, want [22.30 114.17 4.25]", p)
	}
}

// The published grid covers most of the Pearl River Delta; all but a corner of
// it is irrelevant here and is the bulk of the 2.7 MB payload.
func TestParseNowcastKeepsOnlyHongKong(t *testing.T) {
	body := csvBody(
		row("202608050012", "202608050042", 22.30, 114.17, 1.0),  // Hong Kong
		row("202608050012", "202608050042", 23.10, 113.30, 99.0), // Guangzhou
		row("202608050012", "202608050042", 21.50, 115.20, 88.0), // open sea
	)

	got, err := parseNowcast(strings.NewReader(body))
	if err != nil {
		t.Fatalf("parseNowcast: %v", err)
	}
	if n := len(got.Windows[0].Points); n != 1 {
		t.Fatalf("kept %d points, want only the Hong Kong one", n)
	}
	// The maximum must describe what was kept, not what was discarded.
	if got.Windows[0].MaxMm != 1.0 {
		t.Errorf("max = %v, want 1.0 — a discarded point must not set it", got.Windows[0].MaxMm)
	}
}

func TestParseNowcastGroupsWindowsInOrder(t *testing.T) {
	body := csvBody(
		row("202608050012", "202608050042", 22.30, 114.17, 1.0),
		row("202608050012", "202608050112", 22.30, 114.17, 5.0),
		row("202608050012", "202608050042", 22.31, 114.18, 3.0),
		row("202608050012", "202608050112", 22.31, 114.18, 2.0),
	)

	got, err := parseNowcast(strings.NewReader(body))
	if err != nil {
		t.Fatalf("parseNowcast: %v", err)
	}
	if len(got.Windows) != 2 {
		t.Fatalf("got %d windows, want 2", len(got.Windows))
	}
	// Nearest period first, as published.
	if got.Windows[0].Ends != "2026-08-05T00:42:00+08:00" {
		t.Errorf("first window ends %q", got.Windows[0].Ends)
	}
	if got.Windows[0].MaxMm != 3.0 || got.Windows[1].MaxMm != 5.0 {
		t.Errorf("maxima = %v, %v; want 3 and 5", got.Windows[0].MaxMm, got.Windows[1].MaxMm)
	}
	if got.Updated != "2026-08-05T00:12:00+08:00" {
		t.Errorf("updated = %q", got.Updated)
	}
}

// The Observatory publishes provisional data; a malformed row must not abort
// the whole nowcast.
func TestParseNowcastSkipsUnusableRows(t *testing.T) {
	body := csvBody(
		"202608050012,202608050042,not-a-number,114.17,1.0",
		"202608050012,202608050042,22.30",
		row("202608050012", "202608050042", 22.30, 114.17, 2.5),
	)

	got, err := parseNowcast(strings.NewReader(body))
	if err != nil {
		t.Fatalf("parseNowcast: %v", err)
	}
	if n := len(got.Windows[0].Points); n != 1 {
		t.Errorf("kept %d points, want the one usable row", n)
	}
}

func TestParseNowcastRejectsAnEmptyGrid(t *testing.T) {
	// Every row outside Hong Kong: there is nothing to serve.
	body := csvBody(row("202608050012", "202608050042", 23.10, 113.30, 9.0))

	if _, err := parseNowcast(strings.NewReader(body)); err == nil {
		t.Error("a nowcast with no Hong Kong rows should be an error, not an empty success")
	}
}

func TestGetNowcastCachesBetweenCalls(t *testing.T) {
	resetCache(t)
	var hits int
	withServer(t, func(w http.ResponseWriter, r *http.Request) {
		hits++
		fmt.Fprint(w, csvBody(row("202608050012", "202608050042", 22.30, 114.17, 1.0)))
	})

	for i := 0; i < 3; i++ {
		if _, err := GetNowcast(); err != nil {
			t.Fatalf("call %d: %v", i, err)
		}
	}
	if hits != 1 {
		t.Errorf("fetched %d times, want 1 — the 2.7 MB source must not be pulled per request", hits)
	}
}

// The nowcast changes slowly, so a reader is better served by a stale field
// than by an error page.
func TestGetNowcastServesStaleDataWhenUpstreamFails(t *testing.T) {
	resetCache(t)
	var fail bool
	withServer(t, func(w http.ResponseWriter, r *http.Request) {
		if fail {
			http.Error(w, "upstream down", http.StatusBadGateway)
			return
		}
		fmt.Fprint(w, csvBody(row("202608050012", "202608050042", 22.30, 114.17, 7.5)))
	})

	first, err := GetNowcast()
	if err != nil {
		t.Fatalf("priming the cache: %v", err)
	}

	// Expire the cache, then break the upstream.
	mu.Lock()
	cachedAt = time.Now().Add(-2 * cacheTTL)
	mu.Unlock()
	fail = true

	got, err := GetNowcast()
	if err != nil {
		t.Fatalf("expected the stale value, got an error: %v", err)
	}
	if got.Windows[0].MaxMm != first.Windows[0].MaxMm {
		t.Error("did not serve the previously cached nowcast")
	}
}

func TestGetNowcastReportsAFailureWithNothingCached(t *testing.T) {
	resetCache(t)
	withServer(t, func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "upstream down", http.StatusBadGateway)
	})

	if _, err := GetNowcast(); err == nil {
		t.Error("a cold cache and a failing upstream should be an error")
	}
}

func TestHKTime(t *testing.T) {
	if got := hkTime("202608050042"); got != "2026-08-05T00:42:00+08:00" {
		t.Errorf("hkTime = %q", got)
	}
	// An unexpected format is passed through rather than silently blanked.
	if got := hkTime("garbage"); got != "garbage" {
		t.Errorf("hkTime(garbage) = %q", got)
	}
}
