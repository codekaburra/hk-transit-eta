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

	// The upstream refreshes every few minutes, so allow a short shared cache
	// but never a stale one: the point of the endpoint is current conditions.
	w.Header().Set("Cache-Control", "public, max-age=60")
	httpjson.Write(w, nowcast)
}
