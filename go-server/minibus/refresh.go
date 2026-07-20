package minibus

import (
	"encoding/json"
	"fmt"
	"log"

	"hk-transit-eta/internal/syncmeta"
)

// routeLastUpdate mirrors one entry of GET /last-update/route. The spec's
// table describes a wrapper object with a route_seq, but the live API
// (verified 2026-07) returns a bare array keyed by route_id only. Its
// last_update_date is a different event timestamp from the route detail's
// direction_data_timestamp (and always later), so the diff must compare it
// against the last_update_date stored by the previous refresh — never
// against detail timestamps, which would re-fetch everything every run.
type routeLastUpdate struct {
	RouteID        int    `json:"route_id"`
	LastUpdateDate string `json:"last_update_date"`
}

// Refresh incrementally re-syncs GMB data using the official Last Update API,
// so unchanged routes cost zero requests:
//
//  1. per-region route listings (3 requests) detect new and removed codes
//  2. GET /last-update/route (1 request) detects changed routes, compared
//     against the last_update_date stored by the previous refresh
//  3. only new/changed routes are re-fetched in full (detail + route-stops)
//  4. stop coordinates are fetched only for stops we don't have yet
//
// If timestamp formats ever diverge between the two endpoints the diff errs
// on the side of re-fetching, never on missing an update.
func Refresh() error {
	fmt.Println("=== Refreshing GMB data ===")

	// Stored state: route codes per region, the last_update_date recorded by
	// the previous refresh, and code lookup per route ID.
	type regionCode struct{ region, code string }
	dbCodes := map[regionCode]bool{}
	dbLastUpdate := map[int]string{}
	codeByID := map[int]regionCode{}
	rows, err := minibusDB.Query(
		`SELECT region, route_code, route_id, COALESCE(last_update_date, '') FROM minibus_route`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var rc regionCode
		var id int
		var ts string
		if err := rows.Scan(&rc.region, &rc.code, &id, &ts); err != nil {
			continue
		}
		dbCodes[rc] = true
		codeByID[id] = rc
		dbLastUpdate[id] = ts
	}
	rows.Close()

	// New and removed codes from the per-region listings.
	toFetch := map[regionCode]bool{}
	upstreamCodes := map[regionCode]bool{}
	for _, region := range []string{MinibusRegionHKI, MinibusRegionKLN, MinibusRegionNT} {
		resp, err := gmbFetch("https://data.etagmb.gov.hk/route/" + region)
		if err != nil {
			return fmt.Errorf("route listing for %s: %v", region, err)
		}
		var listing MinibusRegionalAPIResponse
		if err := json.Unmarshal(resp.Data, &listing); err != nil {
			return fmt.Errorf("unmarshal route listing for %s: %v", region, err)
		}
		for _, code := range listing.Routes {
			rc := regionCode{region, code}
			upstreamCodes[rc] = true
			if !dbCodes[rc] {
				toFetch[rc] = true // new route
			}
		}
	}

	var removedIDs []int
	for id, rc := range codeByID {
		if !upstreamCodes[rc] {
			removedIDs = append(removedIDs, id)
		}
	}

	// Changed directions via the Last Update API.
	resp, err := gmbFetch("https://data.etagmb.gov.hk/last-update/route")
	if err != nil {
		return fmt.Errorf("last-update/route: %v", err)
	}
	var updates []routeLastUpdate
	if err := json.Unmarshal(resp.Data, &updates); err != nil {
		return fmt.Errorf("unmarshal last-update/route: %v", err)
	}
	// Comparing against the last_update_date stored by the previous refresh
	// keeps the diff same-source: after one converging run it stays at zero
	// until upstream actually changes. Routes with no stored value (first run
	// after migration, or rows written by the initial fetch) are re-fetched
	// once, then converge.
	upstreamLastUpdate := map[int]string{}
	changedIDs := map[int]bool{}
	for _, u := range updates {
		upstreamLastUpdate[u.RouteID] = u.LastUpdateDate
		stored, known := dbLastUpdate[u.RouteID]
		if known && stored != u.LastUpdateDate {
			changedIDs[u.RouteID] = true
		}
	}
	for id := range changedIDs {
		if rc, ok := codeByID[id]; ok {
			toFetch[rc] = true
		}
	}

	fmt.Printf("GMB diff: %d routes to fetch, %d removed\n", len(toFetch), len(removedIDs))

	// Apply: drop removed and changed rows, then re-insert fresh data.
	if err := deleteMinibusRouteIDs(removedIDs); err != nil {
		return err
	}
	var changedList []int
	for id := range changedIDs {
		changedList = append(changedList, id)
	}
	if err := deleteMinibusRouteIDs(changedList); err != nil {
		return err
	}

	var fetched []MinibusRoute
	for rc := range toFetch {
		detail, err := fetchRouteDetail(rc.region, rc.code)
		if err != nil {
			log.Printf("Warning: skipping GMB route %s/%s: %v", rc.region, rc.code, err)
			continue
		}
		for i := range detail {
			detail[i].Region = rc.region
			detail[i].RouteCode = rc.code
		}
		fetched = append(fetched, detail...)
	}
	if len(fetched) > 0 {
		if err := upsertMinibusRoutes(fetched); err != nil {
			return err
		}
	}

	// Record the upstream last_update_date for every route just stored so the
	// next diff compares like with like and converges to zero.
	recorded := map[int]bool{}
	for _, r := range fetched {
		if recorded[r.RouteID] {
			continue
		}
		recorded[r.RouteID] = true
		if ts, ok := upstreamLastUpdate[r.RouteID]; ok {
			if _, err := minibusDB.Exec(
				`UPDATE minibus_route SET last_update_date = $1 WHERE route_id = $2`,
				ts, r.RouteID); err != nil {
				return fmt.Errorf("recording last_update_date for route %d: %v", r.RouteID, err)
			}
		}
	}

	// Coordinates for stops that appeared in new/changed route-stops.
	if err := FetchAndStoreStopCoordinates(); err != nil {
		log.Printf("Warning: GMB stop coordinate refresh incomplete: %v", err)
	}

	return syncmeta.Record("gmb", resp.GeneratedTimestamp)
}
