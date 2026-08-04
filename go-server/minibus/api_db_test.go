package minibus

import (
	"net/http"
	"net/url"
	"testing"

	"hk-transit-eta/internal/testhttp"
)

// insertRoute writes one route direction directly, bypassing the fetchers.
func insertRoute(t *testing.T, region, code string, routeID, routeSeq int, descEN, destEN string) {
	t.Helper()
	_, err := minibusDB.Exec(`INSERT INTO minibus_route
		(region, route_code, route_id, route_seq, description_tc, description_sc, description_en,
		 orig_tc, orig_sc, orig_en, dest_tc, dest_sc, dest_en,
		 remarks_tc, remarks_sc, remarks_en, direction_data_timestamp, data_timestamp)
		VALUES ($1,$2,$3,$4,$5,$5,$6,'起','起','Orig',$7,$7,$8,'','','','','')`,
		region, code, routeID, routeSeq, descEN, descEN, destEN, destEN)
	if err != nil {
		t.Fatalf("inserting route %s/%d: %v", code, routeID, err)
	}
}

func insertRouteStop(t *testing.T, routeID, routeSeq, stopSeq, stopID int, nameTC string) {
	t.Helper()
	_, err := minibusDB.Exec(`INSERT INTO minibus_route_stop
		(route_id, route_seq, stop_seq, stop_id, name_tc, name_sc, name_en, data_timestamp)
		VALUES ($1,$2,$3,$4,$5,$5,$5,'')`, routeID, routeSeq, stopSeq, stopID, nameTC)
	if err != nil {
		t.Fatalf("inserting route-stop %d/%d: %v", routeID, stopSeq, err)
	}
}

func insertStop(t *testing.T, stopID int, lat, lng float64) {
	t.Helper()
	_, err := minibusDB.Exec(`INSERT INTO minibus_stop
		(stop_id, latitude, longitude, hk80_latitude, hk80_longitude, enabled, data_timestamp)
		VALUES ($1,$2,$3,0,0,true,'')`, stopID, lat, lng)
	if err != nil {
		t.Fatalf("inserting stop %d: %v", stopID, err)
	}
}

func insertHeadway(t *testing.T, routeID, routeSeq, headwaySeq, frequency int) {
	t.Helper()
	_, err := minibusDB.Exec(`INSERT INTO minibus_headway
		(route_id, route_seq, headway_seq,
		 weekday_monday, weekday_tuesday, weekday_wednesday, weekday_thursday,
		 weekday_friday, weekday_saturday, weekday_sunday, public_holiday,
		 start_time, end_time, frequency, frequency_upper)
		VALUES ($1,$2,$3, true,true,true,true,true,false,false, false,
		        '06:00','23:00',$4,NULL)`, routeID, routeSeq, headwaySeq, frequency)
	if err != nil {
		t.Fatalf("inserting headway %d/%d: %v", routeID, headwaySeq, err)
	}
}

// seedRegions gives one route per region so region filtering is observable.
func seedRegions(t *testing.T) {
	t.Helper()
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "HKI route", "銅鑼灣")
	insertRoute(t, MinibusRegionKLN, "2", 201, 1, "KLN route", "旺角")
	insertRoute(t, MinibusRegionNT, "3", 301, 1, "NT route", "沙田")
}

func TestGetMinibusRoutes(t *testing.T) {
	setupDB(t)
	seedRegions(t)

	t.Run("returns every region when none is given", func(t *testing.T) {
		var got []map[string]interface{}
		testhttp.CallJSON(t, GetMinibusRoutes, "/", &got)
		if len(got) != 3 {
			t.Errorf("got %d routes, want all 3 regions", len(got))
		}
	})

	t.Run("filters to one region", func(t *testing.T) {
		var got []map[string]interface{}
		testhttp.CallJSON(t, GetMinibusRoutes, "/?region="+MinibusRegionKLN, &got)
		if len(got) != 1 {
			t.Fatalf("got %d routes, want 1", len(got))
		}
		if got[0]["region"] != MinibusRegionKLN {
			t.Errorf("region = %v, want %s", got[0]["region"], MinibusRegionKLN)
		}
	})

	t.Run("an unknown region yields nothing", func(t *testing.T) {
		var got []map[string]interface{}
		testhttp.CallJSON(t, GetMinibusRoutes, "/?region=XXX", &got)
		if len(got) != 0 {
			t.Errorf("got %d routes, want none", len(got))
		}
	})
}

// A stop serves several routes, so the join multiplies rows; DISTINCT ON must
// collapse them back to one entry per stop.
func TestGetMinibusStopsReturnsEachStopOnce(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "route one", "A")
	insertRoute(t, MinibusRegionHKI, "2", 102, 1, "route two", "B")
	insertStop(t, 20001, 22.28, 114.15)
	// The same stop on two different routes.
	insertRouteStop(t, 101, 1, 1, 20001, "中環")
	insertRouteStop(t, 102, 1, 1, 20001, "中環")

	var got []map[string]interface{}
	testhttp.CallJSON(t, GetMinibusStops, "/", &got)

	if len(got) != 1 {
		t.Fatalf("got %d stops, want 1 — DISTINCT ON should collapse the join", len(got))
	}
	if got[0]["name_tc"] != "中環" {
		t.Errorf("name_tc = %v, want the name from the joined route-stop", got[0]["name_tc"])
	}
}

