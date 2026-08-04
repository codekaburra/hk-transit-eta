// Package weather serves Hong Kong Observatory data that the browser cannot
// fetch for itself.
//
// The gridded rainfall nowcast is published as a CSV on data.weather.gov.hk,
// which sends no Access-Control-Allow-Origin header — unlike the Observatory's
// other open-data endpoints, so a page cannot read it directly. The CSDI
// portal's GeoJSON distribution of the same dataset is worse: it answers 403 to
// any request carrying an Origin header, i.e. to browsers specifically.
//
// Server to server there is no such restriction, so this package fetches the
// CSV, keeps only the grid points over Hong Kong, and serves the result as
// compact JSON. That also cuts the payload the client sees by about 95%: the
// published grid spans roughly 21.3-23.5N and 113.0-115.3E — most of the
// Pearl River Delta — of which Hong Kong is a small corner.
package weather

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// nowcastURL is the Traditional Chinese distribution. The columns are numeric
// and identical across languages; only the header row differs, and it is
// discarded. There is no English CSV — the _en path redirects to a 404.
//
// A variable so tests can point it at a fixture server.
var nowcastURL = "https://data.weather.gov.hk/weatherAPI/hko_data/F3/Gridded_rainfall_nowcast_tc.csv"

// The Observatory republishes roughly every 12 minutes. Caching for half that
// keeps the served data fresh while bounding how often a burst of page loads
// can pull the 2.7 MB source.
var cacheTTL = 5 * time.Minute

var httpClient = &http.Client{Timeout: 60 * time.Second}

// Hong Kong and its surrounding waters. Deliberately a little wider than the
// land area so the coastline is not clipped at the edge of the rendered grid.
const (
	minLat, maxLat = 22.10, 22.60
	minLon, maxLon = 113.80, 114.50
)

// Point is one grid cell: latitude, longitude, and forecast accumulated
// rainfall in millimetres. An array rather than an object because the response
// carries a few thousand of them and the field names would dominate it.
type Point [3]float64

// Window is one half-hourly forecast period.
type Window struct {
	// Ends is when the accumulation period finishes, RFC 3339 in Hong Kong time.
	Ends string `json:"ends"`
	// MaxMm is the heaviest rainfall over Hong Kong in this window, so a client
	// can scale a colour ramp without walking every point.
	MaxMm  float64 `json:"max_mm"`
	Points []Point `json:"points"`
}

// Nowcast is the response body.
type Nowcast struct {
	// Updated is when the Observatory issued this nowcast, RFC 3339.
	Updated string `json:"updated"`
	Bounds  Bounds `json:"bounds"`
	// Windows run from the nearest period outwards, up to two hours ahead.
	Windows []Window `json:"windows"`
}

type Bounds struct {
	MinLat float64 `json:"min_lat"`
	MaxLat float64 `json:"max_lat"`
	MinLon float64 `json:"min_lon"`
	MaxLon float64 `json:"max_lon"`
}

var (
	mu     sync.Mutex
	cached *Nowcast
	// cachedAt is when the upstream fetch completed, not when it was requested.
	cachedAt time.Time
)

// Nowcast returns the current forecast, fetching it only when what is held is
// older than cacheTTL.
//
// The lock is held across the fetch so that concurrent callers arriving on a
// cold cache produce one upstream request rather than one each. The alternative
// — releasing the lock while fetching — turns a burst of page loads into a
// burst of 2.7 MB downloads.
func GetNowcast() (*Nowcast, error) {
	mu.Lock()
	defer mu.Unlock()

	if cached != nil && time.Since(cachedAt) < cacheTTL {
		return cached, nil
	}

	fresh, err := fetchNowcast()
	if err != nil {
		// Serving something stale beats serving nothing: the nowcast changes
		// slowly and a reader is better off with a twenty-minute-old field than
		// an error page.
		if cached != nil {
			return cached, nil
		}
		return nil, err
	}

	cached, cachedAt = fresh, time.Now()
	return cached, nil
}

func fetchNowcast() (*Nowcast, error) {
	resp, err := httpClient.Get(nowcastURL)
	if err != nil {
		return nil, fmt.Errorf("fetching the rainfall nowcast: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("rainfall nowcast returned status %d", resp.StatusCode)
	}
	return parseNowcast(resp.Body)
}

// parseNowcast reads the CSV and keeps the Hong Kong grid points.
//
// The columns are: updated time, end-of-period time, latitude, longitude,
// half-hourly accumulated rainfall in mm. Both times are YYYYMMDDHHMM in Hong
// Kong time. Reading only the first three fields — as if the row were
// lat/long/rainfall — yields a grid plotted from two timestamps with latitude
// in place of rainfall.
func parseNowcast(r io.Reader) (*Nowcast, error) {
	reader := csv.NewReader(r)
	// The Observatory has published trailing empty fields before; the row is
	// still usable as long as the five columns are there.
	reader.FieldsPerRecord = -1

	if _, err := reader.Read(); err != nil {
		return nil, fmt.Errorf("reading the header row: %w", err)
	}

	// Windows are emitted in the order they first appear, which is nearest
	// first, so the client can render them as a sequence without sorting.
	var order []string
	points := map[string][]Point{}
	maxima := map[string]float64{}
	var updated string

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("reading a data row: %w", err)
		}
		if len(record) < 5 {
			continue
		}

		lat, errLat := strconv.ParseFloat(strings.TrimSpace(record[2]), 64)
		lon, errLon := strconv.ParseFloat(strings.TrimSpace(record[3]), 64)
		mm, errMm := strconv.ParseFloat(strings.TrimSpace(record[4]), 64)
		if errLat != nil || errLon != nil || errMm != nil {
			continue
		}

		if updated == "" {
			updated = strings.TrimSpace(record[0])
		}
		if lat < minLat || lat > maxLat || lon < minLon || lon > maxLon {
			continue
		}

		ends := strings.TrimSpace(record[1])
		if _, seen := points[ends]; !seen {
			order = append(order, ends)
		}
		points[ends] = append(points[ends], Point{lat, lon, mm})
		if mm > maxima[ends] {
			maxima[ends] = mm
		}
	}

	if len(order) == 0 {
		return nil, fmt.Errorf("the rainfall nowcast contained no usable rows")
	}

	nowcast := &Nowcast{
		Updated: hkTime(updated),
		Bounds:  Bounds{MinLat: minLat, MaxLat: maxLat, MinLon: minLon, MaxLon: maxLon},
	}
	for _, ends := range order {
		nowcast.Windows = append(nowcast.Windows, Window{
			Ends:   hkTime(ends),
			MaxMm:  maxima[ends],
			Points: points[ends],
		})
	}
	return nowcast, nil
}

var hongKong = time.FixedZone("HKT", 8*60*60)

// hkTime converts the Observatory's YYYYMMDDHHMM to RFC 3339 so the client can
// parse it without knowing the format or having to assume a zone. An
// unrecognised value is passed through rather than dropped.
func hkTime(raw string) string {
	t, err := time.ParseInLocation("200601021504", raw, hongKong)
	if err != nil {
		return raw
	}
	return t.Format(time.RFC3339)
}
