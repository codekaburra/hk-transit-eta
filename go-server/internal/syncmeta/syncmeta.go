// Package syncmeta records when each data entity was last successfully
// synced and what upstream timestamp it carried. This replaces the old
// "table is non-empty" heuristic, which could neither detect a half-finished
// seed nor tell whether data was stale.
package syncmeta

import (
	"database/sql"
	"time"
)

var db *sql.DB

// Init stores the connection and creates the sync_meta table.
func Init(d *sql.DB) error {
	db = d
	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS sync_meta (
		entity         TEXT PRIMARY KEY,
		last_synced    TIMESTAMPTZ NOT NULL,
		data_timestamp TEXT
	);`)
	return err
}

// Record upserts the sync result for an entity (e.g. "kmb", "ctb",
// "gmb_HKI"). dataTimestamp is the upstream timestamp when available, "" if
// the source doesn't provide one.
func Record(entity, dataTimestamp string) error {
	_, err := db.Exec(`
	INSERT INTO sync_meta (entity, last_synced, data_timestamp)
	VALUES ($1, NOW(), $2)
	ON CONFLICT (entity) DO UPDATE SET
		last_synced = NOW(),
		data_timestamp = EXCLUDED.data_timestamp`, entity, dataTimestamp)
	return err
}

// Get returns the last sync time and upstream timestamp for an entity.
// ok is false if the entity has never been recorded.
func Get(entity string) (lastSynced time.Time, dataTimestamp string, ok bool) {
	var ts sql.NullString
	err := db.QueryRow(
		`SELECT last_synced, data_timestamp FROM sync_meta WHERE entity = $1`,
		entity).Scan(&lastSynced, &ts)
	if err != nil {
		return time.Time{}, "", false
	}
	return lastSynced, ts.String, true
}
