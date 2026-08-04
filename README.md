# HK Transit ETA

[![CI](https://github.com/codekaburra/hk-transit-eta/actions/workflows/ci.yml/badge.svg)](https://github.com/codekaburra/hk-transit-eta/actions/workflows/ci.yml)

Real-time ETA and route information for Hong Kong public transport — buses (KMB, Citybus), green minibuses (GMB), and MTR. Includes a weather dashboard with HK Observatory data.

## Features

- **Bus (KMB + Citybus)** — route search, stop lookup, real-time ETA from official APIs
- **Green Minibus (GMB)** — routes across HKI / KLN / NT regions, stop sequences, headway schedules
- **MTR** — station listing and route map
- **Weather** — nine-day forecast and rainfall nowcast from HK Observatory
- **Multi-language** — English, Traditional Chinese, Simplified Chinese
- **Themes** — light, dark, and custom colour schemes with smooth transitions
- **Responsive** — mobile-first layout with Tailwind CSS

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Go 1.26, Gorilla Mux, pgx (PostgreSQL driver) |
| Frontend | React 19, TypeScript, Tailwind CSS, React Router 7 |
| Database | PostgreSQL 16 |
| Infra | Docker Compose, nginx (prod reverse proxy), Air (dev hot-reload) |

## Getting Started

Two independent paths, using different Compose files and different
configuration:

- **[Local development](#local-development)** — hot-reload stack via Docker Compose. No configuration required.
- **[Deploy to EC2](#deploy-to-ec2)** — production stack behind an existing HTTPS proxy. Requires `.env`.

---

## Local Development

### Prerequisites

Docker and Docker Compose. Go 1.26+ and Node.js 18+ are required only to run the
services outside Docker.

### Development stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL | Credentials |
|---|---|---|
| Frontend (React dev server) | http://localhost:3000 | — |
| Backend API | http://localhost:8080 | — |
| PostgreSQL | localhost:5432 | `hkbus` / `hkbus_password` / db `hkbus` |

Changes under `go-server/` and `react-ui/src/` reload automatically.

On an empty database the backend seeds from the JSON snapshot in
`go-server/data/` — offline, a few seconds. It falls back to fetching from the
official APIs only if that snapshot is absent, which takes minutes. The server
accepts requests while seeding runs.

### Configuration

`.env` is optional for local development. `docker-compose.dev.yml` defines every
setting the development stack requires; only one value is read from `.env`:

| Variable | Default | Effect |
|---|---|---|
| `REACT_APP_GOOGLE_MAPS_API_KEY` | empty | Route maps render blank when unset. |

```bash
cp .env.example .env    # then set REACT_APP_GOOGLE_MAPS_API_KEY
```

The remaining variables in `.env.example` apply to the production stack only —
see [Deploy to EC2](#deploy-to-ec2). Setting `POSTGRES_PASSWORD` has no effect on
the development database, which always uses `hkbus_password`.

`.env` is consumed by Docker Compose, not by the application. The Go server reads
process environment variables and has no dotenv loader, so `go run .` ignores
`.env`. The React dev server reads `react-ui/.env.local`.

### Production stack

To verify the nginx build pipeline before deploying:

```bash
docker compose up --build
```

Serves on http://localhost:80. nginx serves the SPA and proxies `/api/*` to the
backend. All variables have defaults, so this runs without `.env`; those defaults
are suitable for local inspection only.

The two stacks are separate Compose projects (`hk-transit-eta` and
`hk-transit-eta-dev`) and share no containers or volumes.

### Running without Docker

Requires a PostgreSQL instance with the `hkbus` database created.

Backend:

```bash
cd go-server && go run .
```

Frontend, in a second terminal:

```bash
cd react-ui && npm install && npm start
```

Backend defaults, overridden by exporting the variable:

| Variable | Default |
|---|---|
| `DATABASE_URL` | `postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable` |
| `PORT` | `8080` |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |

### Tests

```bash
cd react-ui && CI=true npm test
```

```bash
cd go-server && go test ./...
```

Database-backed Go tests skip when `TEST_DATABASE_URL` is unset, so `go test ./...`
alone reports success without executing any SQL. These tests truncate the tables
they use and require a dedicated database:

```bash
docker compose -f docker-compose.dev.yml up -d db
docker compose -f docker-compose.dev.yml exec db createdb -U hkbus hkbus_test

cd go-server
TEST_DATABASE_URL="postgres://hkbus:hkbus_password@localhost:5432/hkbus_test?sslmode=disable" go test ./...
```

End-to-end tests run against the production stack, matching CI:

```bash
npm ci
npx playwright install chromium
docker compose up -d --build
npx playwright test
```

The base URL defaults to `http://localhost` and is overridden with `E2E_BASE_URL`.

## Deploy to EC2

The production stack (`docker-compose.yaml`) runs Postgres, the Go backend, and the
nginx frontend. Postgres is internal to the Docker network (no host port). The
committed JSON snapshot ships in the backend image, so the database seeds offline on
first boot (zero API calls).

TLS is terminated by an existing reverse proxy or load balancer. The stack serves
plain HTTP on `FRONTEND_PORT` (default 80); forward the HTTPS front end to that
port.

### Environment

Unlike [local development](#local-development), the production stack reads all of
its configuration from `.env`. Every variable has a default, so the stack starts
without one — using the database password published in this repository, and a
CORS policy restricted to `http://localhost` that rejects requests from the
deployed domain. Configure `.env` (step 3) before exposing the instance.

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | Database password. Default is published in this repository. |
| `CORS_ORIGINS` | yes | Deployed `https://` origin, comma-separated for multiple. |
| `ADMIN_TOKEN` | recommended | Authorises the refresh and reseed endpoints. Empty disables both. |
| `FRONTEND_PORT` | no | Host port for the TLS proxy to forward to. Default `80`. |
| `POSTGRES_DB`, `POSTGRES_USER` | no | Default `hkbus`. |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | no | Applied at image build time. Maps render blank when unset. |
| `REACT_APP_API_URL` | no | Default `/api`, served same-origin through nginx. |

### 1. Security group

Allow inbound **22** (SSH) and whatever port your TLS proxy forwards to the app on
(`FRONTEND_PORT`, default 80).

### 2. First-time bootstrap

On a fresh Amazon Linux / Ubuntu instance:

```bash
curl -fsSL https://raw.githubusercontent.com/codekaburra/hk-transit-eta/main/deploy/setup-ec2.sh | bash
```

This installs Docker + the Compose plugin and clones the repo to `~/hk-transit-eta`.
(If you were just added to the `docker` group, log out and back in first.)

### 3. Configure environment

```bash
cd ~/hk-transit-eta
cp .env.example .env
$EDITOR .env    # set POSTGRES_PASSWORD, CORS_ORIGINS (https://your-domain), ADMIN_TOKEN, FRONTEND_PORT
```

`.env` is gitignored — secrets never get committed.

### 4. Deploy / redeploy

```bash
./deploy/deploy.sh
```

Pulls the latest code, rebuilds, restarts, waits for the backend health check, and
prunes old images. Idempotent — rerun it for every deploy.

```bash
docker compose logs -f            # stream all logs
docker compose down               # stop the stack
```

### Automatic deployment (GitHub Actions)

`.github/workflows/deploy.yml` deploys automatically **after CI passes on `main`**
(and can be triggered manually from the Actions tab). It SSHes into the instance
and runs `deploy/deploy.sh`.

One-time setup — add these under **Settings → Secrets and variables → Actions**:

| Secret | Required | Description |
|---|---|---|
| `EC2_HOST` | yes | Public IP or DNS of the instance |
| `EC2_SSH_KEY` | yes | Private SSH key (PEM) authorized on the instance |
| `EC2_USER` | no | SSH user (defaults to `ec2-user`) |
| `EC2_APP_DIR` | no | Repo path on the box (defaults to `~/hk-transit-eta`) |

Generate a dedicated deploy key and authorize it on the box:

```bash
ssh-keygen -t ed25519 -C "gha-deploy" -f gha_deploy -N ""
ssh-copy-id -i gha_deploy.pub <user>@<ec2-host>   # or append gha_deploy.pub to ~/.ssh/authorized_keys
# paste the PRIVATE key (gha_deploy) into the EC2_SSH_KEY secret
```

Until `EC2_HOST` is set the deploy job skips cleanly, so merging this is safe
before the secrets exist. The box still needs its `.env` in place (step 3 above).

### Updating transit data

The database seeds from the committed snapshot on first boot **only when it is
empty** — a deploy carrying an updated snapshot therefore leaves an existing
database on the old data. Two admin endpoints update it in place, without a
redeploy or dropping the volume. Both need `ADMIN_TOKEN` and run in the
background; only one may run at a time.

| Endpoint | Source | Time | Use when |
|---|---|---|---|
| `POST /api/admin/reseed` | Snapshot in the image | seconds | A deploy shipped updated data |
| `POST /api/admin/refresh` | Official APIs | minutes | You want data newer than the snapshot |

```bash
# Apply the snapshot shipped with the current image — offline, no API calls
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" https://your-domain/api/admin/reseed

# Pull fresh data from the official APIs
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" https://your-domain/api/admin/refresh
```

Both upsert, so they are safe to repeat. Watch progress with
`docker compose logs -f backend`.

## API

All endpoints are under `/api`. Responses are JSON.

### General

| Method | Path | Description |
|---|---|---|
| GET | `/api/num-routes?type={bus\|minibus}` | Route count by transport type |

### Bus (`/api/bus/`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/bus/routes` | List routes (limit 100) |
| GET | `/api/bus/stops` | List stops (limit 100) |
| GET | `/api/bus/route-stops` | List route-stop mappings (limit 100) |
| GET | `/api/bus/stop-by-id?stopId=` | Stop details by ID |
| GET | `/api/bus/search/routes?q=` | Search routes by number or name |
| GET | `/api/bus/search/stops?q=` | Search stops by ID or name |
| GET | `/api/bus/stops-by-route?routeId=&direction=` | Stops along a route (with coordinates) |
| GET | `/api/bus/routes-by-stop?stopId=` | Routes serving a stop |
| GET | `/api/bus/stops-nearby?stopId=` | Nearby stops (within ~100 m) |

### Minibus (`/api/minibus/`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/minibus/routes?region=` | List routes, optionally filtered by region (HKI/KLN/NT) |
| GET | `/api/minibus/stops` | List stops with coordinates (limit 100) |
| GET | `/api/minibus/route-stops?routeId=&routeSeq=` | Stops for a route direction |
| GET | `/api/minibus/stop-by-id?stopId=` | Stop details by ID |
| GET | `/api/minibus/search/routes?q=` | Search routes by code or description |
| GET | `/api/minibus/search/stops?q=` | Search stops by name |
| GET | `/api/minibus/routes-by-stop?stopId=` | Routes serving a stop |
| GET | `/api/minibus/route-details?routeId=&routeSeq=` | Route details with headway schedule |

## Database Schema

PostgreSQL 16. Tables are auto-created on startup.

### Bus

| Table | Purpose | Key columns |
|---|---|---|
| `routes` | Bus route info | `company`, `route`, `direction`, `service_type`, origin/destination names (en/tc/sc) |
| `stops` | Bus stop locations | `stop` (unique ID), `name_en/tc/sc`, `lat`, `long` |
| `route_stops` | Route-to-stop mapping | `route`, `direction`, `service_type`, `seq`, `stop` |

### Minibus

| Table | Purpose | Key columns |
|---|---|---|
| `minibus_route` | Route directions | `region`, `route_code`, `route_id`, `route_seq`, origin/destination/description (en/tc/sc) |
| `minibus_stop` | Stop coordinates | `stop_id` (PK), `latitude`, `longitude`, WGS84 + HK80 coordinates |
| `minibus_route_stop` | Stop sequence per route | `route_id`, `route_seq`, `stop_seq`, `stop_id`, name (en/tc/sc) |
| `minibus_headway` | Service frequency | `route_id`, `route_seq`, per-weekday booleans, `start_time`, `end_time`, `frequency` |

## Data Sources

- **KMB** — `https://data.etabus.gov.hk/v1/transport/kmb/`
- **Citybus** — `https://rt.data.gov.hk/v2/transport/citybus/`
- **GMB** — `https://data.etagmb.gov.hk/` (regions: HKI, KLN, NT)

All data sourced from official Hong Kong government and operator APIs.

## Project Structure

```
hk-transit-eta/
├── go-server/
│   ├── main.go                # Server entry point, routing, DB init
│   ├── bus/                   # KMB + Citybus: API, DB, fetchers, cache, types
│   ├── minibus/               # GMB: API, DB, fetchers, cache, types
│   └── data/                  # Local JSON cache (bus, minibus, mtr)
├── react-ui/
│   └── src/
│       ├── components/
│       │   ├── LandingPage.tsx
│       │   ├── header/        # Clock, Header, ThemeToggle, WeatherWarnings
│       │   ├── transport/     # HomePage, SearchBox, ResultsList, navigation
│       │   │   ├── bus/       # BusRouteCard, BusStopCard, BusRouteDetails, ...
│       │   │   ├── minibus/   # MinibusRouteCard, MinibusStopCard, ...
│       │   │   └── mtr/       # MTRStationDetails
│       │   └── weather/       # Forecast, rainfall nowcast
│       ├── contexts/          # ThemeContext
│       └── types/             # TypeScript definitions
├── docker-compose.yaml        # Production (nginx + backend + postgres)
├── docker-compose.dev.yml     # Development (hot-reload)
├── api-spec/                  # Official API specification PDFs
└── .env.example
```