func TestGetMinibusRouteStops(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "outbound", "A")
	insertRoute(t, MinibusRegionHKI, "1", 101, 2, "inbound", "B")
	insertStop(t, 20001, 22.28, 114.15)
	insertStop(t, 20002, 22.29, 114.16)
	insertRouteStop(t, 101, 1, 1, 20001, "第一站")
	insertRouteStop(t, 101, 1, 2, 20002, "第二站")
	insertRouteStop(t, 101, 2, 1, 20002, "回程首站")

	t.Run("routeSeq selects one direction", func(t *testing.T) {
		var got []map[string]interface{}
		testhttp.CallJSON(t, GetMinibusRouteStops, "/?routeId=101&routeSeq=1", &got)
		if len(got) != 2 {
			t.Fatalf("got %d stops, want the 2 of direction 1", len(got))
		}
		if got[0]["stop_seq"].(float64) != 1 || got[1]["stop_seq"].(float64) != 2 {
			t.Errorf("stops out of order: %v", got)
		}
	})

	t.Run("without routeSeq both directions are returned", func(t *testing.T) {
		var got []map[string]interface{}
		testhttp.CallJSON(t, GetMinibusRouteStops, "/?routeId=101", &got)
		if len(got) != 3 {
			t.Errorf("got %d stops, want all 3", len(got))
		}
	})

	t.Run("routeId is required", func(t *testing.T) {
		rec := testhttp.CallJSON(t, GetMinibusRouteStops, "/", nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("a non-numeric routeId is rejected", func(t *testing.T) {
		rec := testhttp.CallJSON(t, GetMinibusRouteStops, "/?routeId=abc", nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	// Coordinates come from a left join, so a stop with no coordinates row
	// must still appear rather than being dropped from the sequence.
	t.Run("keeps a stop whose coordinates are missing", func(t *testing.T) {
		insertRouteStop(t, 101, 1, 3, 29999, "未有座標")
		var got []map[string]interface{}
		testhttp.CallJSON(t, GetMinibusRouteStops, "/?routeId=101&routeSeq=1", &got)
		if len(got) != 3 {
			t.Fatalf("got %d stops, want the stop without coordinates kept", len(got))
		}
		if got[2]["latitude"] != nil {
			t.Errorf("latitude = %v, want null for a stop with no coordinates", got[2]["latitude"])
		}
	})
}

// Postgres LIKE is case-sensitive; these searches must not be.
func TestSearchMinibusIsCaseInsensitive(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1A", 101, 1, "Causeway Bay Circular", "銅鑼灣")
	insertStop(t, 20001, 22.28, 114.15)
	insertRouteStop(t, 101, 1, 1, 20001, "Causeway Bay")

	t.Run("routes", func(t *testing.T) {
		for _, q := range []string{"causeway", "CAUSEWAY", "Causeway"} {
			var got []map[string]interface{}
			testhttp.CallJSON(t, SearchMinibusRoutes, "/?q="+url.QueryEscape(q), &got)
			if len(got) != 1 {
				t.Errorf("q=%q returned %d routes, want 1", q, len(got))
			}
		}
	})

	t.Run("stops", func(t *testing.T) {
		for _, q := range []string{"causeway bay", "CAUSEWAY BAY"} {
			var got []map[string]interface{}
			testhttp.CallJSON(t, SearchMinibusStops, "/?q="+url.QueryEscape(q), &got)
			if len(got) != 1 {
				t.Errorf("q=%q returned %d stops, want 1", q, len(got))
			}
		}
	})

	t.Run("a query is required", func(t *testing.T) {
		for name, h := range map[string]http.HandlerFunc{
			"routes": SearchMinibusRoutes,
			"stops":  SearchMinibusStops,
		} {
			rec := testhttp.CallJSON(t, h, "/", nil)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("%s: status = %d, want 400", name, rec.Code)
			}
		}
	})
}

func TestGetMinibusStopById(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "route", "A")
	insertStop(t, 20001, 22.28, 114.15)
	insertRouteStop(t, 101, 1, 1, 20001, "中環")

	t.Run("returns the stop with its name", func(t *testing.T) {
		var got map[string]interface{}
		testhttp.CallJSON(t, GetMinibusStopById, "/?stopId=20001", &got)
		if got["stop_id"].(float64) != 20001 {
			t.Errorf("stop_id = %v, want 20001", got["stop_id"])
		}
		if got["name_tc"] != "中環" {
			t.Errorf("name_tc = %v, want 中環", got["name_tc"])
		}
	})

	t.Run("unknown stop is a 404", func(t *testing.T) {
		rec := testhttp.CallJSON(t, GetMinibusStopById, "/?stopId=99999", nil)
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("a non-numeric stopId is rejected", func(t *testing.T) {
		rec := testhttp.CallJSON(t, GetMinibusStopById, "/?stopId=abc", nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})
}

func TestGetMinibusRoutesByStopId(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "first", "A")
	insertRoute(t, MinibusRegionHKI, "2", 102, 1, "second", "B")
	insertRoute(t, MinibusRegionHKI, "3", 103, 1, "elsewhere", "C")
	insertStop(t, 20001, 22.28, 114.15)
	insertRouteStop(t, 101, 1, 1, 20001, "共用站")
	insertRouteStop(t, 102, 1, 1, 20001, "共用站")
	insertRouteStop(t, 103, 1, 1, 20002, "別處")

	var got []map[string]interface{}
	testhttp.CallJSON(t, GetMinibusRoutesByStopId, "/?stopId=20001", &got)

	if len(got) != 2 {
		t.Fatalf("got %d routes, want the 2 serving that stop", len(got))
	}
	for _, r := range got {
		if r["route_code"] == "3" {
			t.Error("returned a route that does not serve the stop")
		}
	}
}

// Headways are assembled into a weekday array; the seven booleans must keep
// their order, Monday first.
func TestGetRouteByRouteIdAndDirectionAssemblesHeadways(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "route", "銅鑼灣")
	insertHeadway(t, 101, 1, 1, 15)
	insertHeadway(t, 101, 1, 2, 20)

	var got map[string]interface{}
	testhttp.CallJSON(t, GetRouteByRouteIdAndDirection, "/?routeId=101&routeSeq=1", &got)

	headways, ok := got["headways"].([]interface{})
	if !ok || len(headways) != 2 {
		t.Fatalf("headways = %v, want 2 entries", got["headways"])
	}

	first := headways[0].(map[string]interface{})
	weekdays, ok := first["weekdays"].([]interface{})
	if !ok || len(weekdays) != 7 {
		t.Fatalf("weekdays = %v, want 7 booleans", first["weekdays"])
	}
	// Seeded as Monday–Friday true, weekend false.
	for i := 0; i < 5; i++ {
		if weekdays[i] != true {
			t.Errorf("weekdays[%d] = %v, want true (weekday)", i, weekdays[i])
		}
	}
	for i := 5; i < 7; i++ {
		if weekdays[i] != false {
			t.Errorf("weekdays[%d] = %v, want false (weekend)", i, weekdays[i])
		}
	}
	if first["frequency"].(float64) != 15 {
		t.Errorf("frequency = %v, want 15", first["frequency"])
	}
}

func TestGetRouteByRouteIdAndDirectionEncodesEmptyHeadwaysAsArray(t *testing.T) {
	setupDB(t)
	insertRoute(t, MinibusRegionHKI, "1", 101, 1, "route", "銅鑼灣")

	var got map[string]interface{}
	rec := testhttp.CallJSON(t, GetRouteByRouteIdAndDirection, "/?routeId=101&routeSeq=1", &got)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	headways, ok := got["headways"].([]interface{})
	if !ok {
		t.Fatalf("headways = %#v, want an array", got["headways"])
	}
	if len(headways) != 0 {
		t.Errorf("headways = %#v, want an empty array", headways)
	}
}

func TestGetRouteByRouteIdAndDirectionErrors(t *testing.T) {
	setupDB(t)

	cases := []struct {
		name   string
		target string
		want   int
	}{
		{"both parameters required", "/", http.StatusBadRequest},
		{"routeSeq required", "/?routeId=101", http.StatusBadRequest},
		{"non-numeric routeId", "/?routeId=abc&routeSeq=1", http.StatusBadRequest},
		{"non-numeric routeSeq", "/?routeId=101&routeSeq=x", http.StatusBadRequest},
		{"unknown route", "/?routeId=99999&routeSeq=1", http.StatusNotFound},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := testhttp.CallJSON(t, GetRouteByRouteIdAndDirection, tc.target, nil)
			if rec.Code != tc.want {
				t.Errorf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}

func TestMinibusGetRouteCount(t *testing.T) {
	setupDB(t)
	seedRegions(t)

	var got map[string]interface{}
	testhttp.CallJSON(t, GetRouteCount, "/", &got)

	if got["type"] != "minibus" {
		t.Errorf("type = %v, want minibus", got["type"])
	}
	if got["count"].(float64) != 3 {
		t.Errorf("count = %v, want 3", got["count"])
	}
}

// Every list handler must encode an empty result as [] with a 200. null would
// crash a client mapping over the response, and a 500 would be masked by an
// assertion that only excludes null.
func TestMinibusListHandlersEncodeEmptyResultsAsArrays(t *testing.T) {
	setupDB(t)

	cases := map[string]struct {
		handler http.HandlerFunc
		target  string
	}{
		"routes":         {GetMinibusRoutes, "/"},
		"stops":          {GetMinibusStops, "/"},
		"route-stops":    {GetMinibusRouteStops, "/?routeId=99999"},
		"routes-by-stop": {GetMinibusRoutesByStopId, "/?stopId=99999"},
		"search-routes":  {SearchMinibusRoutes, "/?q=NOPE"},
		"search-stops":   {SearchMinibusStops, "/?q=NOPE"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			testhttp.AssertEmptyJSONArray(t, testhttp.CallJSON(t, tc.handler, tc.target, nil))
		})
	}
}
