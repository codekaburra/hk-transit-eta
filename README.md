# HK Transit ETA

[![CI](https://github.com/codekaburra/hk-transit-eta/actions/workflows/ci.yml/badge.svg)](https://github.com/codekaburra/hk-transit-eta/actions/workflows/ci.yml)

Real-time route, stop, ETA, and weather information for Hong Kong public transport. The app covers KMB, Citybus, green minibuses (GMB), MTR station information, and Hong Kong Observatory weather data.

## Quick start

Run the full development stack with hot reload:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Then open:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

The development database uses `hkbus` / `hkbus_password` / database `hkbus`.

On first start, the backend seeds PostgreSQL from the committed JSON snapshot in `go-server/data/`. This is offline and usually finishes in a few seconds. If the snapshot is missing, the backend falls back to the official transport APIs, which can take several minutes.

## Features

- Bus route search, stop lookup, nearby stops, and real-time ETA for KMB and Citybus
- Green minibus routes across HKI, KLN, and NT, including stop sequences and headway schedules
- MTR station listing and route map
- Weather dashboard using Hong Kong Observatory data
- English, Traditional Chinese, and Simplified Chinese UI text
- Light, dark, and custom colour themes
- Responsive React UI built with Tailwind CSS

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Go 1.26, Gorilla Mux, pgx |
| Frontend | React 19, TypeScript, Tailwind CSS, React Router 7 |
| Database | PostgreSQL 16 |
| Infrastructure | Docker Compose, nginx, Air |
| Tests | Go test, React Testing Library, Playwright |

## Local development

### Prerequisites

For Docker development:

- Docker
- Docker Compose

For running services directly on your machine:

- Go 1.26+
- Node.js 18+
- PostgreSQL

### Development stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

The dev stack runs as its own Compose project (`hk-transit-eta-dev`, against production's `hk-transit-eta`), so the two share no containers or volumes.

Files under `go-server/` and `react-ui/src/` reload automatically.

### Local configuration

`.env` is optional for local Docker development. The dev Compose file provides the required database and API configuration.

Only one value is read from `.env` by the dev stack:

| Variable | Default | Effect |
|---|---|---|
| `REACT_APP_GOOGLE_MAPS_API_KEY` | empty | Route maps render blank when unset. |

```bash
cp .env.example .env
# then set REACT_APP_GOOGLE_MAPS_API_KEY if you need route maps
```

The remaining values in `.env.example` are for the production stack. In particular, `POSTGRES_PASSWORD` does not change the development database password; the dev stack always uses `hkbus_password`.

The Go server reads process environment variables directly and does not load `.env` by itself. If you run it with `go run .`, export environment variables in your shell. The React dev server reads `react-ui/.env.local`.

### Running without Docker

Create a PostgreSQL database named `hkbus`, then start the backend:

```bash
cd go-server
go run .
```

In a second terminal, start the frontend:

```bash
cd react-ui
npm install
npm start
```

Backend defaults:

| Variable | Default |
|---|---|
| `DATABASE_URL` | `postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable` |
| `PORT` | `8080` |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |

## Production stack

To build and inspect the production image locally:

```bash
docker compose up --build
```

This serves the app on http://localhost:80. nginx serves the React build and proxies `/api/*` to the Go backend.

The production stack can start without `.env` because defaults are provided, but those defaults are only suitable for local inspection. Set production values before exposing the service publicly.

## Tests

Frontend unit tests:

```bash
cd react-ui
CI=true npm test
```

Go tests:

```bash
cd go-server
go test ./...
```

Database-backed Go tests are skipped when `TEST_DATABASE_URL` is unset. To run them, use a dedicated test database because the tests truncate tables:

```bash
docker compose -f docker-compose.dev.yml up -d db
docker compose -f docker-compose.dev.yml exec db createdb -U hkbus hkbus_test

cd go-server
TEST_DATABASE_URL="postgres://hkbus:hkbus_password@localhost:5432/hkbus_test?sslmode=disable" go test ./...
```

End-to-end tests run against the production Compose stack, matching CI:

```bash
npm ci
npx playwright install chromium
docker compose up -d --build
npx playwright test
```

The Playwright base URL defaults to `http://localhost`. Override it with `E2E_BASE_URL`.

## Deploy to EC2

The production stack (`docker-compose.yaml`) runs PostgreSQL, the Go backend, and the nginx frontend. PostgreSQL is internal to the Docker network and is not exposed on the host.

TLS should be terminated by an existing reverse proxy or load balancer. The app serves plain HTTP on `FRONTEND_PORT` (default `80`); forward your HTTPS frontend to that port.

### Environment

Create `.env` on the server before exposing the app:

```bash
cp .env.example .env
$EDITOR .env
```

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | Database password. The default is published in this repository. |
| `CORS_ORIGINS` | yes | Deployed `https://` origin, comma-separated for multiple origins. |
| `ADMIN_TOKEN` | recommended | Authorises refresh and reseed endpoints. Empty disables both. |
| `FRONTEND_PORT` | no | Host port for the TLS proxy to forward to. Default `80`. |
| `POSTGRES_DB`, `POSTGRES_USER` | no | Default `hkbus`. |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | no | Applied at image build time. Maps render blank when unset. |
| `REACT_APP_API_URL` | no | Default `/api`, served same-origin through nginx. |

### First-time bootstrap

On a fresh Amazon Linux or Ubuntu instance:

```bash
curl -fsSL https://raw.githubusercontent.com/codekaburra/hk-transit-eta/main/deploy/setup-ec2.sh | bash
```

The script installs Docker with the Compose plugin and clones the repository to `~/hk-transit-eta`.

If your user was just added to the `docker` group, log out and back in before deploying.

### Deploy or redeploy

```bash
cd ~/hk-transit-eta
./deploy/deploy.sh
```

The deploy script pulls the latest code, rebuilds images, restarts containers, waits for the backend health check, and prunes old images.

Useful commands:

```bash
docker compose logs -f
docker compose down
```

### GitHub Actions deployment

`.github/workflows/deploy.yml` deploys automatically after CI passes on `main`. It can also be triggered manually from the Actions tab.

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Required | Description |
|---|---|---|
| `EC2_HOST` | yes | Public IP or DNS of the instance. |
| `EC2_SSH_KEY` | yes | Private SSH key authorised on the instance. |
| `EC2_USER` | no | SSH user. Defaults to `ec2-user`. |
| `EC2_APP_DIR` | no | Repo path on the box. Defaults to `~/hk-transit-eta`. |

Generate a dedicated deploy key and authorise it on the box:

```bash
ssh-keygen -t ed25519 -C "gha-deploy" -f gha_deploy -N ""
ssh-copy-id -i gha_deploy.pub <user>@<ec2-host>
# or append gha_deploy.pub to ~/.ssh/authorized_keys
```

Paste the private key (`gha_deploy`) into the `EC2_SSH_KEY` secret.

Until `EC2_HOST` is set, the deploy job skips cleanly. The server still needs its `.env` file in place before deployment.

## Updating transit data

The database seeds from the committed snapshot only when it is empty. Deploying a newer snapshot does not automatically replace data in an existing PostgreSQL volume.

Use the admin endpoints to update data in place. Both require `ADMIN_TOKEN`, run in the background, and only one admin job may run at a time.

| Endpoint | Source | Typical time | Use when |
|---|---|---|---|
| `POST /api/admin/reseed` | Snapshot inside the current backend image | seconds | A deploy shipped updated snapshot data. |
| `POST /api/admin/refresh` | Official operator APIs | minutes | You want data newer than the snapshot. |

```bash
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" https://your-domain/api/admin/reseed
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" https://your-domain/api/admin/refresh
```

Watch progress with:

```bash
docker compose logs -f backend
```

## API overview

All endpoints are under `/api` and return JSON.

### General

| Method | Path | Description |
|---|---|---|
| GET | `/api/num-routes?type={bus\|minibus}` | Route count by transport type. |

### Bus

| Method | Path | Description |
|---|---|---|
| GET | `/api/bus/routes` | List routes, limited to 100 rows. |
| GET | `/api/bus/stops` | List stops, limited to 100 rows. |
| GET | `/api/bus/route-stops` | List route-stop mappings, limited to 100 rows. |
| GET | `/api/bus/route-variants?routeId=&company=` | Exact-match route variants: one row per direction and service type. |
| GET | `/api/bus/stop-by-id?stopId=` | Stop details by ID. |
| GET | `/api/bus/search/routes?q=` | Substring search by number, origin, or destination. Capped at 50 rows. |
| GET | `/api/bus/search/stops?q=` | Substring search by ID or name. Capped at 50 rows. |
| GET | `/api/bus/stops-by-route?routeId=&company=&direction=&serviceType=` | Stops along a route with coordinates. Without the filters, a route number served by two operators returns every sequence interleaved. |
| GET | `/api/bus/routes-by-stop?stopId=` | Routes serving a stop. |
| GET | `/api/bus/stops-nearby?stopId=` | Nearby stops within roughly 100 m. |

### Minibus

| Method | Path | Description |
|---|---|---|
| GET | `/api/minibus/routes?region=` | List routes, optionally filtered by region (`HKI`, `KLN`, `NT`). |
| GET | `/api/minibus/stops` | List stops with coordinates, limited to 100 rows. |
| GET | `/api/minibus/route-stops?routeId=&routeSeq=` | Stops for a route direction. |
| GET | `/api/minibus/stop-by-id?stopId=` | Stop details by ID. |
| GET | `/api/minibus/search/routes?q=` | Search routes by code or description. |
| GET | `/api/minibus/search/stops?q=` | Search stops by name. |
| GET | `/api/minibus/routes-by-stop?stopId=` | Routes serving a stop. |
| GET | `/api/minibus/route-details?routeId=&routeSeq=` | Route details with headway schedule. |

## Database schema

PostgreSQL tables are created automatically on backend startup.

### Bus

| Table | Purpose |
|---|---|
| `routes` | KMB and Citybus route information. |
| `stops` | Bus stop names and coordinates. |
| `route_stops` | Route-to-stop sequence mappings. |

### Minibus

| Table | Purpose |
|---|---|
| `minibus_route` | GMB route directions and descriptions. |
| `minibus_stop` | GMB stop coordinates, including WGS84 and HK80 values. |
| `minibus_route_stop` | GMB route-to-stop sequence mappings. |
| `minibus_headway` | GMB service frequency by weekday and time range. |

## Data sources

- KMB: `https://data.etabus.gov.hk/v1/transport/kmb/`
- Citybus: `https://rt.data.gov.hk/v2/transport/citybus/`
- GMB: `https://data.etagmb.gov.hk/`
- Hong Kong Observatory: weather data used by the frontend dashboard

All transit data is sourced from official Hong Kong government or operator APIs.

## Troubleshooting

### I started Docker, but localhost:8080 does not show the app

That is expected in the development stack. The React app is served at http://localhost:3000. Port `8080` is the backend API, so use paths such as http://localhost:8080/api/bus/routes.

In the production stack, the app is served through nginx at http://localhost:80.

### Changes to `.env` do not affect local development

For the dev stack, Compose provides most variables directly. Only `REACT_APP_GOOGLE_MAPS_API_KEY` is read from the root `.env`.

For `go run .`, export variables in your shell because the Go server does not load `.env` automatically.

For `npm start`, use `react-ui/.env.local`.

### Go database tests pass too quickly

Database-backed tests skip unless `TEST_DATABASE_URL` is set. Use a dedicated test database if you want to run the full SQL test suite.

### `docker compose down` stopped the wrong stack

Run it with the same `-f` flag you started the stack with. `docker compose down` targets the production project; `docker compose -f docker-compose.dev.yml down` targets the development one.

The two are separate projects (`hk-transit-eta` and `hk-transit-eta-dev`), so neither can remove the other's containers or volumes. To inspect or remove a volume directly, its name is prefixed with the project name — for example `hk-transit-eta-dev_postgres_dev_data`.

## Project structure

```text
hk-transit-eta/
├── go-server/
│   ├── main.go                # Server entry point, routing, DB init
│   ├── bus/                   # KMB + Citybus API, DB, fetchers, cache, types
│   ├── minibus/               # GMB API, DB, fetchers, cache, types
│   └── data/                  # Local JSON snapshots
├── react-ui/
│   └── src/
│       ├── components/        # App UI, transport views, weather views
│       ├── contexts/          # Theme context
│       ├── services/          # API client
│       └── types/             # TypeScript types
├── deploy/                    # EC2 setup and deploy scripts
├── api-spec/                  # Official API specification documents
├── docker-compose.yaml        # Production stack
├── docker-compose.dev.yml     # Development stack
└── .env.example
```
