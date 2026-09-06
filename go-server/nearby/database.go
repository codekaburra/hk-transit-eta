package nearby

import "log"

// InitNearbyIndexes creates the indexes the coordinate search depends on.
//
// They live here rather than with the tables because they exist for this
// query. The bus and minibus packages own their schemas, and neither created
// any index on the columns involved — the stops table had none at all.
//
// There is deliberately no index on the bus coordinates. One can be built — a
// partial expression index on the casts, restricted by the same regex — and it
// turns the box lookup from a 9,000-row scan into an index scan, measured at
// 0.3 ms against 29 ms. It goes unused, because the MATERIALIZED CTE the query
// needs for safety materialises every parseable row before the box predicate is
// applied, and nothing can push an index through that.
//
// Removing the CTE would let the planner use such an index, and while it holds
// that plan the result is both fast and safe, since a partial index cannot
// contain an unparseable row. But it is safe only while that plan holds:
// PostgreSQL does not guarantee the order in which WHERE clauses are evaluated,
// so a plan change could apply the cast to a malformed row and fail every
// search at once — the failure bus.GetStopsNearby documents. Trading a
// correctness guarantee for 29 ms on a table of this size is not worth it.
//
// The real fix is to stop storing coordinates as text. That is a migration
// touching the seeding path, not something to slip into this query.
func InitNearbyIndexes() {
	statements := []string{
		// route_stops is joined by (stop, company) to collect the routes serving
		// each result, over 50k rows with only a primary key on id. This one the
		// planner does use, and it is where the time actually went.
		`CREATE INDEX IF NOT EXISTS idx_route_stops_stop_company
		 ON route_stops (stop, company)`,

		`CREATE INDEX IF NOT EXISTS idx_minibus_stop_coords
		 ON minibus_stop (latitude, longitude) WHERE enabled`,

		`CREATE INDEX IF NOT EXISTS idx_minibus_route_stop_stop_id
		 ON minibus_route_stop (stop_id)`,
	}
	for _, statement := range statements {
		if _, err := database.Exec(statement); err != nil {
			// Not fatal: the search is correct without an index, only slower,
			// and refusing to start over a missing index would take the whole
			// API down with it.
			log.Printf("creating nearby index: %v", err)
		}
	}
}
