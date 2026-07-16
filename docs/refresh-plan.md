# Data Fetch & Refresh Plan

Design plan for how the Go server should acquire and keep transit reference
data (routes, stops, route-stops) up to date. Written as a spec for
implementation — execute the steps in order, each as its own commit.

## Background

Routes and stops are **slowly-changing reference data** (they change a few
times a year), yet the current server treats every cold start as a reason to
re-fetch everything from the official APIs. That means thousands of sequential
HTTP requests on a fresh DB, with no retry, no rate limiting, and no refresh
path once data is loaded.

The official APIs are already designed to support incremental sync — the GMB
spec (section 8) exposes `last-update` endpoints — but we don't use them.

### Goals

1. Fresh clone / new deploy should cost **zero** API calls and start in seconds.
2. Refreshing changed data should cost a handful of requests, not thousands.
3. No zombie rows: data removed upstream must be removed locally.
4. Real-time ETA stays as-is — the frontend calls the official APIs directly;
   we never cache it.

## Current problems (must fix before/while building refresh)

These are prerequisites — the refresh plan is undermined without them.

### P2 — Upsert without delete leaks zombie rows (bus)

All three bus tables (`routes`, `stops`, `route_stops`) use
`ON CONFLICT ... DO UPDATE`. A route that is withdrawn or a stop that is
relocated upstream leaves its old row in the DB forever. Every refresh makes
this worse. (Minibus already does delete-by-region, so it is fine.)

**Fix:** bus refresh must delete-then-insert per company, inside a single
transaction, so a mid-refresh failure can't truncate live data.

### P3 — `COUNT(*) > 0` is the only sync signal

`shouldFetchData()` only knows whether a table is empty. This causes two
failure modes:

- A fetch that dies halfway leaves partial data → next start sees "has data"
  → never completes.
- A successful fetch never refreshes → data goes stale forever.

Refresh needs to know *when* we last synced and *what* the upstream
`data_timestamp` was.

**Fix:** add a small metadata table:

```sql
CREATE TABLE IF NOT EXISTS sync_meta (
    entity        TEXT PRIMARY KEY,   -- e.g. 'kmb_routes', 'gmb_hki_routes'
    last_synced   TIMESTAMPTZ NOT NULL,
    data_timestamp TEXT                -- upstream timestamp, for diffing
);
```

Write to it after each successful seed/refresh. This also fixes the
partial-seed-never-completes bug.

Also: KMB currently hard-sets `data_timestamp = ""` in `kmb.go`. Verified
against the live API (2026-07): KMB bulk responses carry **no per-record**
`data_timestamp` — only the envelope-level `generated_timestamp`. Store the
envelope timestamp into `sync_meta` instead. Citybus route-stop responses DO
carry a per-record `data_timestamp`, which `fetchCitybusRouteStops` currently
discards — keep it, since the CTB changed-route-only refresh diffs on it.

### P4 — HTTP client has no timeout

Before adding any background job, confirm `FetchAPI` / `fetchAPI` construct an
`http.Client{ Timeout: ... }`. Without it, one hung request stalls the whole
refresh. CTB's thousands of per-stop requests also need a small delay + retry.

### P5 — Duplicated cache code

`bus/cache.go` and `minibus/cache.go` are ~90% identical, and there are two
near-identical `FetchAPI` / `fetchAPI` helpers. Refresh logic will amplify the
duplication. Extract shared packages first:

- `go-server/internal/cache` — save/load/exists + seed helpers
- `go-server/internal/httpapi` — one HTTP client (with timeout) + fetch wrapper

Also fix in passing: the `minbusCacheDir` typo (missing "i"), and the
swallowed error at `city-bus.go` `stops, _ := fetchCitybusStops(...)`.

## Refresh strategy per source

| Source | Bulk list? | Refresh approach |
|---|---|---|
| KMB | Yes (3 endpoints: route, stop, route-stop) | Full re-fetch (only 3 requests), diff by `data_timestamp`, delete-then-insert |
| Citybus | routes only; stops & route-stops are per-item | Re-fetch route list; only re-fetch route-stops/stops for routes whose `data_timestamp` changed |
| GMB | Yes, plus `last-update` endpoints | Call `GET /last-update/route`, `/last-update/stop`, `/last-update/route-stop`; compare against `sync_meta` / stored timestamps; re-fetch only changed entities |

GMB `last-update` collapses a few-thousand-request refresh into a handful.

## Baseline snapshot in git

Commit one **baseline** JSON snapshot so startup seeds from disk with zero API
calls.

- Use **compact** JSON, not pretty-printed. `saveCache` currently calls
  `enc.SetIndent("", "  ")`, which roughly doubles file size — drop it (consider
  gzip if the total exceeds a few MB).
- Commit the snapshot **once**. Do **not** re-commit data on every refresh —
  that bloats git history by megabytes over time. Refresh updates the DB; only
  re-commit the snapshot deliberately (e.g. when schema changes).
- If the total is large (>~50 MB), use Git LFS instead. Estimate first.

## Startup behavior

1. On boot, always attempt to seed from the committed JSON snapshot
   (`SeedFromCache`) — this is fast and offline.
2. Only fall back to live API fetch if the snapshot is missing.
3. Record the result in `sync_meta`.

## Refresh trigger

Prefer the simplest reliable option:

- Expose `POST /admin/refresh` (protect it — shared secret / internal-only).
- Drive it from host cron or manual invocation.
- **Avoid** an in-process weekly ticker: containers restart at arbitrary times,
  so wall-clock scheduling inside the process is unreliable.

## Execution order (each = its own commit)

1. `git push` current branch + open PR to `main`. PR body **must** note the
   `route_stops` UNIQUE change requires a DB reset (`docker compose down -v`) —
   `CREATE TABLE IF NOT EXISTS` won't alter an existing table.
2. Extract `internal/cache` + `internal/httpapi` (P5); add HTTP client timeout
   (P4); fix swallowed CTB error; stop discarding KMB `data_timestamp`.
3. Add `sync_meta` table (P3); write to it on seed/refresh.
4. Bus refresh → delete-then-insert inside a transaction (P2).
5. Run one full fetch; write compact JSON; commit the baseline snapshot (P1).
6. Add `POST /admin/refresh`: GMB `last-update` diff + KMB bulk re-fetch + CTB
   changed-route-only re-fetch (P4 retry/delay).

Run `go build ./... && go vet ./...` after steps 2–4.

## Out of scope

- Caching real-time ETA (frontend calls official APIs directly — keep it that
  way; it also saves our server bandwidth).
- Automated CI cron that opens data-update PRs — high complexity, low payoff;
  skip unless clearly needed later.
