// Package httpapi provides the shared HTTP client and response envelope for
// the official HK transport data APIs (etabus / citybus / etagmb).
package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Response is the common envelope every official API wraps its payload in.
type Response struct {
	Type               string          `json:"type"`
	Version            string          `json:"version"`
	GeneratedTimestamp string          `json:"generated_timestamp"`
	Data               json.RawMessage `json:"data"`
}

// client has an explicit timeout so a hung upstream request can never stall
// a fetch or refresh run indefinitely.
var client = &http.Client{Timeout: 30 * time.Second}

// Fetch performs a GET and decodes the standard response envelope.
func Fetch(apiURL string) (*Response, error) {
	response, err := client.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("error making HTTP request: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d from %s", response.StatusCode, apiURL)
	}
	responseData, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}
	var apiResponse Response
	if err := json.Unmarshal(responseData, &apiResponse); err != nil {
		return nil, fmt.Errorf("error unmarshaling API response: %v", err)
	}
	return &apiResponse, nil
}

// FetchWithRetry retries transient failures with a fixed delay between
// attempts. Intended for long per-item fetch loops (Citybus stops, GMB
// route-stops) where a single blip shouldn't abort the whole run.
func FetchWithRetry(apiURL string, attempts int, delay time.Duration) (*Response, error) {
	var lastErr error
	for i := 0; i < attempts; i++ {
		if i > 0 {
			time.Sleep(delay)
		}
		resp, err := Fetch(apiURL)
		if err == nil {
			return resp, nil
		}
		lastErr = err
	}
	return nil, lastErr
}
