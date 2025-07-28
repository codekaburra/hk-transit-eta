# HK Bus Tool

A Go application that fetches KMB (Kowloon Motor Bus) route, stop, and route-stop relationship data from the Hong Kong Transport Department API and stores it in a SQLite database.

## Features

- Fetches route data from the [KMB Route API](https://data.etabus.gov.hk/v1/transport/kmb/route/)
- Fetches stop data from the [KMB Stop API](https://data.etabus.gov.hk/v1/transport/kmb/stop/)
- Fetches route-stop relationship data from the [KMB Route-Stop API](https://data.etabus.gov.hk/v1/transport/kmb/route-stop/)
- Stores data in a local SQLite database
- Displays sample data after successful import
- Uses transactions for efficient bulk data insertion
- Handles duplicate data with UPSERT functionality
- Provides comprehensive route-stop relationship analysis

## Prerequisites

- Go 1.23.4 or later
- Internet connection to access the KMB API

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   go mod tidy
   ```

## Usage

Run the application:
```bash
go run .
```
🚌 Bus API Endpoints (Updated):
Base URL: http://localhost:8080/api/bus/
GET /bus/routes - List all bus routes
GET /bus/stops - List all bus stops
GET /bus/route-stops - Get stops for specific route
GET /bus/search/routes - Search bus routes
GET /bus/search/stops - Search bus stops
GET /bus/stops-by-route - Get stops by route ID
GET /bus/routes-by-stop - Get routes by stop ID
GET /bus/stops-nearby - Get nearby stops
GET /bus/stop-by-id - Get specific stop details
🚐 Minibus API Endpoints (Unchanged):
Base URL: http://localhost:8080/api/minibus/
GET /minibus/routes - List all minibus routes
GET /minibus/stops - List all minibus stops
GET /minibus/route-stops - Get stops for specific route
GET /minibus/search/routes - Search minibus routes
GET /minibus/search/stops - Search minibus stops
GET /minibus/stop-by-id - Get specific stop details
GET /minibus/routes-by-stop - Get routes by stop ID