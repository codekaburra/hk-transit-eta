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

The application will:
1. Initialize a SQLite database (`kmb_routes.db`)
2. Fetch route data from the KMB Route API
3. Store all routes in the database
4. Fetch stop data from the KMB Stop API
5. Store all stops in the database
6. Fetch route-stop relationship data from the KMB Route-Stop API
7. Store all route-stop relationships in the database
8. Display a comprehensive summary and sample data for all three data types

## Database Schema

The application creates three tables:

### Routes Table
```sql
CREATE TABLE routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route TEXT NOT NULL,
    bound TEXT NOT NULL,
    service_type TEXT NOT NULL,
    orig_en TEXT NOT NULL,
    orig_tc TEXT NOT NULL,
    orig_sc TEXT NOT NULL,
    dest_en TEXT NOT NULL,
    dest_tc TEXT NOT NULL,
    dest_sc TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Stops Table
```sql
CREATE TABLE stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stop TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_tc TEXT NOT NULL,
    name_sc TEXT NOT NULL,
    lat TEXT NOT NULL,
    long TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Route-Stops Table
```sql
CREATE TABLE route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route TEXT NOT NULL,
    bound TEXT NOT NULL,
    service_type TEXT NOT NULL,
    seq TEXT NOT NULL,
    stop TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route, bound, service_type, seq)
);
```

## Data Fields

### Route Data
- `route`: Bus route number (e.g., "1", "1A", "2")
- `bound`: Direction ("O" for outbound, "I" for inbound)
- `service_type`: Service type identifier
- `orig_en/tc/sc`: Origin in English/Traditional Chinese/Simplified Chinese
- `dest_en/tc/sc`: Destination in English/Traditional Chinese/Simplified Chinese

### Stop Data
- `stop`: Unique stop identifier
- `name_en/tc/sc`: Stop name in English/Traditional Chinese/Simplified Chinese
- `lat`: Latitude coordinate
- `long`: Longitude coordinate

### Route-Stop Data
- `route`: Bus route number
- `bound`: Direction ("O" for outbound, "I" for inbound)
- `service_type`: Service type identifier
- `seq`: Sequence number of the stop in the route
- `stop`: Stop identifier (foreign key to stops table)

## API Sources

This application uses the Hong Kong Transport Department's open data APIs:

### Route API
- **URL**: https://data.etabus.gov.hk/v1/transport/kmb/route/
- **Format**: JSON
- **Update Frequency**: Real-time

### Stop API
- **URL**: https://data.etabus.gov.hk/v1/transport/kmb/stop/
- **Format**: JSON
- **Update Frequency**: Real-time

### Route-Stop API
- **URL**: https://data.etabus.gov.hk/v1/transport/kmb/route-stop/
- **Format**: JSON
- **Update Frequency**: Real-time

## Sample Output

The application provides a comprehensive summary including:
- Total number of routes, stops, and route-stop relationships in the database
- Sample route data showing route numbers, directions, and destinations
- Sample stop data showing stop IDs, names, and coordinates
- Sample route-stop relationships showing the sequence of stops for specific routes

## Data Relationships

The three tables are related as follows:
- `route_stops.route` → `routes.route`
- `route_stops.stop` → `stops.stop`
- `route_stops.bound` → `routes.bound`
- `route_stops.service_type` → `routes.service_type`

This allows for complex queries such as:
- Finding all stops along a specific route
- Determining the sequence of stops for any route
- Analyzing route patterns and stop usage

## Dependencies

- `github.com/mattn/go-sqlite3`: SQLite driver for Go

## License

This project is open source and available under the MIT License. 