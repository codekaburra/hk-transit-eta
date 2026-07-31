package bus

import (
	"database/sql"
	"errors"
	"path/filepath"
	"testing"

	"hk-transit-eta/internal/cache"
	"hk-transit-eta/internal/syncmeta"
	"hk-transit-eta/internal/testdb"
)

// busTables is the full set this package owns; every test starts from empty.
var busTables = []string{"route_stops", "routes", "stops"}

// setupDB wires the package to the test database and clears it.
func setupDB(t *testing.T) {
	t.Helper()
	db := testdb.Connect(t)
	SetDatabase(db)
	InitBusDatabase()
	if err := syncmeta.Init(db); err != nil {
		t.Fatalf("syncmeta.Init: %v", err)
	}
	testdb.Truncate(t, db, busTables...)
}

func route(company, r, dir, svc string) Route {
	return Route{
		Company: company, Route: r, Direction: dir, ServiceType: svc,
		OrigEn: "Origin", OrigTc: "起點", OrigSc: "起点",
		DestEn: "Dest", DestTc: "終點", DestSc: "终点",
	}
}

func stop(company, id string) Stop {
	return Stop{
		Company: company, Stop: id,
		NameEn: "Stop " + id, NameTc: "車站 " + id, NameSc: "车站 " + id,
		Lat: "22.3", Long: "114.2",
	}
}

func routeStop(company, r, dir, svc, seq, stopID string) RouteStop {
	return RouteStop{
		Company: company, Route: r, Direction: dir,
		ServiceType: svc, Seq: seq, Stop: stopID,
	}
}

// Reseeding must reproduce the snapshot, not merge into what is already there:
// upserting alone left routes and stops that the snapshot no longer contained.
func TestReplaceAllBusDataRemovesRowsAbsentFromTheSnapshot(t *testing.T) {
	setupDB(t)

	// Pre-existing data, none of which is in the snapshot below.
	if err := storeRoutes([]Route{route("KMB", "STALE", "O", "1")}); err != nil {
		t.Fatalf("seeding stale route: %v", err)
	}
	if err := storeStops([]Stop{stop("KMB", "STALE_STOP")}); err != nil {
		t.Fatalf("seeding stale stop: %v", err)
	}
	if err := storeRouteStops([]RouteStop{
		routeStop("KMB", "STALE", "O", "1", "1", "STALE_STOP"),
	}); err != nil {
		t.Fatalf("seeding stale route-stop: %v", err)
	}

	err := replaceAllBusData(busSnapshot{
		routes:     []Route{route("KMB", "1", "O", "1")},
		stops:      []Stop{stop("KMB", "A1")},
		routeStops: []RouteStop{routeStop("KMB", "1", "O", "1", "1", "A1")},
	})
	if err != nil {
		t.Fatalf("replaceAllBusData: %v", err)
	}

	db := testdb.Connect(t)
	for _, c := range []struct{ table, where string }{
		{"routes", "route = 'STALE'"},
		{"stops", "stop = 'STALE_STOP'"},
		{"route_stops", "route = 'STALE'"},
	} {
		if n := testdb.Count(t, db, c.table, c.where); n != 0 {
			t.Errorf("%s still has %d stale row(s); the snapshot should have replaced them", c.table, n)
		}
	}
	for _, table := range busTables {
		if n := testdb.Count(t, db, table, ""); n != 1 {
			t.Errorf("%s has %d rows, want exactly the 1 from the snapshot", table, n)
		}
	}
}

