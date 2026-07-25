package httpapi

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestFetchDecodesEnvelope(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"type":"RouteStop","version":"1.0",`+
			`"generated_timestamp":"2026-07-16T19:12:48+08:00","data":[{"route":"1A"}]}`)
	}))
	defer srv.Close()

	resp, err := Fetch(srv.URL)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if resp.Type != "RouteStop" || resp.GeneratedTimestamp != "2026-07-16T19:12:48+08:00" {
		t.Fatalf("envelope mismatch: %+v", resp)
	}
	if string(resp.Data) != `[{"route":"1A"}]` {
		t.Fatalf("data payload mismatch: %s", resp.Data)
	}
}

func TestFetchRejectsNon200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()

	if _, err := Fetch(srv.URL); err == nil {
		t.Fatal("expected error for HTTP 500, got nil")
	}
}

func TestFetchRejectsMalformedJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `not json`)
	}))
	defer srv.Close()

	if _, err := Fetch(srv.URL); err == nil {
		t.Fatal("expected error for malformed JSON, got nil")
	}
}

func TestFetchWithRetryRecovers(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) < 3 {
			http.Error(w, "flaky", http.StatusInternalServerError)
			return
		}
		fmt.Fprint(w, `{"type":"Stop","version":"1.0","generated_timestamp":"t","data":{}}`)
	}))
	defer srv.Close()

	resp, err := FetchWithRetry(srv.URL, 3, time.Millisecond)
	if err != nil {
		t.Fatalf("FetchWithRetry: %v", err)
	}
	if resp.Type != "Stop" {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if got := calls.Load(); got != 3 {
		t.Fatalf("expected 3 attempts, got %d", got)
	}
}

func TestFetchWithRetryExhausts(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		http.Error(w, "down", http.StatusInternalServerError)
	}))
	defer srv.Close()

	if _, err := FetchWithRetry(srv.URL, 2, time.Millisecond); err == nil {
		t.Fatal("expected error after exhausting retries, got nil")
	}
	if got := calls.Load(); got != 2 {
		t.Fatalf("expected 2 attempts, got %d", got)
	}
}
