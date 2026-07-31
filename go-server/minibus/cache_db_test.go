package minibus

import (
	"os"
	"path/filepath"
	"testing"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/testdb"
)

func snapshotRoute(region, code string, id int) MinibusRoute {
	upper := 12
	return MinibusRoute{
		Region: region, RouteCode: code, RouteID: id,
		DescriptionTC: "路線", DescriptionSC: "路线", DescriptionEN: "Route",
		DataTimestamp: "snapshot-route",
		Directions: []Direction{{
			RouteSeq: 1,
			OrigTC:   "起點", OrigSC: "起点", OrigEN: "Origin",
			DestTC: "終點", DestSC: "终点", DestEN: "Destination",
			DataTimestamp: "snapshot-direction",
			Headways: []Headway{{
				Weekdays:       []bool{true, true, true, true, true, false, false},
				HeadwaySeq:     1,
				StartTime:      "08:00",
				EndTime:        "09:00",
				Frequency:      10,
				FrequencyUpper: &upper,
			}},
		}},
	}
}

func writeMinibusSnapshot(t *testing.T, root string) {
	t.Helper()
	dir := filepath.Join(root, "minibus")
	routes := map[string][]MinibusRoute{
		MinibusRegionHKI: {snapshotRoute(MinibusRegionHKI, "1", 101)},
		MinibusRegionKLN: {},
		MinibusRegionNT:  {},
	}
	for _, region := range minibusRegions {
		if err := cache.Save(filepath.Join(dir, "gmb_routes_"+region+".json"), routes[region]); err != nil {
			t.Fatalf("writing %s routes: %v", region, err)
		}
	}
	if err := cache.Save(filepath.Join(dir, "gmb_route_stops.json"), []cachedRouteStop{{
		RouteID: 101, RouteSeq: 1, StopSeq: 1, StopID: 9001,
		NameTC: "車站", NameSC: "车站", NameEN: "Stop",
		DataTimestamp: "snapshot-route-stop",
	}}); err != nil {
		t.Fatalf("writing route-stops: %v", err)
	}
	if err := cache.Save(filepath.Join(dir, "gmb_stops.json"), []cachedStop{{
		StopID: 9001, Latitude: 22.3, Longitude: 114.2,
		HK80Lat: 812000, HK80Lng: 832000, Enabled: true,
		DataTimestamp: "snapshot-stop",
	}}); err != nil {
		t.Fatalf("writing stops: %v", err)
	}
}

func TestMinibusSeedFromCacheReproducesSnapshot(t *testing.T) {
	setupDB(t)
	db := testdb.Connect(t)

	if _, err := db.Exec(`INSERT INTO minibus_route
		(region, route_code, route_id, route_seq, description_tc, description_sc,
		 description_en, orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en)
		VALUES ('KLN', 'STALE', 999, 1, '', '', 'stale', '', '', '', '', '', '')`); err != nil {
		t.Fatalf("seeding stale route: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO minibus_route_stop
		(route_id, route_seq, stop_seq, stop_id, name_tc, name_sc, name_en)
		VALUES (999, 1, 1, 9999, '', '', 'stale')`); err != nil {
		t.Fatalf("seeding stale route-stop: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO minibus_stop
		(stop_id, latitude, longitude, enabled) VALUES (9999, 0, 0, true)`); err != nil {
		t.Fatalf("seeding stale stop: %v", err)
	}

	root := t.TempDir()
	writeMinibusSnapshot(t, root)
	if !SeedFromCache(root) {
		t.Fatal("SeedFromCache returned false")
	}

	for _, tc := range []struct {
		table string
		where string
		want  int
	}{
		{"minibus_route", "", 1},
		{"minibus_headway", "", 1},
		{"minibus_route_stop", "", 1},
		{"minibus_stop", "", 1},
		{"minibus_route", "route_id = 999", 0},
		{"minibus_route_stop", "route_id = 999", 0},
		{"minibus_stop", "stop_id = 9999", 0},
	} {
		if got := testdb.Count(t, db, tc.table, tc.where); got != tc.want {
			t.Errorf("%s (%s) = %d rows, want %d", tc.table, tc.where, got, tc.want)
		}
	}
}

func TestMinibusSeedFromCacheRejectsMalformedSnapshotBeforeWriting(t *testing.T) {
	setupDB(t)
	db := testdb.Connect(t)
	if _, err := db.Exec(`INSERT INTO minibus_route
		(region, route_code, route_id, route_seq, description_tc, description_sc,
		 description_en, orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en)
		VALUES ('HKI', 'OLD', 777, 1, '', '', 'old data', '', '', '', '', '', '')`); err != nil {
		t.Fatalf("seeding old route: %v", err)
	}

	root := t.TempDir()
	writeMinibusSnapshot(t, root)
	badFile := filepath.Join(root, "minibus", "gmb_stops.json")
	if err := os.WriteFile(badFile, []byte(`{"not valid":`), 0o644); err != nil {
		t.Fatalf("corrupting stops snapshot: %v", err)
	}

	if SeedFromCache(root) {
		t.Fatal("SeedFromCache returned true for malformed JSON")
	}
	if got := testdb.Count(t, db, "minibus_route", "route_id = 777"); got != 1 {
		t.Errorf("old route count = %d, want 1; parsing failure must not mutate the database", got)
	}
	if got := testdb.Count(t, db, "minibus_route", "route_id = 101"); got != 0 {
		t.Errorf("snapshot route was partially applied (%d rows)", got)
	}
}
