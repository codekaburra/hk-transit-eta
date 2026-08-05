package weather

import (
	"fmt"
	"net/http"

	"hk-transit-eta/internal/httpjson"
)

// GetRainfallNowcast serves the Observatory's gridded rainfall nowcast for
// Hong Kong. See the package comment for why this is proxied rather than
// fetched by the browser.
func GetRainfallNowcast(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("GetRainfallNowcast - Query: %s\n", r.URL.RawQuery)

	nowcast, err := GetNowcast()
	if err != nil {
		httpjson.Internal(w, "GetRainfallNowcast", err)
		return
	}

	// A minute of shared caching costs little against a 5-minute server cache
	// and an upstream that republishes every twelve.
	//
	// This body is not guaranteed current, and deliberately so: GetNowcast
	// serves the last good nowcast when a refresh fails, because a field that
	// changes slowly is more use than an error page. Do not "fix" that by
	// making a failed refresh an error — the response carries the Observatory's
	// own issue time in `updated`, which is how a client tells how old it is.
	w.Header().Set("Cache-Control", "public, max-age=60")
	httpjson.Write(w, nowcast)
}
