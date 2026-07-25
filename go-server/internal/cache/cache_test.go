package cache

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type sample struct {
	Name string `json:"name"`
	Seq  int    `json:"seq"`
}

func TestSaveLoadRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "nested", "sample.json")

	in := []sample{{Name: "Central", Seq: 1}, {Name: "Admiralty", Seq: 2}}
	if err := Save(path, in); err != nil {
		t.Fatalf("Save: %v", err)
	}

	var out []sample
	if err := Load(path, &out); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(out) != 2 || out[0] != in[0] || out[1] != in[1] {
		t.Fatalf("round trip mismatch: got %+v, want %+v", out, in)
	}
}

func TestSaveWritesCompactJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "compact.json")
	if err := Save(path, []sample{{Name: "Central", Seq: 1}}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	// A compact encoding is a single line (plus the trailing newline the
	// encoder emits); indented output would span multiple lines.
	if strings.Count(strings.TrimRight(string(raw), "\n"), "\n") != 0 {
		t.Fatalf("expected compact single-line JSON, got:\n%s", raw)
	}
}

func TestLoadMissingFileFails(t *testing.T) {
	var out sample
	if err := Load(filepath.Join(t.TempDir(), "nope.json"), &out); err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
}

func TestExists(t *testing.T) {
	dir := t.TempDir()
	a := filepath.Join(dir, "a.json")
	if err := Save(a, sample{}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if !Exists(a) {
		t.Fatal("Exists(a) = false, want true")
	}
	if Exists(a, filepath.Join(dir, "missing.json")) {
		t.Fatal("Exists with a missing path = true, want false")
	}
}
