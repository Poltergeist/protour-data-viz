package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Match represents a single match from the API
type Match struct {
	TableNumber  int    `json:"TableNumber"`
	ResultString string `json:"ResultString"`
	Competitors  []struct {
		Decklists []struct {
			DecklistID   string `json:"DecklistId"`
			PlayerID     int    `json:"PlayerId"`
			DecklistName string `json:"DecklistName"`
			Format       string `json:"Format"`
			FormatID     string `json:"FormatId"`
		} `json:"Decklists"`
		Team struct {
			Players []struct {
				ID          int    `json:"ID"`
				DisplayName string `json:"DisplayName"`
				ScreenName  string `json:"ScreenName"`
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

// fetchRoundMatches fetches match data for a specific round.
// roundIDs is the per-tournament round-number → round-ID mapping (from fetchRoundIDs).
// tournamentID is used to build the Referer header.
func fetchRoundMatches(tournamentID string, roundIDs map[int]string, roundNumber int) (*MatchResponse, error) {
	roundID, ok := roundIDs[roundNumber]
	if !ok {
		return nil, fmt.Errorf("no round ID known for round %d (tournament %s)", roundNumber, tournamentID)
	}

	apiURL := fmt.Sprintf("https://melee.gg/Match/GetRoundMatches/%s", roundID)

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
	data.Set("length", "500")
	data.Set("search[value]", "")
	data.Set("search[regex]", "false")

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Referer", fmt.Sprintf("https://melee.gg/Tournament/View/%s", tournamentID))
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var matchResp MatchResponse
	if err := json.Unmarshal(body, &matchResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return &matchResp, nil
}
