package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Only the auth / single-flight gating is tested here; the actual refresh
// work requires a database and live APIs.
func TestHandleAdminRefreshAuth(t *testing.T) {
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
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("ADMIN_TOKEN", tc.envToken)
			req := httptest.NewRequest(http.MethodPost, "/api/admin/refresh", nil)
			if tc.header != "" {
				req.Header.Set("X-Admin-Token", tc.header)
			}
			rec := httptest.NewRecorder()
			handleAdminRefresh(rec, req)
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
		})
	}
}

func TestHandleAdminRefreshSingleFlight(t *testing.T) {
	t.Setenv("ADMIN_TOKEN", "secret")

	// Simulate a refresh already in progress.
	if !refreshInFlight.CompareAndSwap(false, true) {
		t.Fatal("refreshInFlight unexpectedly already set")
	}
	defer refreshInFlight.Store(false)

	req := httptest.NewRequest(http.MethodPost, "/api/admin/refresh", nil)
	req.Header.Set("X-Admin-Token", "secret")
	rec := httptest.NewRecorder()
	handleAdminRefresh(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (conflict while refresh in flight)", rec.Code, http.StatusConflict)
	}
}
