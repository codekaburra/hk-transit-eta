package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Only the auth / single-flight gating is tested here; the actual refresh and
// reseed work requires a database and, for refresh, the live APIs.
var adminHandlers = map[string]http.HandlerFunc{
	"refresh": handleAdminRefresh,
	"reseed":  handleAdminReseed,
}

func TestAdminHandlersAuth(t *testing.T) {
	cases := []struct {
		name       string
		envToken   string
		header     string
		wantStatus int
	}{
		{"disabled when ADMIN_TOKEN unset", "", "anything", http.StatusServiceUnavailable},
		{"rejects wrong token", "secret", "wrong", http.StatusUnauthorized},
		{"rejects missing header", "secret", "", http.StatusUnauthorized},
	}

	for endpoint, handler := range adminHandlers {
		for _, tc := range cases {
			t.Run(endpoint+"/"+tc.name, func(t *testing.T) {
				t.Setenv("ADMIN_TOKEN", tc.envToken)
				req := httptest.NewRequest(http.MethodPost, "/api/admin/"+endpoint, nil)
				if tc.header != "" {
					req.Header.Set("X-Admin-Token", tc.header)
				}
				rec := httptest.NewRecorder()
				handler(rec, req)
				if rec.Code != tc.wantStatus {
					t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
				}
			})
		}
	}
}

// Refresh and reseed write to the same tables, so they share one slot: while
// either is running, both must be refused.
func TestAdminHandlersShareSingleFlight(t *testing.T) {
	for endpoint, handler := range adminHandlers {
		t.Run(endpoint, func(t *testing.T) {
			t.Setenv("ADMIN_TOKEN", "secret")

			if !dataJobInFlight.CompareAndSwap(false, true) {
				t.Fatal("dataJobInFlight unexpectedly already set")
			}
			defer dataJobInFlight.Store(false)

			req := httptest.NewRequest(http.MethodPost, "/api/admin/"+endpoint, nil)
			req.Header.Set("X-Admin-Token", "secret")
			rec := httptest.NewRecorder()
			handler(rec, req)

			if rec.Code != http.StatusConflict {
				t.Fatalf("status = %d, want %d while another job is in flight",
					rec.Code, http.StatusConflict)
			}
		})
	}
}
