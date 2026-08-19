package nearby

import (
	"math"
	"testing"
)

// Known distances around Hong Kong, checked against the great-circle values.
func TestDistanceM(t *testing.T) {
	cases := []struct {
		name                          string
		lat1, lon1, lat2, lon2, wantM float64
	}{
		{"the same point is zero", 22.3, 114.2, 22.3, 114.2, 0},
		// 0.001 degrees of latitude is a fixed 111 m everywhere.
		{"a thousandth of a degree north", 22.3, 114.2, 22.301, 114.2, 111.2},
		// The same span of longitude is shorter, by cos(22.3 degrees) = 0.925.
		{"a thousandth of a degree east", 22.3, 114.2, 22.3, 114.201, 102.9},
		{"Central to Tsim Sha Tsui", 22.2819, 114.1582, 22.2968, 114.1722, 2210},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := distanceM(c.lat1, c.lon1, c.lat2, c.lon2)
			// One percent, which is well inside the haversine's own error
			// against the ellipsoid and far inside the coordinates' precision.
			if math.Abs(got-c.wantM) > math.Max(c.wantM*0.01, 0.5) {
				t.Errorf("distance = %.1f m, want about %.1f m", got, c.wantM)
			}
		})
	}
}

// The distinction the bus package's |dLat| + |dLon| ordering misses: at this
// latitude a degree of longitude covers less ground than a degree of latitude,
// so equal degree offsets are not equal distances.
func TestDistanceMAccountsForLongitudeConvergence(t *testing.T) {
	north := distanceM(22.3, 114.2, 22.31, 114.2)
	east := distanceM(22.3, 114.2, 22.3, 114.21)

	if east >= north {
		t.Fatalf("east = %.1f m, north = %.1f m — a degree of longitude must be the shorter", east, north)
	}
	ratio := east / north
	if math.Abs(ratio-math.Cos(22.3*math.Pi/180)) > 0.01 {
		t.Errorf("east/north = %.4f, want cos(22.3 degrees) = %.4f", ratio, math.Cos(22.3*math.Pi/180))
	}
}

// The box has to enclose the circle, or the SQL prefilter drops stops that are
// genuinely within the radius before the exact distance ever sees them.
func TestBoundingBoxEnclosesTheRadius(t *testing.T) {
	const lat, lon, radius = 22.3, 114.2, 500.0
	b := boundingBox(lat, lon, radius)

	// Due north, south, east and west at exactly the radius must all be inside.
	for _, p := range []struct {
		name     string
		lat, lon float64
	}{
		{"north", b.maxLat, lon},
		{"south", b.minLat, lon},
		{"east", lat, b.maxLon},
		{"west", lat, b.minLon},
	} {
		d := distanceM(lat, lon, p.lat, p.lon)
		if d < radius-0.001 {
			t.Errorf("the box edge to the %s is %.1f m out, inside the %.0f m radius — stops would be missed", p.name, d, radius)
		}
	}
}

// A box built without the cos(latitude) correction is too narrow east-west.
// This is the same error the rainfall panel had when it sized a canvas from raw
// degree spans.
func TestBoundingBoxWidensLongitudeForLatitude(t *testing.T) {
	b := boundingBox(22.3, 114.2, 500)
	latSpan := b.maxLat - b.minLat
	lonSpan := b.maxLon - b.minLon

	if lonSpan <= latSpan {
		t.Fatalf("longitude span %.6f is not wider than latitude span %.6f", lonSpan, latSpan)
	}
	// Taken at the box's poleward edge rather than its centre, so the ratio is
	// fractionally above 1/cos(centre) — never below it.
	if lonSpan/latSpan < 1/math.Cos(22.3*math.Pi/180) {
		t.Errorf("span ratio = %.6f, want at least 1/cos(22.3 degrees) = %.6f",
			lonSpan/latSpan, 1/math.Cos(22.3*math.Pi/180))
	}
}
