# HK Transit ETA — Frontend

React + TypeScript + Tailwind CSS frontend for HK Transit ETA. Provides real-time arrival times for buses, minibuses, and MTR across Hong Kong.

## Features
- Modern React (TypeScript) web app
- Styled with Tailwind CSS
- Designed to connect to a backend API (see [../go-server](../go-server))

## Prerequisites
- Node.js (v16 or above recommended)
- npm
- Backend API running (see [../go-server/README.md](../go-server/README.md))

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

## Tailwind CSS
Tailwind is already configured. You can use its utility classes in any `.tsx` or `.css` file in `src/`.

## Connecting to the Backend
This frontend expects a backend API to provide bus data (routes, stops, etc). By default, you may need to update API URLs in the code to match your backend's address (e.g., `http://localhost:8080/api/...`).

## Project Structure
- `src/` — React source code
- `public/` — Static assets
- `tailwind.config.js` — Tailwind configuration
- `postcss.config.js` — PostCSS configuration

## Customization
- Update API endpoints in the code as needed
- Add new pages/components in `src/`

## License
MIT
