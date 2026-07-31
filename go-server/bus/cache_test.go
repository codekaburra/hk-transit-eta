package bus

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"hk-transit-eta/internal/cache"
)

// snapshotFiles is the set SeedFromCache requires; all six must be present and
// parseable before anything is written.
var snapshotFiles = []string{
	"kmb_routes.json", "kmb_stops.json", "kmb_route_stops.json",
	"ctb_routes.json", "ctb_stops.json", "ctb_route_stops.json",
}

// writeSnapshot lays out a complete snapshot directory, overriding any files
// given in contents.
func writeSnapshot(t *testing.T, contents map[string]interface{}) string {
	t.Helper()
	dir := t.TempDir()
	busDir := filepath.Join(dir, "bus")
	for _, name := range snapshotFiles {
		body, ok := contents[name]
		if !ok {
			body = []interface{}{}
		}
		if err := cache.Save(filepath.Join(busDir, name), body); err != nil {
			t.Fatalf("writing %s: %v", name, err)
		}
	}
	return dir
}

func TestSeedFromCacheRequiresEveryFile(t *testing.T) {
	for _, missing := range snapshotFiles {
		t.Run("missing "+missing, func(t *testing.T) {
			dir := writeSnapshot(t, nil)
			if err := os.Remove(filepath.Join(dir, "bus", missing)); err != nil {
				t.Fatalf("removing %s: %v", missing, err)
			}
			// Returns false before touching the database, so a nil connection
			// here would panic if it tried to write.
			if SeedFromCache(dir) {
				t.Errorf("expected false when %s is absent", missing)
			}
		})
	}
}

// A malformed file must be caught during loading — before any write — so a
// partly-applied dataset is impossible.
func TestSeedFromCacheRejectsMalformedFileBeforeWriting(t *testing.T) {
	dir := writeSnapshot(t, nil)
	bad := filepath.Join(dir, "bus", "ctb_route_stops.json")
	if err := os.WriteFile(bad, []byte("{not json"), 0o644); err != nil {
		t.Fatalf("corrupting %s: %v", bad, err)
	}

	// A write attempt would panic on the nil database connection, so reaching
	// a plain false proves loading failed first.
	if SeedFromCache(dir) {
		t.Error("expected false for a malformed snapshot file")
	}
}

func TestLoadBusSnapshotCombinesBothOperators(t *testing.T) {
	dir := writeSnapshot(t, map[string]interface{}{
		"kmb_routes.json": []Route{{Company: "KMB", Route: "1", Direction: "O", ServiceType: "1"}},
		"ctb_routes.json": []Route{{Company: "CTB", Route: "1"}},
		"kmb_stops.json":  []Stop{{Company: "KMB", Stop: "A1"}},
		"ctb_stops.json":  []Stop{{Company: "CTB", Stop: "001026"}},
		"kmb_route_stops.json": []RouteStop{
			{Company: "KMB", Route: "1", Direction: "O", ServiceType: "1", Seq: "1", Stop: "A1"},
		},
		"ctb_route_stops.json": []RouteStop{
			{Company: "CTB", Route: "1", Direction: "O", Seq: "1", Stop: "001026"},
		},
	})

	busDir := filepath.Join(dir, "bus")
	files := make([]string, len(snapshotFiles))
	for i, name := range snapshotFiles {
		files[i] = filepath.Join(busDir, name)
	}

	snap, err := loadBusSnapshot(files)
	if err != nil {
		t.Fatalf("loadBusSnapshot: %v", err)
	}

	if len(snap.routes) != 2 || len(snap.stops) != 2 || len(snap.routeStops) != 2 {
		t.Fatalf("got %d routes, %d stops, %d route-stops; want 2 of each",
			len(snap.routes), len(snap.stops), len(snap.routeStops))
	}

	companies := map[string]bool{}
	for _, r := range snap.routes {
		companies[r.Company] = true
	}
	if !companies["KMB"] || !companies["CTB"] {
		t.Errorf("both operators must be loaded, got %v", companies)
	}
}

func TestLoadBusSnapshotReportsTheOffendingFile(t *testing.T) {
	dir := writeSnapshot(t, nil)
	busDir := filepath.Join(dir, "bus")
	bad := filepath.Join(busDir, "ctb_stops.json")
	if err := os.WriteFile(bad, []byte("{not json"), 0o644); err != nil {
		t.Fatalf("corrupting file: %v", err)
	}

	files := make([]string, len(snapshotFiles))
	for i, name := range snapshotFiles {
		files[i] = filepath.Join(busDir, name)
	}

	_, err := loadBusSnapshot(files)
	if err == nil {
		t.Fatal("expected an error for a malformed file")
	}
	if !strings.Contains(err.Error(), "ctb_stops.json") {
		t.Errorf("error should name the file that failed, got: %v", err)
	}
}
