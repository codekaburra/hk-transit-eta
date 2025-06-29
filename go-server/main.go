package main

import (
	"database/sql"
	"encoding/json"
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
	if shouldFetchData() {
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
}

func shouldFetchData() bool {
	return true
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
	api.HandleFunc("/kmb/routes", getKmbRoutes).Methods("GET")
	api.HandleFunc("/kmb/stops", getKmbStops).Methods("GET")
	api.HandleFunc("/kmb/route-stops", getKmbRouteStops).Methods("GET")

	// Citybus routes
	api.HandleFunc("/citybus/routes", getCitybusRoutes).Methods("GET")
	api.HandleFunc("/citybus/stops", getCitybusStops).Methods("GET")
	api.HandleFunc("/citybus/route-stops", getCitybusRouteStops).Methods("GET")

	// Search routes
	api.HandleFunc("/search/routes", searchRoutes).Methods("GET")
	api.HandleFunc("/search/stops", searchStops).Methods("GET")

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

// KMB API Handlers
func getKmbRoutes(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT route, bound, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc FROM kmb_routes LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []KmbRoute
	for rows.Next() {
		var route KmbRoute
		err := rows.Scan(&route.Route, &route.Bound, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
		if err != nil {
			continue
		}
		routes = append(routes, route)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

func getKmbStops(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT stop, name_en, name_tc, name_sc, lat, long FROM kmb_stops LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []KmbStop
	for rows.Next() {
		var stop KmbStop
		err := rows.Scan(&stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			continue
		}
		stops = append(stops, stop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stops)
}

func getKmbRouteStops(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT route, bound, service_type, seq, stop FROM route_stops LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStops []KmbRouteStop
	for rows.Next() {
		var routeStop KmbRouteStop
		err := rows.Scan(&routeStop.Route, &routeStop.Bound, &routeStop.ServiceType, &routeStop.Seq, &routeStop.Stop)
		if err != nil {
			continue
		}
		routeStops = append(routeStops, routeStop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routeStops)
}

// Citybus API Handlers
func getCitybusRoutes(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT route, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc FROM citybus_routes LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routes []KmbRoute
	for rows.Next() {
		var route KmbRoute
		err := rows.Scan(&route.Route, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
		if err != nil {
			continue
		}
		route.Bound = "1"       // Default for Citybus
		route.ServiceType = "1" // Default for Citybus
		routes = append(routes, route)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

func getCitybusStops(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT stop, name_en, name_tc, name_sc, lat, long FROM citybus_stops LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stops []KmbStop
	for rows.Next() {
		var stop KmbStop
		err := rows.Scan(&stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
		if err != nil {
			continue
		}
		stops = append(stops, stop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stops)
}

func getCitybusRouteStops(w http.ResponseWriter, r *http.Request) {
	rows, err := busDB.Query("SELECT route, dir, seq, stop FROM citybus_route_stops LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var routeStops []KmbRouteStop
	for rows.Next() {
		var routeStop KmbRouteStop
		err := rows.Scan(&routeStop.Route, &routeStop.Bound, &routeStop.Seq, &routeStop.Stop)
		if err != nil {
			continue
		}
		routeStop.ServiceType = "1" // Default for Citybus
		routeStops = append(routeStops, routeStop)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routeStops)
}

// Search API Handlers
func searchRoutes(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// Search in both KMB and Citybus routes
	var allRoutes []KmbRoute

	// Search KMB routes
	rows, err := busDB.Query(`
		SELECT route, bound, service_type, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc 
		FROM routes 
		WHERE route LIKE ? OR orig_en LIKE ? OR dest_en LIKE ? OR orig_tc LIKE ? OR dest_tc LIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var route KmbRoute
			err := rows.Scan(&route.Route, &route.Bound, &route.ServiceType, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
			if err == nil {
				allRoutes = append(allRoutes, route)
			}
		}
	}

	// Search Citybus routes
	rows, err = busDB.Query(`
		SELECT route, orig_en, orig_tc, orig_sc, dest_en, dest_tc, dest_sc 
		FROM citybus_routes 
		WHERE route LIKE ? OR orig_en LIKE ? OR dest_en LIKE ? OR orig_tc LIKE ? OR dest_tc LIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var route KmbRoute
			err := rows.Scan(&route.Route, &route.OrigEn, &route.OrigTc, &route.OrigSc, &route.DestEn, &route.DestTc, &route.DestSc)
			if err == nil {
				route.Bound = "1"
				route.ServiceType = "1"
				allRoutes = append(allRoutes, route)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allRoutes)
}

func searchStops(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// Search in both KMB and Citybus stops
	var allStops []KmbStop

	// Search KMB stops
	rows, err := busDB.Query(`
		SELECT stop, name_en, name_tc, name_sc, lat, long 
		FROM stops 
		WHERE stop LIKE ? OR name_en LIKE ? OR name_tc LIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var stop KmbStop
			err := rows.Scan(&stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
			if err == nil {
				allStops = append(allStops, stop)
			}
		}
	}

	// Search Citybus stops
	rows, err = busDB.Query(`
		SELECT stop, name_en, name_tc, name_sc, lat, long 
		FROM citybus_stops 
		WHERE stop LIKE ? OR name_en LIKE ? OR name_tc LIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var stop KmbStop
			err := rows.Scan(&stop.Stop, &stop.NameEn, &stop.NameTc, &stop.NameSc, &stop.Lat, &stop.Long)
			if err == nil {
				allStops = append(allStops, stop)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allStops)
}
