package syncmeta

import (
	"testing"
	"time"

	"hk-transit-eta/internal/testdb"
)

func setup(t *testing.T) {
	t.Helper()
	db := testdb.Connect(t)
	if err := Init(db); err != nil {
		t.Fatalf("Init: %v", err)
	}
	testdb.Truncate(t, db, "sync_meta")
}

// Init creates the table and must tolerate being called on every startup.
func TestInitIsRepeatable(t *testing.T) {
	db := testdb.Connect(t)
	for i := 0; i < 3; i++ {
		if err := Init(db); err != nil {
			t.Fatalf("Init call %d: %v", i+1, err)
		}
	}
}

// An entity that has never synced must be reported as unknown rather than as a
// zero timestamp, which would read as "synced long ago" and suppress a fetch.
func TestGetReportsUnknownEntity(t *testing.T) {
	setup(t)

	_, _, ok := Get("never-synced")
	if ok {
		t.Error("ok = true for an entity that was never recorded")
	}
}

func TestRecordThenGet(t *testing.T) {
	setup(t)

	before := time.Now().Add(-time.Second)
	if err := Record("kmb", "2026-07-31T00:00:00+08:00"); err != nil {
		t.Fatalf("Record: %v", err)
	}

	lastSynced, dataTimestamp, ok := Get("kmb")
	if !ok {
		t.Fatal("ok = false after recording")
	}
	if dataTimestamp != "2026-07-31T00:00:00+08:00" {
		t.Errorf("dataTimestamp = %q, want the value recorded", dataTimestamp)
	}
	if lastSynced.Before(before) {
		t.Errorf("lastSynced = %v, want a time from this test run", lastSynced)
	}
}

// Recording the same entity again must update it, not fail on the primary key
// or leave a second row — a refresh records the same entity every run.
func TestRecordUpdatesInPlace(t *testing.T) {
	setup(t)

	if err := Record("ctb", "first"); err != nil {
		t.Fatalf("first Record: %v", err)
	}
	firstSynced, _, _ := Get("ctb")

	time.Sleep(10 * time.Millisecond)
	if err := Record("ctb", "second"); err != nil {
		t.Fatalf("second Record: %v", err)
	}

	db := testdb.Connect(t)
	if n := testdb.Count(t, db, "sync_meta", "entity = 'ctb'"); n != 1 {
		t.Errorf("got %d rows for ctb, want exactly 1", n)
	}

	secondSynced, dataTimestamp, ok := Get("ctb")
	if !ok {
		t.Fatal("ok = false after the second record")
	}
	if dataTimestamp != "second" {
		t.Errorf("dataTimestamp = %q, want the newer value", dataTimestamp)
	}
	if !secondSynced.After(firstSynced) {
		t.Errorf("lastSynced did not advance: %v then %v", firstSynced, secondSynced)
	}
}

// Sources that publish no timestamp of their own record an empty string; that
// must round-trip rather than becoming a NULL the scan cannot handle.
func TestRecordAcceptsAnEmptyDataTimestamp(t *testing.T) {
	setup(t)

	if err := Record("gmb", ""); err != nil {
		t.Fatalf("Record: %v", err)
	}

	_, dataTimestamp, ok := Get("gmb")
	if !ok {
		t.Fatal("ok = false")
	}
	if dataTimestamp != "" {
		t.Errorf("dataTimestamp = %q, want an empty string", dataTimestamp)
	}
}

func TestEntitiesAreIndependent(t *testing.T) {
	setup(t)

	for _, e := range []string{"kmb", "ctb", "gmb"} {
		if err := Record(e, e+"-stamp"); err != nil {
			t.Fatalf("Record(%s): %v", e, err)
		}
	}

	for _, e := range []string{"kmb", "ctb", "gmb"} {
		_, dataTimestamp, ok := Get(e)
		if !ok || dataTimestamp != e+"-stamp" {
			t.Errorf("Get(%s) = %q, %v; want its own value", e, dataTimestamp, ok)
		}
	}
}
