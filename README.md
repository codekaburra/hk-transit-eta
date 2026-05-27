# HK Bus Tool 🚌🚐

A comprehensive web application for searching and managing Hong Kong public transport data, including buses (KMB, Citybus) and minibuses (GMB). This project features a Go backend with organized package structure and a modern React frontend with multi-transport search capabilities.

## 🌟 Features

### 🚌 **Bus Services**
- **KMB Integration**: Complete route, stop, and real-time ETA data from KMB's official API
- **Citybus Integration**: Full route, stop, and real-time ETA data from Citybus's official API
- **Real-time ETAs**: Live arrival times directly from KMB and Citybus public APIs

### 🚐 **Minibus Services**
- **GMB Data Integration**: Comprehensive minibus route, stop, and schedule data from three regions (HKI, KLN, NT)
- **Multi-region Support**: Hong Kong Island, Kowloon, and New Territories minibus coverage
- **Route Details**: Complete route information including headways, fare details, and stop sequences

### 💾 **Data Management**
- **PostgreSQL Database**: Persistent storage for all transport data
- **Multi-language Support**: English, Traditional Chinese, and Simplified Chinese
- **Modular Architecture**: Organized into `bus` and `minibus` packages for scalability

### 🎨 **Modern Frontend**
- **Multi-search Interface**: Search buses and minibuses with dedicated UI components
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Theme System**: Multiple color themes with smooth transitions
- **Real-time Search**: Debounced search with instant results

## 📁 Project Structure

```
hk-bus-tool/
├── go-server/                 # Go backend application
│   ├── main.go               # Main server entry point
│   ├── bus/                  # Bus-related functionality
│   │   ├── api.go           # Bus API endpoints
│   │   ├── database.go      # Bus database operations
│   │   ├── kmb.go           # KMB data fetching
│   │   ├── city-bus.go      # Citybus data fetching
│   │   ├── types.go         # Bus data structures
│   │   └── utils.go         # Bus utility functions
│   ├── minibus/              # Minibus-related functionality
│   │   ├── api.go           # Minibus API endpoints
│   │   ├── database.go      # Minibus database operations
│   │   ├── fetch.go         # Minibus data fetching
│   │   ├── types.go         # Minibus data structures
│   │   └── utils.go         # Minibus utility functions
│   ├── go.mod               # Go module dependencies
│   └── go.sum               # Go module checksums
├── react-ui/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── bus/         # Bus-specific components
│   │   │   │   ├── RouteCard.tsx
│   │   │   │   ├── StopCard.tsx
│   │   │   │   └── ...
│   │   │   ├── minibus/     # Minibus-specific components
│   │   │   │   ├── MinibusRouteCard.tsx
│   │   │   │   ├── MinibusStopCard.tsx
│   │   │   │   └── ...
│   │   │   ├── HomePage.tsx  # Main search interface
│   │   │   ├── SearchBox.tsx # Search input component
│   │   │   └── ResultsList.tsx # Search results display
│   │   ├── services/         # API services
│   │   │   └── api.ts       # API communication layer
│   │   ├── hooks/           # React hooks
│   │   │   └── useThemeStyles.ts
│   │   ├── contexts/        # React contexts
│   │   │   └── ThemeContext.tsx
│   │   └── types/           # TypeScript definitions
│   │       └── index.ts
│   ├── public/              # Static assets
│   │   ├── KMB_300x200.png  # KMB logo
│   │   ├── citybus.svg      # Citybus logo
│   │   └── citybus_bg.svg   # Citybus logo with background
│   ├── package.json         # Node.js dependencies
│   └── tsconfig.json        # TypeScript configuration
├── docker-compose.yaml       # Production Docker Compose
├── docker-compose.dev.yml    # Development Docker Compose (hot reload)
├── .env.example              # Environment variable reference
└── README.md                 # This file
```

## 🛠️ Technology Stack

### Backend
- **Go 1.26**: Main programming language with modular package structure
- **PostgreSQL**: Persistent database storage for all transport data
- **Gorilla Mux**: HTTP routing and middleware
- **Concurrent Processing**: Goroutines for non-blocking data fetching

### Frontend
- **React 18+**: Modern UI framework with hooks
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first responsive styling
- **React Router**: Client-side routing for navigation

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Go 1.26+ and Node.js 18+ *(only needed for running without Docker)*

### Environment Variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable` |
| `PORT` | Backend server port | `8080` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `REACT_APP_API_URL` | Frontend API base URL (build-time) | `/api` |

### Quick Start — Development (hot reload)

