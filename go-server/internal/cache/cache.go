// Package cache reads and writes the local JSON snapshots used to seed the
// database without hitting the official APIs.
package cache

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Save writes v as compact JSON, creating parent directories as needed.
// Compact (not indented) output keeps committed snapshots roughly half the
// size of pretty-printed ones.
func Save(path string, v interface{}) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(v)
}

// Load decodes the JSON file at path into v.
func Load(path string, v interface{}) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(v)
}

// Exists reports whether every given path exists.
func Exists(paths ...string) bool {
	for _, p := range paths {
		if _, err := os.Stat(p); err != nil {
			return false
		}
	}
	return true
}
