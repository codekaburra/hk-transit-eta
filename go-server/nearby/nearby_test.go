package nearby

import "testing"

// The list is merged from two queries and rendered in order, so an unstable
// ordering shows up as stops swapping places between one search and the next.
func TestSortStopsIsATotalOrder(t *testing.T) {
	// Same rounded distance and same id across the two modes, which is what an
	// id-only tie-break leaves undecided: Citybus ids are numeric, and a GMB
	// stop_id can be the same number.
	same := func() []Stop {
		return []Stop{
			{Kind: "minibus", Company: "HKI", Stop: "001024", DistanceM: 40},
			{Kind: "bus", Company: "KMB", Stop: "001024", DistanceM: 40},
			{Kind: "bus", Company: "CTB", Stop: "001024", DistanceM: 40},
			{Kind: "bus", Company: "CTB", Stop: "001023", DistanceM: 40},
			{Kind: "bus", Company: "CTB", Stop: "000001", DistanceM: 12},
		}
	}

	want := []string{"bus/CTB/000001", "bus/CTB/001023", "bus/CTB/001024", "bus/KMB/001024", "minibus/HKI/001024"}

	key := func(stop Stop) string { return stop.Kind + "/" + stop.Company + "/" + stop.Stop }

	for attempt := 0; attempt < 5; attempt++ {
		stops := same()
		sortStops(stops)

		got := make([]string, len(stops))
		for i, stop := range stops {
			got[i] = key(stop)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("attempt %d: order = %v, want %v", attempt, got, want)
			}
		}
	}
}

func TestSortStopsPutsTheNearestFirst(t *testing.T) {
	stops := []Stop{
		{Kind: "bus", Company: "KMB", Stop: "C", DistanceM: 300},
		{Kind: "bus", Company: "KMB", Stop: "A", DistanceM: 9},
		{Kind: "minibus", Company: "NT", Stop: "B", DistanceM: 120},
	}
	sortStops(stops)

	for i, want := range []string{"A", "B", "C"} {
		if stops[i].Stop != want {
			t.Fatalf("stop %d = %q, want %q", i, stops[i].Stop, want)
		}
	}
}
