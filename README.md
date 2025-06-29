# HK Bus Tool

A comprehensive tool for fetching, storing, and managing Hong Kong bus data from KMB (Kowloon Motor Bus) and Citybus APIs. This project consists of a Go backend for data processing and a React frontend for user interface.

## 🚌 Features

- **KMB Data Integration**: Fetches and stores route, stop, and route-stop relationship data from KMB's official API
- **Citybus Data Integration**: Fetches and stores route, stop, and route-stop relationship data from Citybus's official API
- **SQLite Database Storage**: Local database storage for efficient data querying and management
- **Multi-language Support**: Handles English, Traditional Chinese, and Simplified Chinese data
- **React Frontend**: Modern web interface for data visualization and interaction
- **Docker Support**: Containerized deployment with Docker Compose

## 📁 Project Structure

```
hk-bus-tool/
├── go-server/                 # Go backend application
│   ├── main.go               # Main application entry point
│   ├── kmb.go                # KMB data fetching and processing
│   ├── city-bus.go           # Citybus data fetching and processing
│   ├── types.go              # Data structures and types
│   ├── go.mod                # Go module dependencies
│   ├── go.sum                # Go module checksums
│   ├── routeList.json        # Route data export
│   ├── stopList.json         # Stop data export
│   └── ui/                   # UI-related files
├── react-ui/                 # React frontend application
│   ├── src/                  # Source code
│   ├── public/               # Public assets
│   ├── package.json          # Node.js dependencies
│   └── tsconfig.json         # TypeScript configuration
├── docker-compose.yaml       # Docker Compose configuration
├── kmb_routes.db            # KMB SQLite database
├── citybus.db               # Citybus SQLite database
└── README.md                # This file
```

## 🛠️ Technology Stack

### Backend
- **Go 1.23.4**: Main programming language
- **SQLite**: Local database storage
- **HTTP Client**: API data fetching
- **JSON Processing**: Data parsing and serialization

### Frontend
- **React 19.1.0**: UI framework
- **TypeScript 4.9.5**: Type-safe JavaScript
- **Tailwind CSS 4.1.11**: Utility-first CSS framework
- **React Scripts**: Development and build tools

## 🚀 Getting Started

### Prerequisites

- Go 1.23.4 or later
- Node.js 16+ and npm
- Docker and Docker Compose (optional)

### Backend Setup

1. **Navigate to the Go server directory:**
   ```bash
   cd go-server
   ```

2. **Install Go dependencies:**
   ```bash
   go mod download
   ```

3. **Run the application:**
   ```bash
   go run .
   ```

   This will:
   - Fetch KMB data from the official API
   - Store data in `kmb_routes.db`
   - Query and display KMB data
   - Fetch Citybus data from the official API
   - Store data in `citybus.db`

### Frontend Setup

1. **Navigate to the React UI directory:**
   ```bash
   cd react-ui
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The React app will open at `http://localhost:3000`

### Docker Setup (Alternative)

1. **Navigate to the project root directory:**
   ```bash
   cd hk-bus-tool
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up
   ```

## 📊 Data Sources

### KMB API Endpoints
- **Routes**: `https://data.etabus.gov.hk/v1/transport/kmb/route/`
- **Stops**: `https://data.etabus.gov.hk/v1/transport/kmb/stop/`
- **Route-Stops**: `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/`

### Citybus API Endpoints
- **Company Info**: `https://data.etabus.gov.hk/v1/transport/citybus/company`
- **Routes**: `https://data.etabus.gov.hk/v1/transport/citybus/route`
- **Stops**: `https://data.etabus.gov.hk/v1/transport/citybus/stop`
- **Route-Stops**: `https://data.etabus.gov.hk/v1/transport/citybus/route-stop`

## 🗄️ Database Schema

### KMB Database (`kmb_routes.db`)

#### Routes Table
- `id`: Primary key
- `route`: Route number
- `bound`: Direction (inbound/outbound)
- `service_type`: Service type
- `orig_en/tc/sc`: Origin in English/Traditional Chinese/Simplified Chinese
- `dest_en/tc/sc`: Destination in English/Traditional Chinese/Simplified Chinese
- `created_at`: Timestamp

#### Stops Table
- `id`: Primary key
- `stop`: Stop ID
- `name_en/tc/sc`: Stop name in English/Traditional Chinese/Simplified Chinese
- `lat/long`: GPS coordinates
- `created_at`: Timestamp

#### Route_Stops Table
- `id`: Primary key
- `route`: Route number
- `bound`: Direction
- `service_type`: Service type
- `seq`: Sequence number
- `stop`: Stop ID
- `created_at`: Timestamp

### Citybus Database (`citybus.db`)

#### Citybus_Company Table
- `id`: Primary key
- `co`: Company code
- `name_en/tc/sc`: Company name in different languages
- `url`: Company website
- `data_timestamp`: Data timestamp
- `created_at`: Timestamp

#### Citybus_Routes Table
- `id`: Primary key
- `co`: Company code
- `route`: Route number
- `orig_en/tc/sc`: Origin in different languages
- `dest_en/tc/sc`: Destination in different languages
- `data_timestamp`: Data timestamp
- `created_at`: Timestamp

#### Citybus_Stops Table
- `id`: Primary key
- `stop`: Stop ID
- `name_en/tc/sc`: Stop name in different languages
- `lat/long`: GPS coordinates
- `data_timestamp`: Data timestamp
- `created_at`: Timestamp

#### Citybus_Route_Stops Table
- `id`: Primary key
- `route`: Route number
- `dir`: Direction
- `seq`: Sequence number
- `stop`: Stop ID
- `data_timestamp`: Data timestamp
- `created_at`: Timestamp

## 🔧 Development

### Adding New Features

1. **Backend Changes**: Modify the Go files in `go-server/`
2. **Frontend Changes**: Modify the React components in `react-ui/src/`
3. **Database Changes**: Update the schema in the respective Go files

### Testing

- **Backend**: Use Go's built-in testing framework
- **Frontend**: Use React Testing Library and Jest

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues, please open an issue on the GitHub repository.

---

**Note**: This tool fetches data from official Hong Kong bus APIs. Please ensure compliance with the respective API terms of service and usage policies. 