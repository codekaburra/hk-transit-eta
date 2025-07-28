package minibus

// Minibus region constants
const MinibusRegionHKI = "HKI"
const MinibusRegionKLN = "KLN"
const MinibusRegionNT = "NT"

// Minibus API response structure for route listing
type MinibusRegionalAPIResponse struct {
	Routes        []string `json:"routes"`
	DataTimestamp string   `json:"data_timestamp"`
}

// Detailed route information structures
type MinibusRoute struct {
	Region        string      `json:"region"`
	RouteCode     string      `json:"route_code"`
	RouteID       int         `json:"route_id"`
	DescriptionTC string      `json:"description_tc"`
	DescriptionSC string      `json:"description_sc"`
	DescriptionEN string      `json:"description_en"`
	DataTimestamp string      `json:"data_timestamp"`
	Directions    []Direction `json:"directions"`
}

type Direction struct {
	RouteSeq      int       `json:"route_seq"`
	OrigTC        string    `json:"orig_tc"`
	OrigSC        string    `json:"orig_sc"`
	OrigEN        string    `json:"orig_en"`
	DestTC        string    `json:"dest_tc"`
	DestSC        string    `json:"dest_sc"`
	DestEN        string    `json:"dest_en"`
	RemarksTC     *string   `json:"remarks_tc"`
	RemarksSC     *string   `json:"remarks_sc"`
	RemarksEN     *string   `json:"remarks_en"`
	DataTimestamp string    `json:"data_timestamp"`
	Headways      []Headway `json:"headways"`
}

type Headway struct {
	Weekdays       []bool `json:"weekdays"`
	PublicHoliday  bool   `json:"public_holiday"`
	HeadwaySeq     int    `json:"headway_seq"`
	StartTime      string `json:"start_time"`
	EndTime        string `json:"end_time"`
	Frequency      int    `json:"frequency"`
	FrequencyUpper *int   `json:"frequency_upper"`
}

// Route-Stop API response structures
type MinibusRouteStopResponse struct {
	RouteStops    []MinibusRouteStop `json:"route_stops"`
	DataTimestamp string             `json:"data_timestamp"`
}

type MinibusRouteStop struct {
	StopSeq int    `json:"stop_seq"`
	StopID  int    `json:"stop_id"`
	NameTC  string `json:"name_tc"`
	NameSC  string `json:"name_sc"`
	NameEN  string `json:"name_en"`
}

// Stop API response structures
type MinibusStopResponse struct {
	Coordinates   MinibusStopCoordinates `json:"coordinates"`
	Enabled       bool                   `json:"enabled"`
	RemarksTC     *string                `json:"remarks_tc"`
	RemarksSC     *string                `json:"remarks_sc"`
	RemarksEN     *string                `json:"remarks_en"`
	DataTimestamp string                 `json:"data_timestamp"`
}

type MinibusStopCoordinates struct {
	WGS84 MinibusCoordinate `json:"wgs84"`
	HK80  MinibusCoordinate `json:"hk80"`
}

type MinibusCoordinate struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}
