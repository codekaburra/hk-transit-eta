package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"hk-transit-eta/bus"
	"hk-transit-eta/internal/syncmeta"
	"hk-transit-eta/minibus"
	"hk-transit-eta/weather"

	"github.com/gorilla/mux"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rs/cors"
)

var database *sql.DB

// dataDir holds the JSON snapshots baked into the image at build time.
const dataDir = "data"

// Data-changing admin operations share one slot: reseeding while a refresh is
// writing would interleave two sets of writes over the same tables.
var dataJobInFlight atomic.Bool

// authorizeAdmin reports whether an admin request may proceed, writing the
// rejection itself when it may not. Admin endpoints stay disabled entirely
// until ADMIN_TOKEN is configured.
func authorizeAdmin(w http.ResponseWriter, r *http.Request) bool {
	token := os.Getenv("ADMIN_TOKEN")
	if token == "" {
		http.Error(w, "admin endpoints disabled: ADMIN_TOKEN not set", http.StatusServiceUnavailable)
		return false
	}
	if r.Header.Get("X-Admin-Token") != token {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

// startDataJob runs work in the background under the shared single-flight
// guard, replying 202 on success and 409 if another job is already running.
func startDataJob(w http.ResponseWriter, name string, work func()) {
	if !dataJobInFlight.CompareAndSwap(false, true) {
		http.Error(w, "another data job is already running", http.StatusConflict)
		return
	}
	go func() {
		defer dataJobInFlight.Store(false)
		work()
		log.Printf("%s finished", name)
	}()
	w.WriteHeader(http.StatusAccepted)
	fmt.Fprintf(w, "{\"status\":\"%s started\"}\n", name)
}

// handleAdminRefresh pulls fresh data from the official APIs. Intended to be
// driven by host cron or invoked manually — deliberately not an in-process
// ticker, since container restarts make wall-clock scheduling unreliable.
//
// This reaches the network and can run for many minutes; use reseed when the
// bundled snapshot is already the data you want.
func handleAdminRefresh(w http.ResponseWriter, r *http.Request) {
	if !authorizeAdmin(w, r) {
		return
	}
	startDataJob(w, "refresh", func() {
		if err := bus.Refresh(); err != nil {
			log.Printf("Bus refresh failed: %v", err)
		}
		if err := minibus.Refresh(); err != nil {
			log.Printf("Minibus refresh failed: %v", err)
		}
	})
}

// handleAdminReseed reloads the database from the JSON snapshot shipped in the
// image, without touching the network.
//
// Startup only seeds when the database is empty, so a deployment carrying an
// updated snapshot leaves an existing database on the old data. This applies it
// in seconds — the alternative being to drop the volume and restart, or to wait
// out a full API refresh. Seeding upserts, so it is safe to repeat.
func handleAdminReseed(w http.ResponseWriter, r *http.Request) {
	if !authorizeAdmin(w, r) {
		return
	}
	startDataJob(w, "reseed", func() {
		if !bus.SeedFromCache(dataDir) {
			log.Println("Reseed: bus snapshot missing or incomplete")
		}
		if !minibus.SeedFromCache(dataDir) {
			log.Println("Reseed: minibus snapshot missing or incomplete")
		}
	})
}

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

	// Proxied because data.weather.gov.hk sends no CORS header for this file.
	api.HandleFunc("/weather/rainfall-nowcast", weather.GetRainfallNowcast).Methods("GET")

	// Admin: trigger incremental data refresh
	api.HandleFunc("/admin/refresh", handleAdminRefresh).Methods("POST")
	api.HandleFunc("/admin/reseed", handleAdminReseed).Methods("POST")

	// Bus API endpoints
	api.HandleFunc("/bus/routes", bus.GetRoutes).Methods("GET")
	api.HandleFunc("/bus/stops", bus.GetStops).Methods("GET")
	api.HandleFunc("/bus/route-stops", bus.GetRouteStops).Methods("GET")

	// Search routes
	api.HandleFunc("/bus/search/routes", bus.SearchRoutes).Methods("GET")
	api.HandleFunc("/bus/search/stops", bus.SearchStops).Methods("GET")

	// New relationship endpoints
	api.HandleFunc("/bus/route-variants", bus.GetRouteVariants).Methods("GET")
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
