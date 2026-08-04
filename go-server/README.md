# HK Transit ETA — Go Server

Go backend for HK Transit ETA. It serves the `/api` endpoints and stores route and stop reference data in PostgreSQL, which it fetches from the official Hong Kong transport APIs.

It covers buses and green minibuses only. Live arrival times and MTR data are requested by the browser directly from the operators' APIs, so this service is not in either path.

For the full project setup, Docker commands, deployment flow, and API overview, see the root [README](../README.md).

## What this service does

- Creates and migrates the PostgreSQL tables on startup.
- Seeds bus and minibus data from local JSON snapshots in `data/`.
- Refreshes KMB, Citybus, and GMB route and stop data from the official APIs.
- Serves route search, stop lookup, nearby stop, and route detail endpoints.
- Provides admin refresh/reseed endpoints when `ADMIN_TOKEN` is configured.

## Requirements

- Go 1.26+
- PostgreSQL 16+

If you use Docker Compose from the repository root, these are provided by the development stack.

## Run locally without Docker

Create a PostgreSQL database named `hkbus`, then run:

```bash
go run .
```

Default environment values:

| Variable | Default |
|---|---|
| `DATABASE_URL` | `postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable` |
| `PORT` | `8080` |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |
| `ADMIN_TOKEN` | empty, admin endpoints disabled |

The server does not load `.env` automatically. Export variables in your shell when running with `go run .`.

## Tests

Run unit tests:

```bash
go test ./...
```

Database-backed tests require `TEST_DATABASE_URL`. They are skipped when it is not set.

Example using the dev Compose database:

```bash
docker compose -f ../docker-compose.dev.yml up -d db
docker compose -f ../docker-compose.dev.yml exec db createdb -U hkbus hkbus_test

TEST_DATABASE_URL="postgres://hkbus:hkbus_password@localhost:5432/hkbus_test?sslmode=disable" go test ./...
```

Use a dedicated test database because these tests truncate the tables they exercise.

## Main packages

| Path | Purpose |
|---|---|
| `main.go` | HTTP routing, middleware, startup, admin endpoints. |
| `bus/` | KMB and Citybus data fetching, storage, and API handlers. |
| `minibus/` | GMB data fetching, storage, and API handlers. |
| `internal/` | Shared internal helpers. |
| `data/` | JSON snapshots used for offline seeding. |
