package nearby

import "math"

// earthRadiusM is the mean radius. The error against a proper ellipsoid is
// under 0.5% at this latitude, which is far below the precision the stop
// coordinates themselves carry.
const earthRadiusM = 6371000

// box is a latitude/longitude rectangle used to prefilter rows in SQL before
// the exact distance is computed in Go.
type box struct {
	minLat, maxLat float64
	minLon, maxLon float64
}

// boundingBox returns the rectangle enclosing a circle of radiusM around a
// point.
//
// A degree of longitude is shorter than a degree of latitude everywhere but the
// equator — at Hong Kong's latitude it is about 92% as long — so a box built
// from one degree span for both axes is too narrow east-west and would miss
// stops inside the radius. The longitude span is divided by cos(latitude) to
// correct for it.
//
// That cosine is taken at the edge of the box furthest from the equator rather
// than at the centre, because it shrinks as the box extends poleward: the
// centre's value leaves the two far corners fractionally outside the rectangle.
// The difference is under a millimetre at these radii, but the point of the box
// is that nothing inside the radius escapes it, and a box that is right only
// near its middle does not have that property.
func boundingBox(lat, lon, radiusM float64) box {
	latSpan := radiusM / earthRadiusM * 180 / math.Pi
	lonSpan := latSpan / math.Cos((math.Abs(lat)+latSpan)*math.Pi/180)
	return box{
		minLat: lat - latSpan, maxLat: lat + latSpan,
		minLon: lon - lonSpan, maxLon: lon + lonSpan,
	}
}

// distanceM returns the great-circle distance between two points in metres.
//
// The haversine formula rather than the Pythagorean approximation the bus
// package's ordering uses: |dLat| + |dLon| ranks a stop due east as further
// than one due north at the same true distance, which puts the wrong stop at
// the top of a list sorted by proximity.
func distanceM(lat1, lon1, lat2, lon2 float64) float64 {
	const toRad = math.Pi / 180
	dLat := (lat2 - lat1) * toRad
	dLon := (lon2 - lon1) * toRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*toRad)*math.Cos(lat2*toRad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * earthRadiusM * math.Asin(math.Sqrt(a))
}
