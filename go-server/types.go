package main

import "encoding/json"

type APICommon struct {
	Type               string          `json:"type"`
	Version            string          `json:"version"`
	GeneratedTimestamp string          `json:"generated_timestamp"`
	Data               json.RawMessage `json:"data"`
}

type KmbRoute struct {
	Route       string `json:"route"`
	Bound       string `json:"bound"`
	ServiceType string `json:"service_type"`
	OrigEn      string `json:"orig_en"`
	OrigTc      string `json:"orig_tc"`
	OrigSc      string `json:"orig_sc"`
	DestEn      string `json:"dest_en"`
	DestTc      string `json:"dest_tc"`
	DestSc      string `json:"dest_sc"`
}

type KmbStop struct {
	Stop   string `json:"stop"`
	NameEn string `json:"name_en"`
	NameTc string `json:"name_tc"`
	NameSc string `json:"name_sc"`
	Lat    string `json:"lat"`
	Long   string `json:"long"`
}

type KmbRouteStop struct {
	Route       string `json:"route"`
	Bound       string `json:"bound"`
	ServiceType string `json:"service_type"`
	Seq         string `json:"seq"`
	Stop        string `json:"stop"`
}

// CitybusCompany represents the company information from Citybus API
type CitybusCompany struct {
	Co            string `json:"co"`
	NameTc        string `json:"name_tc"`
	NameEn        string `json:"name_en"`
	URL           string `json:"url"`
	NameSc        string `json:"name_sc"`
	DataTimestamp string `json:"data_timestamp"`
}

type CitybusRoute struct {
	Co            string `json:"co"`
	Route         string `json:"route"`
	OrigTc        string `json:"orig_tc"`
	OrigEn        string `json:"orig_en"`
	DestTc        string `json:"dest_tc"`
	DestEn        string `json:"dest_en"`
	OrigSc        string `json:"orig_sc"`
	DestSc        string `json:"dest_sc"`
	DataTimestamp string `json:"data_timestamp"`
}

type CitybusStop struct {
	Stop          string `json:"stop"`
	NameEn        string `json:"name_en"`
	NameTc        string `json:"name_tc"`
	NameSc        string `json:"name_sc"`
	Lat           string `json:"lat"`
	Long          string `json:"long"`
	DataTimestamp string `json:"data_timestamp"`
}

type CitybusRouteStop struct {
	Route         string `json:"route"`
	Dir           string `json:"dir"`
	Seq           int    `json:"seq"`
	Stop          string `json:"stop"`
	DataTimestamp string `json:"data_timestamp"`
}

type Route struct {
	Id            string `json:"id"`
	Company       string `json:"company"`
	Direction     string `json:"direction"`
	Route         string `json:"route"`
	ServiceType   string `json:"service_type"`
	OrigEn        string `json:"orig_en"`
	OrigTc        string `json:"orig_tc"`
	OrigSc        string `json:"orig_sc"`
	DestEn        string `json:"dest_en"`
	DestTc        string `json:"dest_tc"`
	DestSc        string `json:"dest_sc"`
	DataTimestamp string `json:"data_timestamp"`
}

type Stop struct {
	Id            string `json:"id"`
	Company       string `json:"company"`
	Stop          string `json:"stop"`
	NameEn        string `json:"name_en"`
	NameTc        string `json:"name_tc"`
	NameSc        string `json:"name_sc"`
	Lat           string `json:"lat"`
	Long          string `json:"long"`
	DataTimestamp string `json:"data_timestamp"`
}

type RouteStop struct {
	Company       string `json:"company"`
	Route         string `json:"route"`
	Direction     string `json:"direction"`
	ServiceType   string `json:"service_type"`
	Seq           string `json:"seq"`
	Stop          string `json:"stop"`
	DataTimestamp string `json:"data_timestamp"`
}
