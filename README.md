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

There are two separate paths. They use different compose files and have
different environment requirements, so follow one or the other:

- **[Run it locally](#run-it-locally)** — hot-reload dev stack. No configuration; `.env` is not needed.
- **[Deploy to EC2](#deploy-to-ec2)** — production stack behind your own HTTPS proxy. `.env` is required.

---

## Run it locally

### Prerequisites

- **Docker + Docker Compose** — that is all you need for the quick start
- Go 1.26+ and Node.js 18+ only if you run the services directly (see [Without Docker](#without-docker))

### Quick start

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (React dev server) | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 (user/password/db all `hkbus` / `hkbus_password` / `hkbus`) |

Source changes in `go-server/` and `react-ui/src/` are picked up automatically.

> On first boot the database seeds from the JSON snapshot committed under
> `go-server/data/` — offline, no API calls, a few seconds. Only if that snapshot
> is missing does it fall back to fetching everything from the official APIs,
> which takes minutes. Either way the server answers immediately while data loads.

### Do I need `.env`?

**No.** `docker-compose.dev.yml` hard-codes every setting the dev stack needs, so
it starts with no configuration at all.

There is exactly one thing it reads from `.env`, and only if you want maps:

| Variable | Effect if unset |
|---|---|
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Route maps render blank. Everything else works. |

To set it:

```bash
cp .env.example .env
$EDITOR .env    # fill in REACT_APP_GOOGLE_MAPS_API_KEY only
```

Two things that surprise people:

- **`.env` is read by Docker Compose, not by the app.** The Go server has no
  dotenv loader — it reads real environment variables. Running `go run .`
  directly ignores `.env` entirely.
- **The other variables in `.env` do nothing for local development.** Setting
  `POSTGRES_PASSWORD` there will not change the dev database password; the dev
  stack always uses `hkbus_password`. Those variables are for
  [production](#deploy-to-ec2).

For the React dev server outside Docker, CRA reads `react-ui/.env.local` — not
the `.env` at the repo root.

### Running the production stack locally

To check the real nginx + build pipeline before deploying:

```bash
docker compose up --build
```

Serves on **http://localhost** (port 80). nginx serves the frontend and proxies
`/api/*` to the backend. Every variable falls back to a working default, so this
also runs without `.env` — but the defaults are insecure and are meant only for a
local look.

Note this stack and the dev stack are separate Docker Compose projects
(`hk-transit-eta` and `hk-transit-eta-dev`), so they never share containers or
volumes and `docker compose down` on one leaves the other alone.

### Without Docker

Requires a PostgreSQL instance you have already created the `hkbus` database on.

```bash
# Backend — the defaults below are what it assumes if you set nothing
cd go-server
go run .        # DATABASE_URL=postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable
                # PORT=8080, CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Frontend (in a second terminal)
cd react-ui
npm install
npm start
```

Override any of them by exporting the variable — again, not via `.env`:

```bash
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=disable go run .
```

### Running the tests

```bash
# Frontend
cd react-ui && CI=true npm test

# Backend — unit tests only
cd go-server && go test ./...
```

The Go suite includes database-backed tests that **skip silently when
`TEST_DATABASE_URL` is unset**, so `go test ./...` on its own can report a clean
pass without having exercised any SQL — which is most of what the handlers do.

These tests `TRUNCATE` the tables they touch, so give them their own database
rather than the one the dev stack is using (this is what CI does):

```bash
docker compose -f docker-compose.dev.yml up -d db
docker compose -f docker-compose.dev.yml exec db createdb -U hkbus hkbus_test

cd go-server
TEST_DATABASE_URL="postgres://hkbus:hkbus_password@localhost:5432/hkbus_test?sslmode=disable" go test ./...
```

End-to-end tests (Playwright) run against the **production** stack, not the dev
one — they exercise nginx serving the built SPA, which is what CI checks:

```bash
npm ci                                  # from the repo root
npx playwright install chromium
docker compose up -d --build            # note: not docker-compose.dev.yml

# Wait until the backend has seeded, then:
npx playwright test
```

The default base URL is `http://localhost` (port 80). Point it elsewhere with
`E2E_BASE_URL`.

## Deploy to EC2

The production stack (`docker-compose.yaml`) runs Postgres, the Go backend, and the
nginx frontend. Postgres is internal to the Docker network (no host port). The
committed JSON snapshot ships in the backend image, so the database seeds offline on
first boot (zero API calls).

**TLS/HTTPS is handled by your own reverse proxy or load balancer** — the stack
serves plain HTTP on `FRONTEND_PORT` (default 80). Point your existing HTTPS
front end at that port.

> **`.env` matters here.** Unlike [local development](#run-it-locally), every
> variable below is read from it. All of them have defaults, so the stack will
> start without a `.env` — but with the database password that is published in
> this repo, and with CORS allowing only `http://localhost`, which blocks the
> browser from calling the API through your real domain. Do step 3 first.

| Variable | Required | Purpose |
|---|---|---|
| `POSTGRES_PASSWORD` | **yes** | Database password. The default is in this repo — change it. |
| `CORS_ORIGINS` | **yes** | Your `https://` domain. Otherwise the browser blocks API calls. |
| `ADMIN_TOKEN` | recommended | Guards the refresh/reseed endpoints. Empty disables them. |
| `FRONTEND_PORT` | no | Host port for your TLS proxy to forward to (default 80). |
| `POSTGRES_DB` / `POSTGRES_USER` | no | Default `hkbus`. |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | no | Baked in at build time; maps are blank without it. |
| `REACT_APP_API_URL` | no | Leave as `/api` — same-origin through nginx. |

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
