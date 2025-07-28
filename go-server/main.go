package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"hk-bus-tool/bus"
	"hk-bus-tool/minibus"

	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/cors"
)

var database *sql.DB

func main() {
	// Initialize databases
	initDatabases()

	if true && shouldFetchData() {
		// Run data fetches in background goroutines so server starts immediately
		go bus.FetchKmbData()
		go bus.FetchCitybusData()
	}
	if true && minibus.ShouldFetchMinibusData() {
		go minibus.FetchMinibusRoutes()
	}

	// Start HTTP server
	startServer()
}

func initDatabases() {
	var err error
	database, err = sql.Open("sqlite3", "../transport.db")
	if err != nil {
		log.Fatal("Error opening Bus Database:", err)
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

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)

	fmt.Println("Server starting on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func shouldFetchData() bool {
	// Check if KMB database has data
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM kmb_routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}

	// Check if Citybus database has data
	err = database.QueryRow("SELECT COUNT(*) FROM citybus_routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}

	return false
}
