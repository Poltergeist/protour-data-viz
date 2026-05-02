package main

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
)

// roundButtonRegex matches <button> elements with class "round-selector" and a data-id attribute,
// regardless of attribute order.
var roundButtonRegex = regexp.MustCompile(`(?is)<button\b([^>]*\bclass="[^"]*\bround-selector\b[^"]*"[^>]*)>([^<]*)</button>`)
var dataIDRegex = regexp.MustCompile(`\bdata-id="(\d+)"`)
var roundNumberRegex = regexp.MustCompile(`(?i)round\s+(\d+)`)

// parseRoundIDs extracts a round-number → round-ID map from melee.gg tournament page HTML.
// Returns an error if no round buttons are found.
func parseRoundIDs(html string) (map[int]string, error) {
	matches := roundButtonRegex.FindAllStringSubmatch(html, -1)
	if len(matches) == 0 {
		return nil, fmt.Errorf("no round-selector buttons found in HTML")
	}

	ids := make(map[int]string)
	for _, m := range matches {
		attrs := m[1]
		label := m[2]

		idMatch := dataIDRegex.FindStringSubmatch(attrs)
		if len(idMatch) < 2 {
			continue
		}
		dataID := idMatch[1]

		numMatch := roundNumberRegex.FindStringSubmatch(label)
		if len(numMatch) < 2 {
			continue
		}
		num, err := strconv.Atoi(numMatch[1])
		if err != nil {
			continue
		}

		ids[num] = dataID
	}

	if len(ids) == 0 {
		return nil, fmt.Errorf("no round buttons matched expected pattern")
	}

	return ids, nil
}

// fetchRoundIDs hits the tournament page and parses out the round-number → round-ID map.
func fetchRoundIDs(tournamentID string) (map[int]string, error) {
	url := fmt.Sprintf("https://melee.gg/Tournament/View/%s", tournamentID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch tournament page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tournament page returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read tournament page: %w", err)
	}

	return parseRoundIDs(string(body))
}
