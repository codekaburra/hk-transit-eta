package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func fetchAPI(apiURL string) (*APICommon, error) {
	response, err := http.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("error making HTTP request: %v", err)
	}
	defer response.Body.Close()
	responseData, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}
	var apiResponse APICommon
	err = json.Unmarshal(responseData, &apiResponse)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling API response: %v", err)
	}
	return &apiResponse, nil
}
