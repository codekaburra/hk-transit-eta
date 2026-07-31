// Package testhttp holds the handler-testing helpers both API packages need.
//
// They were written out identically in bus and minibus; the empty-array check
// in particular had drifted, with one package asserting the exact body and the
// other only that it was not null.
package testhttp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// CallJSON invokes a handler and decodes its JSON body into out.
//
// out may be nil for tests that only care about the status. The body is only
// decoded on a 200, so an error response does not fail decoding before the
// test can assert on the status it expected.
func CallJSON(t *testing.T, h http.HandlerFunc, target string, out interface{}) *httptest.ResponseRecorder {
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

// AssertEmptyJSONArray checks the response is exactly an empty array with a
// 200, rather than merely "not null" — which a 500, an object or a populated
// list would all pass.
func AssertEmptyJSONArray(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if body := rec.Body.String(); body != "[]\n" {
		t.Errorf("body = %q, want exactly an empty JSON array", body)
	}
}
