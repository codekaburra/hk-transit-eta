package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"hk-transit-eta/bus"
	"hk-transit-eta/internal/syncmeta"
	"hk-transit-eta/minibus"

	"github.com/gorilla/mux"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rs/cors"
)

var database *sql.DB

// getRouteCount handles the /num-routes endpoint and routes to appropriate count function
func getRouteCount(w http.ResponseWriter, r *http.Request) {
	routeType := r.URL.Query().Get("type")
	fmt.Printf("getRouteCount - Type: %s\n", routeType)

	switch routeType {
	case "bus":
		bus.GetRouteCount(w, r)
	case "minibus":
		minibus.GetRouteCount(w, r)
	default:
		http.Error(w, "Invalid type parameter. Use 'bus' or 'minibus'", http.StatusBadRequest)
	}
}

func main() {
	// Initialize databases
	initDatabases()

	const dataDir = "data"
	if shouldFetchData() {
		// Seed from local JSON cache if available (fast), otherwise fetch from APIs (slow).
		if !bus.SeedFromCache(dataDir) {
			go bus.FetchKmbData()
			go bus.FetchCitybusData()
		}
	}
	if minibus.ShouldFetchMinibusData() {
		if !minibus.SeedFromCache(dataDir) {
			go minibus.FetchMinibusRoutes()
		}
	}

	// Start HTTP server
	startServer()
}

func initDatabases() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://hkbus:hkbus_password@localhost:5432/hkbus?sslmode=disable"
	}

	var err error
	// Retry connecting to the database (PostgreSQL may not be ready immediately)
	for i := 1; i <= 10; i++ {
		database, err = sql.Open("pgx", dsn)
		if err == nil {
			err = database.Ping()
			if err == nil {
				break
			}
		}
		log.Printf("Database not ready, retrying (%d/10)...", i)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := syncmeta.Init(database); err != nil {
		log.Fatal("Failed to init sync_meta table:", err)
	}

	// Set the database connection for both packages
	bus.SetDatabase(database)
	bus.InitBusDatabase()

	minibus.SetDatabase(database)
	minibus.InitMinibusDatabase()
}

func startServer() {
	r := mux.NewRouter()

	// API Routes
	api := r.PathPrefix("/api").Subrouter()

	// Route count endpoint
	api.HandleFunc("/num-routes", getRouteCount).Methods("GET")

	// Bus API endpoints
	api.HandleFunc("/bus/routes", bus.GetRoutes).Methods("GET")
	api.HandleFunc("/bus/stops", bus.GetStops).Methods("GET")
	api.HandleFunc("/bus/route-stops", bus.GetRouteStops).Methods("GET")

	// Search routes
	api.HandleFunc("/bus/search/routes", bus.SearchRoutes).Methods("GET")
	api.HandleFunc("/bus/search/stops", bus.SearchStops).Methods("GET")

	// New relationship endpoints
	api.HandleFunc("/bus/stops-by-route", bus.GetStopsByRouteId).Methods("GET")
	api.HandleFunc("/bus/routes-by-stop", bus.GetRoutesByStopId).Methods("GET")
	api.HandleFunc("/bus/stops-nearby", bus.GetStopsNearby).Methods("GET")
	api.HandleFunc("/bus/stop-by-id", bus.GetStopByStopId).Methods("GET")

	// Minibus API endpoints
	api.HandleFunc("/minibus/routes", minibus.GetMinibusRoutes).Methods("GET")
	api.HandleFunc("/minibus/stops", minibus.GetMinibusStops).Methods("GET")
	api.HandleFunc("/minibus/route-stops", minibus.GetMinibusRouteStops).Methods("GET")
	api.HandleFunc("/minibus/search/routes", minibus.SearchMinibusRoutes).Methods("GET")
	api.HandleFunc("/minibus/search/stops", minibus.SearchMinibusStops).Methods("GET")
	api.HandleFunc("/minibus/stop-by-id", minibus.GetMinibusStopById).Methods("GET")
	api.HandleFunc("/minibus/routes-by-stop", minibus.GetMinibusRoutesByStopId).Methods("GET")
	api.HandleFunc("/minibus/route-details", minibus.GetRouteByRouteIdAndDirection).Methods("GET")

	// CORS configuration
	corsOrigins := os.Getenv("CORS_ORIGINS")
	allowedOrigins := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	if corsOrigins != "" {
		allowedOrigins = strings.Split(corsOrigins, ",")
	}

	c := cors.New(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server starting on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func shouldFetchData() bool {
	// Check if bus routes table has data
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}
	return false
}
