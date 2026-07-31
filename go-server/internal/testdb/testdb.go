// Package testdb provides a PostgreSQL connection for tests.
//
// The handlers and seeding logic are mostly SQL, so testing them meaningfully
// needs a real database — SQL that is merely well-formed can still join, order
// or upsert incorrectly, and only a real engine catches that.
//
// Tests skip when TEST_DATABASE_URL is unset, so `go test ./...` still works on
// a machine with no database. CI sets it, so they run there.
package testdb

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Connect returns a handle to the test database, skipping the test when none
// is configured. The returned database is closed automatically.
func Connect(t *testing.T) *sql.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database-backed test")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("opening test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		t.Fatalf("connecting to test database at %s: %v", dsn, err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// Truncate empties the given tables so each test starts from a known state.
// Tests within a package share one database, so this must run before any test
// that asserts on row counts.
func Truncate(t *testing.T, db *sql.DB, tables ...string) {
	t.Helper()
	for _, table := range tables {
		if _, err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table)); err != nil {
			t.Fatalf("truncating %s: %v", table, err)
		}
	}
}

// Count returns the number of rows matching an optional WHERE clause.
func Count(t *testing.T, db *sql.DB, table, where string, args ...interface{}) int {
	t.Helper()
	query := "SELECT COUNT(*) FROM " + table
	if where != "" {
		query += " WHERE " + where
	}
	var n int
	if err := db.QueryRow(query, args...).Scan(&n); err != nil {
		t.Fatalf("counting %s: %v", table, err)
	}
	return n
}
