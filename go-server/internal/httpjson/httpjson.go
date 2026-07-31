// Package httpjson holds the response and query-parameter handling that every
// JSON handler repeats.
//
// Sharing it is mostly about consistency rather than line count: written out by
// hand in each handler, the same decision was made differently in different
// places — whether a scan error is fatal, and whether the database's own error
// text reaches the client.
package httpjson

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

// Write encodes v as the response body.
//
// An encoding failure cannot be reported to the client: the 200 and the header
// are already committed by the time it happens, so the only useful thing left
// is a server-side log.
func Write(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encoding response: %v", err)
	}
}

// BadRequest reports a caller mistake. The message is written verbatim, since
// it describes the request rather than the server's internals.
func BadRequest(w http.ResponseWriter, message string) {
	http.Error(w, message, http.StatusBadRequest)
}

// NotFound reports a missing record.
func NotFound(w http.ResponseWriter, message string) {
	http.Error(w, message, http.StatusNotFound)
}

// Internal reports a server-side failure. The error is logged with its context
// and the client gets a generic message: a raw database error names tables and
// columns, and can echo back the values that were queried.
func Internal(w http.ResponseWriter, context string, err error) {
	log.Printf("%s: %v", context, err)
	http.Error(w, "Internal server error", http.StatusInternalServerError)
}

// RequiredQuery reads a query parameter that must be present. It writes the 400
// itself and reports false, so the handler only has to return.
func RequiredQuery(w http.ResponseWriter, r *http.Request, name string) (string, bool) {
	value := r.URL.Query().Get(name)
	if value == "" {
		BadRequest(w, "Query parameter '"+name+"' is required")
		return "", false
	}
	return value, true
}

// RequiredIntQuery reads a query parameter that must be present and numeric.
func RequiredIntQuery(w http.ResponseWriter, r *http.Request, name string) (int, bool) {
	raw, ok := RequiredQuery(w, r, name)
	if !ok {
		return 0, false
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		BadRequest(w, "Query parameter '"+name+"' must be a number")
		return 0, false
	}
	return value, true
}

