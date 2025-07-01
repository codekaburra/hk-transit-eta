package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/cors"
)

var busDB *sql.DB

func main() {
	// Initialize databases
	initDatabases()

	// Fetch and store data (only if databases are empty)
	if false && shouldFetchData() {
		fmt.Println("Fetching fresh data from APIs...")
		FetchKmbData()
		FetchCitybusData()
	}

	// Start HTTP server
	startServer()
}

func initDatabases() {
	var err error
	busDB, err = sql.Open("sqlite3", "../bus.db")
	if err != nil {
		log.Fatal("Error opening Bus Database:", err)
	}
	initBusDatabase()
}

func shouldFetchData() bool {
	// Check if KMB database has data
	var count int
	err := busDB.QueryRow("SELECT COUNT(*) FROM kmb_routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}

	// Check if Citybus database has data
	err = busDB.QueryRow("SELECT COUNT(*) FROM citybus_routes").Scan(&count)
	if err != nil || count == 0 {
		return true
	}

	return false
}

func startServer() {
	r := mux.NewRouter()

	// API Routes
	api := r.PathPrefix("/api").Subrouter()

	// KMB routes
	api.HandleFunc("/routes", getRoutes).Methods("GET")
	api.HandleFunc("/stops", getStops).Methods("GET")
	api.HandleFunc("/route-stops", getRouteStops).Methods("GET")

	// Search routes
	api.HandleFunc("/search/routes", searchRoutes).Methods("GET")
	api.HandleFunc("/search/stops", searchStops).Methods("GET")

	// New relationship endpoints
	api.HandleFunc("/stops-by-route", getStopsByRouteId).Methods("GET")
	api.HandleFunc("/routes-by-stop", getRoutesByStopId).Methods("GET")
	api.HandleFunc("/stops-nearby", getStopsNearby).Methods("GET")

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