```bash
docker-compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (React dev server) | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

File changes in `react-ui/src/` and `go-server/` are picked up automatically.

### Quick Start — Production

```bash
docker-compose up --build
```

The app is served on **http://localhost** (port 80). nginx handles the frontend and proxies `/api/*` to the backend — no ports other than 80 need to be open.

> On first boot the backend fetches all KMB, Citybus and GMB data from the official HK government APIs. This runs in the background; the server is available immediately while data loads.

### Manual Setup (without Docker)

Requires a running PostgreSQL instance. Set `DATABASE_URL` in your environment or shell.

#### Backend

```bash
cd go-server
go mod download
DATABASE_URL=postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable go run .
```

#### Frontend

```bash
cd react-ui
npm install
npm start   # dev server at http://localhost:3000
```

## 📊 API Endpoints

### 🚌 Bus API (`/api/bus/`)

#### Core Endpoints
- `GET /api/bus/routes` - List all bus routes
- `GET /api/bus/stops` - List all bus stops
- `GET /api/bus/route-stops` - Get stops for specific route
- `GET /api/bus/stop-by-id?stopId={id}` - Get stop details

#### Search Endpoints
- `GET /api/bus/search/routes?q={query}` - Search bus routes
- `GET /api/bus/search/stops?q={query}` - Search bus stops

#### Relationship Endpoints
- `GET /api/bus/stops-by-route?routeId={id}&direction={dir}` - Stops by route
- `GET /api/bus/routes-by-stop?stopId={id}` - Routes by stop
- `GET /api/bus/stops-nearby?stopId={id}` - Nearby stops

### 🚐 Minibus API (`/api/minibus/`)

#### Core Endpoints
- `GET /api/minibus/routes?region={region}` - List minibus routes (optionally filtered by region)
- `GET /api/minibus/stops` - List all minibus stops
- `GET /api/minibus/route-stops?routeId={id}&routeSeq={seq}` - Get stops for route
- `GET /api/minibus/stop-by-id?stopId={id}` - Get stop details

#### Search Endpoints
- `GET /api/minibus/search/routes?q={query}` - Search minibus routes
- `GET /api/minibus/search/stops?q={query}` - Search minibus stops

#### Relationship Endpoints
- `GET /api/minibus/routes-by-stop?stopId={id}` - Routes serving a stop

## 📈 Data Sources

### 🚌 Bus Data APIs
- **KMB API**: `https://data.etabus.gov.hk/v1/transport/kmb/`
- **Citybus API**: `https://data.etabus.gov.hk/v1/transport/citybus/`
- **Real-time ETA**: Live data from official APIs

### 🚐 Minibus Data APIs
- **GMB API**: `https://data.etagmb.gov.hk/`
- **Regions**: HKI (Hong Kong Island), KLN (Kowloon), NT (New Territories)

## 🗄️ Database Schema

### Bus Tables
- **`route`**: Bus route information
- **`stop`**: Bus stop details with coordinates
- **`route_stop`**: Route-stop relationships

### Minibus Tables
- **`minibus_route`**: Minibus route information by region
- **`minibus_stop`**: Minibus stop details with coordinates
- **`minibus_route_stop`**: Route-stop sequences
- **`minibus_headway`**: Service frequency and operating hours

## 🎨 Frontend Features

### 🔍 **Search Interface**
- **Multi-type Search**: Bus routes, bus stops, minibus routes, minibus stops
- **Real-time Results**: Debounced search with instant feedback
- **Responsive Design**: Mobile-optimized interface

### 🎨 **Theme System**
- **Multiple Themes**: Light, dark, warm, custom color schemes
- **Smooth Transitions**: Animated theme switching
- **Consistent Styling**: Theme-aware components

### 🧩 **Component Architecture**
- **Modular Design**: Separate components for bus and minibus
- **Reusable Icons**: Standardized company logos and transport icons
- **Type Safety**: Full TypeScript integration

## 🔧 Development

### Adding New Features

1. **Backend**: Add new endpoints in respective `api.go` files
2. **Frontend**: Create new components in appropriate directories
3. **Database**: Update schema in `database.go` files

### Code Organization

- **Bus functionality**: `go-server/bus/` package
- **Minibus functionality**: `go-server/minibus/` package
- **Frontend components**: Organized by transport type

## 🚀 Deployment

```bash
# Build images and start in the background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The only port that needs to be open publicly is **80**. The backend and database are internal to the Docker network.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or issues, please open an issue on the GitHub repository.

## 🙏 Acknowledgments

- Hong Kong Transport Department for providing public APIs
- KMB, Citybus, and GMB operators for data access
- Open source community for tools and libraries

---

**Note**: This tool uses official Hong Kong transport APIs. Please ensure compliance with respective API terms of service and usage policies. All transport data is sourced from official government and operator APIs. 