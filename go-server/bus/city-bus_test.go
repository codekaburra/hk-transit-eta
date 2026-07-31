package bus

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// stopPayload is the shape the Citybus stop endpoint returns.
func stopPayload(id string) string {
	return fmt.Sprintf(`{"type":"Stop","version":"2.0",
		"generated_timestamp":"2026-07-31T00:00:00+08:00",
		"data":{"stop":%q,"name_en":"Stop %s","name_tc":"車站 %s",
		"name_sc":"车站 %s","lat":"22.1","long":"114.1",
		"data_timestamp":"2026-07-31T00:00:00+08:00"}}`, id, id, id, id)
}

// withCitybusTestServer points the fetcher at srv and removes the pacing and
// retry backoff so tests stay fast.
func withCitybusTestServer(t *testing.T, srv *httptest.Server) {
	t.Helper()
	base, interval, attempts, delay :=
		citybusAPIBase, citybusStopInterval, citybusRetryAttempts, citybusRetryDelay
	t.Cleanup(func() {
		citybusAPIBase, citybusStopInterval = base, interval
		citybusRetryAttempts, citybusRetryDelay = attempts, delay
	})
	citybusAPIBase = srv.URL
	citybusStopInterval = 0
	citybusRetryAttempts = 2
	citybusRetryDelay = time.Millisecond
}

// One failing stop must not abandon the rest. Returning early here previously
// meant a single timeout part-way through ~2,500 sequential requests left every
// later stop unfetched, and those stops then vanished from route pages.
func TestFetchCitybusStopsContinuesPastAFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/stop/")
		if id == "bad" {
			http.Error(w, "boom", http.StatusInternalServerError)
			return
		}
		fmt.Fprint(w, stopPayload(id))
	}))
	defer srv.Close()
	withCitybusTestServer(t, srv)

	stops, err := fetchCitybusStops([]string{"a", "bad", "c", "d"})

	if err == nil {
		t.Error("a skipped stop must be reported as an error")
	}
	if len(stops) != 3 {
		t.Fatalf("got %d stops, want the 3 that succeeded", len(stops))
	}
	// Crucially, the stops *after* the failure are present.
	got := map[string]bool{}
	for _, s := range stops {
		got[s.Stop] = true
	}
	for _, want := range []string{"a", "c", "d"} {
		if !got[want] {
			t.Errorf("stop %q missing; fetching stopped early", want)
		}
	}
}

// An unknown stop id returns 200 with an empty object rather than an error.
// Storing that would create a nameless, coordinate-less stop row.
func TestFetchCitybusStopsRejectsEmptyPayload(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/003759") {
			fmt.Fprint(w, `{"type":"Stop","version":"2.0","data":{}}`)
			return
		}
		fmt.Fprint(w, stopPayload(strings.TrimPrefix(r.URL.Path, "/stop/")))
	}))
	defer srv.Close()
	withCitybusTestServer(t, srv)

	stops, err := fetchCitybusStops([]string{"001026", "003759"})

	if err == nil {
		t.Error("an empty payload must count as a failure")
	}
	if len(stops) != 1 || stops[0].Stop != "001026" {
		t.Fatalf("got %+v, want only the stop that returned data", stops)
	}
}

func TestFetchCitybusStopsRetriesTransientFailures(t *testing.T) {
	var attempts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if attempts.Add(1) == 1 {
			http.Error(w, "flaky", http.StatusInternalServerError)
			return
		}
		fmt.Fprint(w, stopPayload("001026"))
	}))
	defer srv.Close()
	withCitybusTestServer(t, srv)

	stops, err := fetchCitybusStops([]string{"001026"})

	if err != nil {
		t.Fatalf("a retry should have recovered: %v", err)
	}
	if len(stops) != 1 {
		t.Fatalf("got %d stops, want 1", len(stops))
	}
	if attempts.Load() != 2 {
		t.Errorf("got %d attempts, want 2 (one failure then a retry)", attempts.Load())
	}
}

func TestFetchCitybusStopsMapsFieldsAndCompany(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, stopPayload("001026"))
	}))
	defer srv.Close()
	withCitybusTestServer(t, srv)

	stops, err := fetchCitybusStops([]string{"001026"})
	if err != nil {
		t.Fatalf("fetchCitybusStops: %v", err)
	}

	s := stops[0]
	if s.Company != DatabaseCompany_CityBus {
		t.Errorf("company = %q, want %q", s.Company, DatabaseCompany_CityBus)
	}
	if s.Stop != "001026" || s.NameTc != "車站 001026" || s.Lat != "22.1" || s.Long != "114.1" {
		t.Errorf("unexpected mapping: %+v", s)
	}
}

func TestFetchCitybusStopsWithNoInput(t *testing.T) {
	stops, err := fetchCitybusStops(nil)
	if err != nil {
		t.Errorf("empty input is not a failure, got: %v", err)
	}
	if len(stops) != 0 {
		t.Errorf("got %d stops, want none", len(stops))
	}
}
