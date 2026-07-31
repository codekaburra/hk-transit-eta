package httpjson

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteEncodesJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	Write(rec, []string{"a", "b"})

	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	if got := rec.Body.String(); got != "[\"a\",\"b\"]\n" {
		t.Errorf("body = %q", got)
	}
}

// An empty slice must encode as [] rather than null, which is what every
// handler's "non-nil so it encodes as []" comment depends on.
func TestWriteEncodesEmptySliceAsArray(t *testing.T) {
	rec := httptest.NewRecorder()
	Write(rec, []string{})

	if got := rec.Body.String(); got != "[]\n" {
		t.Errorf("body = %q, want an empty JSON array", got)
	}
}

// A database error names tables and columns and can echo the queried values, so
// it belongs in the log rather than the response.
func TestInternalDoesNotLeakTheError(t *testing.T) {
	rec := httptest.NewRecorder()
	Internal(rec, "querying stops", errors.New(`pq: column "secret_column" does not exist`))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
	if body := rec.Body.String(); strings.Contains(body, "secret_column") {
		t.Errorf("the response leaked the database error: %q", body)
	}
}

func TestRequiredQuery(t *testing.T) {
	t.Run("returns the value when present", func(t *testing.T) {
		rec := httptest.NewRecorder()
		value, ok := RequiredQuery(rec, httptest.NewRequest(http.MethodGet, "/?stopId=ABC", nil), "stopId")
		if !ok || value != "ABC" {
			t.Errorf("got (%q, %v), want (ABC, true)", value, ok)
		}
	})

	t.Run("writes a 400 when missing", func(t *testing.T) {
		rec := httptest.NewRecorder()
		if _, ok := RequiredQuery(rec, httptest.NewRequest(http.MethodGet, "/", nil), "stopId"); ok {
			t.Fatal("a missing parameter should not report ok")
		}
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	// An empty value is as unusable as an absent one.
	t.Run("treats an empty value as missing", func(t *testing.T) {
		rec := httptest.NewRecorder()
		if _, ok := RequiredQuery(rec, httptest.NewRequest(http.MethodGet, "/?stopId=", nil), "stopId"); ok {
			t.Error("an empty parameter should not report ok")
		}
	})
}

func TestRequiredIntQuery(t *testing.T) {
	cases := []struct {
		name    string
		target  string
		want    int
		wantOK  bool
		wantErr int
	}{
		{"parses a number", "/?routeId=101", 101, true, 0},
		{"rejects a missing value", "/", 0, false, http.StatusBadRequest},
		{"rejects a non-numeric value", "/?routeId=abc", 0, false, http.StatusBadRequest},
		// A route id is used as a query argument, so anything non-numeric must
		// be refused before it reaches the database.
		{"rejects an injection attempt", "/?routeId=1+OR+1%3D1", 0, false, http.StatusBadRequest},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			got, ok := RequiredIntQuery(rec, httptest.NewRequest(http.MethodGet, c.target, nil), "routeId")
			if ok != c.wantOK || got != c.want {
				t.Errorf("got (%d, %v), want (%d, %v)", got, ok, c.want, c.wantOK)
			}
			if c.wantErr != 0 && rec.Code != c.wantErr {
				t.Errorf("status = %d, want %d", rec.Code, c.wantErr)
			}
		})
	}
}
