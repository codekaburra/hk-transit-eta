# HK Transit ETA — React UI

React + TypeScript frontend for HK Transit ETA. It provides the transport search UI, route details, maps, weather dashboard, language switching, and theme support.

Route and stop data comes from the Go backend. Live ETAs are fetched by the browser directly from the operators' APIs (KMB, Citybus, GMB), not through the backend.

For the full project setup, Docker commands, deployment flow, and backend API overview, see the root [README](../README.md).

## Requirements

- Node.js 18+
- npm
- Backend API running at the configured API URL

The easiest local setup is still the repository-level Docker development stack:

```bash
docker compose -f ../docker-compose.dev.yml up --build
```

## Run locally without Docker

```bash
npm install
npm start
```

The React dev server runs at http://localhost:3000.

## Configuration

Create `react-ui/.env.local` when running the frontend directly:

```bash
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8080/api` when running directly; `/api` in the production Docker build | Backend API base URL. In Docker production this is proxied by nginx. |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | empty | Enables route maps. Maps render blank when unset. |

Do not edit source files just to change the backend URL; use environment variables instead.

## Tests

```bash
CI=true npm test
```

## Build

```bash
npm run build
```

The production Docker image serves this build through nginx.

## Project structure

| Path | Purpose |
|---|---|
| `src/components/` | App UI, transport pages, route cards, weather components. |
| `src/contexts/` | Theme context and theme mode state. |
| `src/services/` | Backend API client. |
| `src/types/` | TypeScript data types. |
| `public/` | Static assets. |