// replaceAllBusData deletes before it inserts, so its safety rests entirely on
// the surrounding transaction rolling back. Exercise that guarantee directly:
// the inserts themselves upsert, so they cannot be made to fail with data
// alone.
func TestRunInTxRollsBackOnError(t *testing.T) {
	setupDB(t)

	if err := storeRoutes([]Route{route("KMB", "1", "O", "1")}); err != nil {
		t.Fatalf("seeding: %v", err)
	}

	wantErr := errors.New("failure after the deletes")
	err := runInTx(func(tx *sql.Tx) error {
		// Mirror what replaceAllBusData does before inserting.
		if _, err := tx.Exec("DELETE FROM route_stops"); err != nil {
			return err
		}
		if _, err := tx.Exec("DELETE FROM routes"); err != nil {
			return err
		}
		return wantErr
	})

	if !errors.Is(err, wantErr) {
		t.Fatalf("err = %v, want it to surface the callback failure", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "routes", "route = '1'"); n != 1 {
		t.Errorf("routes = %d after rollback, want the original 1 row restored", n)
	}
}

// The transaction must also commit when the callback succeeds — a rollback-only
// test would pass even if nothing were ever written.
func TestRunInTxCommitsOnSuccess(t *testing.T) {
	setupDB(t)

	err := runInTx(func(tx *sql.Tx) error {
		return insertRoutesTx(tx, []Route{route("KMB", "1", "O", "1")})
	})
	if err != nil {
		t.Fatalf("runInTx: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "routes", "route = '1'"); n != 1 {
		t.Errorf("routes = %d, want the committed row", n)
	}
}

// A route number served by two operators must not have one operator's rows
// overwrite the other's — they are separate routes that merely share a number.
func TestStoreRouteStopsKeepsOperatorsSeparate(t *testing.T) {
	setupDB(t)

	err := storeRouteStops([]RouteStop{
		routeStop("KMB", "1", "O", "1", "1", "KMB_STOP"),
		routeStop("CTB", "1", "O", "", "1", "CTB_STOP"),
	})
	if err != nil {
		t.Fatalf("storeRouteStops: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "route_stops", "route = '1'"); n != 2 {
		t.Errorf("got %d rows for route 1, want one per operator", n)
	}
}

// ReplaceCompanyData is how a KMB refresh applies its bulk fetch; it must not
// disturb the other operator's rows.
func TestReplaceCompanyDataLeavesOtherOperatorsAlone(t *testing.T) {
	setupDB(t)

	if err := storeRoutes([]Route{route("CTB", "1", "", "")}); err != nil {
		t.Fatalf("seeding CTB: %v", err)
	}
	if err := storeStops([]Stop{stop("CTB", "CTB_STOP")}); err != nil {
		t.Fatalf("seeding CTB: %v", err)
	}

	err := ReplaceCompanyData("KMB",
		[]Route{route("KMB", "1", "O", "1")},
		[]Stop{stop("KMB", "KMB_STOP")},
		[]RouteStop{routeStop("KMB", "1", "O", "1", "1", "KMB_STOP")})
	if err != nil {
		t.Fatalf("ReplaceCompanyData: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "routes", "company = 'CTB'"); n != 1 {
		t.Errorf("CTB routes = %d, want 1 — replacing KMB must not touch CTB", n)
	}
	if n := testdb.Count(t, db, "stops", "company = 'CTB'"); n != 1 {
		t.Errorf("CTB stops = %d, want 1", n)
	}
}

// SeedFromCache is the path /api/admin/reseed takes; end to end it must leave
// the database matching the files on disk.
func TestSeedFromCacheAppliesTheSnapshotEndToEnd(t *testing.T) {
	setupDB(t)

	if err := storeRoutes([]Route{route("KMB", "STALE", "O", "1")}); err != nil {
		t.Fatalf("seeding stale data: %v", err)
	}

	dir := t.TempDir()
	busDir := filepath.Join(dir, "bus")
	files := map[string]interface{}{
		"kmb_routes.json":      []Route{route("KMB", "1", "O", "1"), route("KMB", "1", "I", "1")},
		"kmb_stops.json":       []Stop{stop("KMB", "A1"), stop("KMB", "A2")},
		"kmb_route_stops.json": []RouteStop{routeStop("KMB", "1", "O", "1", "1", "A1")},
		"ctb_routes.json":      []Route{route("CTB", "1", "", "")},
		"ctb_stops.json":       []Stop{stop("CTB", "001026")},
		"ctb_route_stops.json": []RouteStop{routeStop("CTB", "1", "O", "", "1", "001026")},
	}
	for name, body := range files {
		if err := cache.Save(filepath.Join(busDir, name), body); err != nil {
			t.Fatalf("writing %s: %v", name, err)
		}
	}

	if !SeedFromCache(dir) {
		t.Fatal("SeedFromCache returned false")
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "routes", "route = 'STALE'"); n != 0 {
		t.Errorf("stale route survived the reseed (%d rows)", n)
	}
	if n := testdb.Count(t, db, "routes", ""); n != 3 {
		t.Errorf("routes = %d, want the 3 in the snapshot", n)
	}
	if n := testdb.Count(t, db, "stops", ""); n != 3 {
		t.Errorf("stops = %d, want the 3 in the snapshot", n)
	}
	if n := testdb.Count(t, db, "route_stops", ""); n != 2 {
		t.Errorf("route_stops = %d, want the 2 in the snapshot", n)
	}
}
