package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// RoundID mapping for the tournament
var roundIDs = map[int]string{
	1:  "1384568",
	2:  "1384570",
	3:  "1384572",
	4:  "1384574", // Start of Standard
	5:  "1384575",
	6:  "1384576",
	7:  "1384577",
	8:  "1384578", // End of Day 1 Standard
	9:  "1384579",
	10: "1384580",
	11: "1384581",
	12: "1384582", // Day 2 Standard starts
	13: "1384583",
	14: "1384584",
	15: "1384585",
	16: "1384586", // Day 2 Standard ends
}

// Match represents a single match from the API
type Match struct {
	TableNumber int    `json:"TableNumber"`
	ResultString string `json:"ResultString"`
	Competitors []struct {
		Team struct {
			Players []struct {
				ID          int    `json:"ID"`
				DisplayName string `json:"DisplayName"`
				ScreenName  string `json:"ScreenName"`
				Decklists   []struct {
					DecklistID   int    `json:"DecklistId"`
					DecklistName string `json:"DecklistName"`
				} `json:"Decklists"`
			} `json:"Players"`
		} `json:"Team"`
	} `json:"Competitors"`
}

// MatchResponse is the API response structure
type MatchResponse struct {
	Draw            int     `json:"draw"`
	RecordsTotal    int     `json:"recordsTotal"`
	RecordsFiltered int     `json:"recordsFiltered"`
	Data            []Match `json:"data"`
}

// fetchRoundMatches fetches match data for a specific round
func fetchRoundMatches(roundNumber int) (*MatchResponse, error) {
	roundID, ok := roundIDs[roundNumber]
	if !ok {
		return nil, fmt.Errorf("unknown round number: %d", roundNumber)
	}

	apiURL := fmt.Sprintf("https://melee.gg/Match/GetRoundMatches/%s", roundID)

	// Prepare POST data (DataTables format)
	data := url.Values{}
	data.Set("draw", "1")
	data.Set("columns[0][data]", "TableNumber")
	data.Set("columns[0][name]", "")
	data.Set("columns[0][searchable]", "true")
	data.Set("columns[0][orderable]", "true")
	data.Set("columns[0][search][value]", "")
	data.Set("columns[0][search][regex]", "false")
	data.Set("order[0][column]", "0")
	data.Set("order[0][dir]", "asc")
	data.Set("start", "0")
	data.Set("length", "500") // Fetch up to 500 matches
	data.Set("search[value]", "")
	data.Set("search[regex]", "false")

	// Create request
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers to mimic browser
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Referer", "https://melee.gg/Tournament/View/394299")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse JSON
	var matchResp MatchResponse
	if err := json.Unmarshal(body, &matchResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return &matchResp, nil
}
