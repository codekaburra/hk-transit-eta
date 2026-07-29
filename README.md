# HK Transit ETA

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

### Prerequisites

- **Docker + Docker Compose** (recommended)
- Go 1.26+ and Node.js 18+ only needed if running without Docker

### Environment

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable` |
| `PORT` | Backend server port | `8080` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `REACT_APP_API_URL` | Frontend API base URL (build-time) | `/api` |

### Development (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (React dev server) | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

Source changes in `go-server/` and `react-ui/src/` are picked up automatically.

### Production

```bash
docker compose up --build
```

Serves on **http://localhost** (port 80). nginx serves the frontend and proxies `/api/*` to the backend — only port 80 needs to be open.

### Without Docker

Requires a running PostgreSQL instance.

```bash
# Backend
cd go-server
DATABASE_URL=postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable go run .

# Frontend (in a second terminal)
cd react-ui
npm install
npm start
```

> On first boot the backend fetches all KMB, Citybus, and GMB data from official HK government APIs. This runs in the background — the server is available immediately while data loads.

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

## Deployment (EC2)

The production stack (`docker-compose.yaml`) runs Postgres, the Go backend, and the
nginx frontend. Postgres is internal to the Docker network (no host port). The
committed JSON snapshot ships in the backend image, so the database seeds offline on
first boot (zero API calls).

**TLS/HTTPS is handled by your own reverse proxy or load balancer** — the stack
serves plain HTTP on `FRONTEND_PORT` (default 80). Point your existing HTTPS
front end at that port.

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

### Refreshing transit data

Data seeds from the committed snapshot on first boot. To pull fresh data from the
official APIs later, call the admin endpoint with your `ADMIN_TOKEN`:

```bash
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" https://your-domain/api/admin/refresh
```
