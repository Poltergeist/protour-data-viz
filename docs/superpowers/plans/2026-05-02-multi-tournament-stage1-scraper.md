# Multi-tournament Stage 1: Registry + Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `data/tournaments.json` registry and refactor the Go scraper to be registry-driven, supporting multiple tournaments and resolving melee.gg round IDs dynamically. Run the new scraper against tournament 415628 to produce its data files.

**Architecture:** Hardcoded `tournamentID` and `tournamentURL` constants in `scraper/main.go` are removed. A new `scraper/registry.go` loads `data/tournaments.json`. A new `scraper/round_ids.go` fetches the melee.gg tournament page and parses round-button `data-id` attributes to build the round-number → round-ID map at runtime (replacing the hardcoded `roundIDs` map in `api.go`). `main.go` becomes a thin orchestrator with two modes: sweep (no flag, iterates non-`completed` registry entries) and targeted (`-tournament <id>`).

**Tech Stack:** Go 1.25, standard library `net/http`, `encoding/json`, `regexp`, `flag`, `testing`. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-02-multi-tournament-design.md` (sections "Tournament registry", "Scraper").

**Round ID discovery — design addendum.** The spec assumed the existing `roundIDs` map could be parametrized, but inspection of `scraper/api.go` shows it is hardcoded for tournament 394299. New tournaments have entirely different IDs. This plan adds dynamic discovery: GET `https://melee.gg/Tournament/View/{id}`, parse `<button class="round-selector" data-id="...">` elements (regex), build the map per-tournament. This is a one-time HTTP call per scrape that happens before any round fetches. Rationale matches the spec's "registry as single source of truth" principle — no manual round-ID maintenance.

---

### Task 1: Create `data/tournaments.json` registry

**Files:**
- Create: `data/tournaments.json`

- [ ] **Step 1: Write the registry file**

```json
[
  {
    "id": "415628",
    "slug": "TBD-FILL-IN",
    "name": "TBD-FILL-IN",
    "format": "Standard",
    "date": "TBD-FILL-IN",
    "rounds": ["4-8", "12-16"],
    "completed": false
  },
  {
    "id": "394299",
    "slug": "lorwyn-eclipsed",
    "name": "Pro Tour Lorwyn Eclipsed",
    "format": "Standard",
    "date": "2026-01-31",
    "rounds": ["4-8"],
    "completed": true
  }
]
```

The `TBD-FILL-IN` placeholders for tournament 415628 are user-supplied values — the implementer must ask the user for `slug`, `name`, and `date` before continuing. The slug must be URL-safe (lowercase, hyphens, no spaces). The `rounds` array reflects that 415628 is a 16-round event with Standard play in rounds 4-8 (Day 1) and 12-16 (Day 2); confirm with the user if the actual structure differs.

- [ ] **Step 2: Verify JSON is valid**

Run: `python3 -m json.tool data/tournaments.json > /dev/null && echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/tournaments.json
git commit -m "feat(data): add tournaments registry for multi-tournament support"
```

---

### Task 2: Add Go test for registry loader

**Files:**
- Create: `scraper/registry_test.go`

- [ ] **Step 1: Write the failing test**

```go
package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadRegistry_Success(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "tournaments.json")
	contents := `[
		{"id":"100","slug":"alpha","name":"Alpha","format":"Standard","date":"2026-01-01","rounds":["1-3"],"completed":false},
		{"id":"200","slug":"beta","name":"Beta","format":"Standard","date":"2026-02-01","rounds":["4-8","12-16"],"completed":true}
	]`
	if err := os.WriteFile(path, []byte(contents), 0644); err != nil {
		t.Fatalf("setup: %v", err)
	}

	registry, err := loadRegistry(path)
	if err != nil {
		t.Fatalf("loadRegistry returned error: %v", err)
	}

	if len(registry) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(registry))
	}
	if registry[0].ID != "100" || registry[0].Slug != "alpha" {
		t.Errorf("first entry mismatch: %+v", registry[0])
	}
	if registry[1].Completed != true {
		t.Errorf("second entry should be completed")
	}
	if len(registry[1].Rounds) != 2 || registry[1].Rounds[1] != "12-16" {
		t.Errorf("rounds parsed wrong: %v", registry[1].Rounds)
	}
}

func TestLoadRegistry_FileMissing(t *testing.T) {
	_, err := loadRegistry("/nonexistent/path/tournaments.json")
	if err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
}

func TestLoadRegistry_InvalidJSON(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "tournaments.json")
	if err := os.WriteFile(path, []byte("{not json"), 0644); err != nil {
		t.Fatalf("setup: %v", err)
	}
	_, err := loadRegistry(path)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestFindTournament(t *testing.T) {
	registry := Registry{
		{ID: "100", Slug: "alpha"},
		{ID: "200", Slug: "beta"},
	}

	found, ok := registry.find("200")
	if !ok || found.Slug != "beta" {
		t.Errorf("expected to find beta, got %+v ok=%v", found, ok)
	}

	_, ok = registry.find("999")
	if ok {
		t.Errorf("expected not found for id 999")
	}
}

func TestActiveTournaments(t *testing.T) {
	registry := Registry{
		{ID: "100", Completed: false},
		{ID: "200", Completed: true},
		{ID: "300", Completed: false},
	}

	active := registry.active()
	if len(active) != 2 {
		t.Fatalf("expected 2 active, got %d", len(active))
	}
	if active[0].ID != "100" || active[1].ID != "300" {
		t.Errorf("active tournaments wrong order: %+v", active)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scraper && go test ./... -run TestLoadRegistry`
Expected: FAIL — `loadRegistry` undefined, `Registry` undefined.

---

### Task 3: Implement registry loader

**Files:**
- Create: `scraper/registry.go`

- [ ] **Step 1: Write the implementation**

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"
)

// Tournament represents one entry in data/tournaments.json
type Tournament struct {
	ID        string   `json:"id"`
	Slug      string   `json:"slug"`
	Name      string   `json:"name"`
	Format    string   `json:"format"`
	Date      string   `json:"date"`
	Rounds    []string `json:"rounds"`
	Completed bool     `json:"completed"`
}

// Registry is the in-memory representation of data/tournaments.json
type Registry []Tournament

// loadRegistry reads and parses the tournaments registry file
func loadRegistry(path string) (Registry, error) {
	bytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read registry %s: %w", path, err)
	}

	var registry Registry
	if err := json.Unmarshal(bytes, &registry); err != nil {
		return nil, fmt.Errorf("parse registry %s: %w", path, err)
	}

	return registry, nil
}

// find locates a tournament by ID
func (r Registry) find(id string) (Tournament, bool) {
	for _, t := range r {
		if t.ID == id {
			return t, true
		}
	}
	return Tournament{}, false
}

// active returns tournaments that have not been marked completed
func (r Registry) active() Registry {
	var out Registry
	for _, t := range r {
		if !t.Completed {
			out = append(out, t)
		}
	}
	return out
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd scraper && go test ./... -run TestLoadRegistry -run TestFindTournament -run TestActiveTournaments -v`
Expected: PASS for all four tests.

- [ ] **Step 3: Commit**

```bash
git add scraper/registry.go scraper/registry_test.go
git commit -m "feat(scraper): add tournament registry loader"
```

---

### Task 4: Add test for round ID discovery

**Files:**
- Create: `scraper/round_ids_test.go`

- [ ] **Step 1: Write the failing test**

```go
package main

import "testing"

func TestParseRoundIDs(t *testing.T) {
	html := `
		<html><body>
		<div>
			<button class="round-selector" data-id="9876541">Round 1</button>
			<button class="round-selector" data-id="9876542">Round 2</button>
			<button class="round-selector" data-id="9876543">Round 3</button>
			<button class="round-selector" data-id="9876544">Round 4</button>
		</div>
		</body></html>`

	ids, err := parseRoundIDs(html)
	if err != nil {
		t.Fatalf("parseRoundIDs error: %v", err)
	}

	if len(ids) != 4 {
		t.Fatalf("expected 4 round IDs, got %d", len(ids))
	}
	if ids[1] != "9876541" {
		t.Errorf("round 1 mismatch: %s", ids[1])
	}
	if ids[4] != "9876544" {
		t.Errorf("round 4 mismatch: %s", ids[4])
	}
}

func TestParseRoundIDs_Empty(t *testing.T) {
	_, err := parseRoundIDs("<html><body>no buttons</body></html>")
	if err == nil {
		t.Fatal("expected error for HTML with no round buttons")
	}
}

func TestParseRoundIDs_HandlesAttributeOrderVariation(t *testing.T) {
	// Real melee.gg HTML may have data-id before or after class
	html := `
		<button data-id="111" class="round-selector">R1</button>
		<button class="other-class" data-id="999">ignore</button>
		<button class="round-selector special" data-id="222">R2</button>
	`

	ids, err := parseRoundIDs(html)
	if err != nil {
		t.Fatalf("parseRoundIDs error: %v", err)
	}

	if len(ids) != 2 {
		t.Fatalf("expected 2 round IDs (only round-selector class), got %d: %v", len(ids), ids)
	}
	if ids[1] != "111" || ids[2] != "222" {
		t.Errorf("ids parsed wrong: %v", ids)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scraper && go test ./... -run TestParseRoundIDs`
Expected: FAIL — `parseRoundIDs` undefined.

---

### Task 5: Implement round ID discovery

**Files:**
- Create: `scraper/round_ids.go`

- [ ] **Step 1: Write the implementation**

```go
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd scraper && go test ./... -run TestParseRoundIDs -v`
Expected: PASS for all three tests.

- [ ] **Step 3: Commit**

```bash
git add scraper/round_ids.go scraper/round_ids_test.go
git commit -m "feat(scraper): discover melee.gg round IDs from tournament page"
```

---

### Task 6: Refactor `api.go` to accept round IDs as a parameter

**Files:**
- Modify: `scraper/api.go`

- [ ] **Step 1: Read the current file**

Read `scraper/api.go` lines 1-122. Note the hardcoded `roundIDs` package var (lines 13-30) and the `fetchRoundMatches` function that closes over it.

- [ ] **Step 2: Replace contents**

```go
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
```

The hardcoded `roundIDs` package var is removed. The function signature changes from `fetchRoundMatches(roundNumber int)` to `fetchRoundMatches(tournamentID string, roundIDs map[int]string, roundNumber int)`.

- [ ] **Step 3: Verify it still compiles** (main.go won't link yet — that's expected)

Run: `cd scraper && go build ./... 2>&1 | head -20`
Expected: Errors about `fetchRoundMatches` argument count mismatch in `main.go`. Other than that, no errors related to `api.go` itself.

---

### Task 7: Refactor `filter_decklists.go` to remove package-level `outputDir`/`tournamentID` references

**Files:**
- Modify: `scraper/filter_decklists.go`

- [ ] **Step 1: Replace contents**

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// generateDecklistsFromMelee writes a decklists.json file containing player+archetype only
// (no card lists). This is a fallback used when full decklist HTML scraping is unavailable.
// Currently the main scraper path uses fetchDecklistsFromMelee instead, but this is kept
// for the case where melee.gg's decklist HTML format changes.
func generateDecklistsFromMelee(outputDir, tournamentID string, playerArchetype map[string]string, playerNames map[string]string) error {
	var decklists []DeckInfo

	for normalizedName, archetype := range playerArchetype {
		displayName := playerNames[normalizedName]
		if displayName == "" {
			displayName = normalizedName
		}

		decklists = append(decklists, DeckInfo{
			PlayerName: displayName,
			Archetype:  archetype,
			MainDeck:   []CardInfo{},
			Sideboard:  []CardInfo{},
		})
	}

	sort.Slice(decklists, func(i, j int) bool {
		return decklists[i].PlayerName < decklists[j].PlayerName
	})

	decklistPath := filepath.Join(outputDir, fmt.Sprintf("tournament-%s-decklists.json", tournamentID))
	file, err := os.Create(decklistPath)
	if err != nil {
		return fmt.Errorf("failed to create decklists file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(decklists); err != nil {
		return fmt.Errorf("failed to encode decklists: %w", err)
	}

	fmt.Printf("  Generated %d decklists from melee.gg data\n", len(decklists))
	return nil
}
```

The function signature changes from `generateDecklistsFromMelee(playerArchetype, playerNames)` to `generateDecklistsFromMelee(outputDir, tournamentID, playerArchetype, playerNames)`. This function isn't called from `main.go` (only present as a fallback), so no caller updates needed in this task.

- [ ] **Step 2: Verify**

Run: `cd scraper && go vet ./...`
Expected: No errors specific to `filter_decklists.go`. (Other errors from `main.go` still expected.)

---

### Task 8: Refactor `main.go` — remove constants, accept tournament parameter

**Files:**
- Modify: `scraper/main.go`

- [ ] **Step 1: Read the current file**

Read `scraper/main.go` lines 1-275 to confirm structure.

- [ ] **Step 2: Replace contents**

```go
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

const (
	outputDir    = "../data"
	registryFile = "tournaments.json"
)

func main() {
	tournamentFlag := flag.String("tournament", "", "Tournament ID to scrape (must exist in registry). If empty, scrapes all non-completed tournaments.")
	roundsFlag := flag.String("rounds", "", "Override rounds for this run (e.g. '4-8' or '4-8,12-16'). When empty, uses the registry's rounds field.")
	flag.Parse()

	registryPath := filepath.Join(outputDir, registryFile)
	registry, err := loadRegistry(registryPath)
	if err != nil {
		log.Fatalf("Failed to load registry %s: %v", registryPath, err)
	}

	var targets Registry
	if *tournamentFlag != "" {
		t, ok := registry.find(*tournamentFlag)
		if !ok {
			log.Fatalf("Tournament %s not found in registry. Add it to %s before scraping.", *tournamentFlag, registryPath)
		}
		if t.Completed {
			log.Fatalf("Tournament %s is marked completed in the registry. Flip completed:false to re-scrape.", *tournamentFlag)
		}
		targets = Registry{t}
	} else {
		targets = registry.active()
		if len(targets) == 0 {
			log.Println("No active (non-completed) tournaments in registry. Nothing to do.")
			return
		}
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	for i, t := range targets {
		if i > 0 {
			time.Sleep(1 * time.Second) // polite delay between tournaments
		}
		if err := scrapeTournament(t, *roundsFlag); err != nil {
			log.Printf("Tournament %s (%s) failed: %v", t.ID, t.Name, err)
			continue
		}
	}

	log.Println("Scraping completed.")
}

// scrapeTournament runs the full scrape for one tournament.
// roundsOverride, when non-empty, replaces the registry's rounds for this run only.
func scrapeTournament(t Tournament, roundsOverride string) error {
	tournamentURL := fmt.Sprintf("https://melee.gg/Tournament/View/%s", t.ID)
	log.Printf("Starting scrape of %s (%s)", t.ID, t.Name)
	log.Printf("  URL: %s", tournamentURL)

	roundsStr := joinRounds(t.Rounds)
	if roundsOverride != "" {
		roundsStr = roundsOverride
		log.Printf("  Rounds: %s (overridden via -rounds)", roundsStr)
	} else {
		log.Printf("  Rounds: %s (from registry)", roundsStr)
	}

	rounds, err := parseRounds(roundsStr)
	if err != nil {
		return fmt.Errorf("invalid rounds: %w", err)
	}
	log.Printf("  Resolved round numbers: %v", rounds)

	log.Println("  Discovering melee.gg round IDs...")
	roundIDs, err := fetchRoundIDs(t.ID)
	if err != nil {
		return fmt.Errorf("discover round IDs: %w", err)
	}
	log.Printf("  Found %d round buttons", len(roundIDs))

	allMatches := make(map[int][]Match)
	for _, roundNum := range rounds {
		log.Printf("  Fetching Round %d...", roundNum)

		matches, err := fetchRoundMatches(t.ID, roundIDs, roundNum)
		if err != nil {
			log.Printf("  Warning: failed to fetch Round %d: %v", roundNum, err)
			continue
		}
		log.Printf("    %d matches", matches.RecordsTotal)
		allMatches[roundNum] = matches.Data

		time.Sleep(1 * time.Second)
	}

	if err := saveMatchData(t.ID, allMatches); err != nil {
		return fmt.Errorf("save matches: %w", err)
	}

	log.Println("  Extracting deck info from matches...")
	playerArchetype := extractPlayerDecksFromMatches(allMatches)
	playerNames := extractPlayerNamesFromMatches(allMatches)
	log.Printf("  %d players mapped to decks", len(playerArchetype))

	if err := savePlayerDeckMapping(t.ID, playerArchetype); err != nil {
		return fmt.Errorf("save player decks: %w", err)
	}

	log.Println("  Fetching complete decklists from melee.gg...")
	decklists, err := fetchDecklistsFromMelee(allMatches, playerArchetype, playerNames)
	if err != nil {
		return fmt.Errorf("fetch decklists: %w", err)
	}
	log.Printf("  Fetched %d decklists", len(decklists))

	if err := saveDecklistsData(t.ID, decklists); err != nil {
		return fmt.Errorf("save decklists: %w", err)
	}

	if len(playerArchetype) > 0 && len(allMatches) > 0 {
		log.Println("  Aggregating statistics...")
		stats := aggregateStats(allMatches, playerArchetype)
		log.Printf("  Stats for %d archetypes", len(stats.Archetypes))

		if err := saveStatsData(t.ID, stats); err != nil {
			return fmt.Errorf("save stats: %w", err)
		}

		printStatsSummary(stats)
	}

	log.Printf("Tournament %s done.", t.ID)
	return nil
}

// joinRounds turns ["4-8", "12-16"] into "4-8,12-16" — the form parseRounds already understands.
func joinRounds(rounds []string) string {
	out := ""
	for i, r := range rounds {
		if i > 0 {
			out += ","
		}
		out += r
	}
	return out
}

func printStatsSummary(stats *TournamentStats) {
	log.Println("\n=== Tournament Statistics Summary ===")

	type archetypeWithWins struct {
		name    string
		stats   *ArchetypeStats
		matches int
	}

	var archetypes []archetypeWithWins
	for name, archStats := range stats.Archetypes {
		matches := archStats.Wins + archStats.Losses
		archetypes = append(archetypes, archetypeWithWins{name: name, stats: archStats, matches: matches})
	}

	log.Println("\nTop Archetypes (10+ matches):")
	count := 0
	for _, arch := range archetypes {
		if arch.matches >= 10 && count < 5 {
			log.Printf("  %s: %d-%d (%.1f%% win rate)",
				arch.name, arch.stats.Wins, arch.stats.Losses, arch.stats.WinRate)
			count++
		}
	}
	log.Printf("\nTotal archetypes: %d", len(stats.Archetypes))
	log.Println("=====================================\n")
}

func saveMatchData(tournamentID string, matches map[int][]Match) error {
	return saveJSON(tournamentID, "matches", matches)
}

func savePlayerDeckMapping(tournamentID string, playerDecks map[string]string) error {
	return saveJSON(tournamentID, "player-decks", playerDecks)
}

func saveDecklistsData(tournamentID string, decklists []DeckInfo) error {
	return saveJSON(tournamentID, "decklists", decklists)
}

func saveStatsData(tournamentID string, stats *TournamentStats) error {
	return saveJSON(tournamentID, "stats", stats)
}

func saveJSON(tournamentID, kind string, data interface{}) error {
	filename := fmt.Sprintf("tournament-%s-%s.json", tournamentID, kind)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("create %s: %w", outputPath, err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return fmt.Errorf("encode %s: %w", outputPath, err)
	}

	log.Printf("    Saved %s", outputPath)
	return nil
}

func extractPlayerDecksFromMatches(allMatches map[int][]Match) map[string]string {
	playerDecks := make(map[string]string)

	for _, matches := range allMatches {
		for _, match := range matches {
			for _, competitor := range match.Competitors {
				if len(competitor.Decklists) > 0 && len(competitor.Team.Players) > 0 {
					deckName := competitor.Decklists[0].DecklistName
					playerName := competitor.Team.Players[0].DisplayName

					if deckName != "" && playerName != "" {
						normalizedName := normalizePlayerName(playerName)
						playerDecks[normalizedName] = deckName
					}
				}
			}
		}
	}

	return playerDecks
}

func extractPlayerNamesFromMatches(allMatches map[int][]Match) map[string]string {
	playerNames := make(map[string]string)

	for _, matches := range allMatches {
		for _, match := range matches {
			for _, competitor := range match.Competitors {
				if len(competitor.Team.Players) > 0 {
					playerName := competitor.Team.Players[0].DisplayName
					if playerName != "" {
						normalizedName := normalizePlayerName(playerName)
						playerNames[normalizedName] = playerName
					}
				}
			}
		}
	}

	return playerNames
}
```

Key changes from the old `main.go`:
- Removed `tournamentURL` and `tournamentID` package constants. `outputDir` stays.
- `outputDir` becomes a relative path the registry helper uses to find `tournaments.json`.
- New `-tournament` flag; `-rounds` becomes optional override.
- New `scrapeTournament` function does what the old top-level loop did, but parametrized.
- All `save*` functions take `tournamentID` as a parameter and delegate to a shared `saveJSON`.
- `parseRounds` is reused exactly as-is (it already handles `"4-8,12-16"` strings).

- [ ] **Step 3: Build and verify**

Run: `cd scraper && go build ./...`
Expected: Build succeeds with no errors. (`generateDecklistsFromMelee` is now unused but that was already true; the linker doesn't complain about unused package functions in Go.)

- [ ] **Step 4: Run all tests**

Run: `cd scraper && go test ./... -v`
Expected: All registry and round-ID tests pass.

- [ ] **Step 5: Commit**

```bash
git add scraper/main.go scraper/api.go scraper/filter_decklists.go
git commit -m "refactor(scraper): make tournament ID a runtime parameter"
```

---

### Task 9: Sanity-check the existing 394299 dataset is still reproducible

This is a *non-destructive* check: we re-scrape 394299 (which is `completed: true`) by temporarily flipping the flag, compare output to the committed JSON files, then revert. If the new scraper matches the old behavior, we're confident the refactor didn't break anything.

**Files:**
- Modify (temporarily): `data/tournaments.json`

- [ ] **Step 1: Flip 394299 to active**

Edit `data/tournaments.json` and set the 394299 entry's `"completed": true` to `"completed": false`. Save.

- [ ] **Step 2: Back up the existing 394299 data files**

```bash
mkdir -p /tmp/protour-394299-backup
cp data/tournament-394299-*.json /tmp/protour-394299-backup/
```

- [ ] **Step 3: Re-scrape 394299**

```bash
cd scraper && go run . -tournament 394299
```
Expected: Logs show round-ID discovery, fetches rounds 4-8, writes the four `tournament-394299-*.json` files. Takes 2-3 minutes.

- [ ] **Step 4: Compare match counts**

```bash
diff <(jq -S '.' /tmp/protour-394299-backup/tournament-394299-matches.json | head -100) <(jq -S '.' data/tournament-394299-matches.json | head -100)
```
Expected: No diff in the first 100 lines (or only trivial whitespace diffs). If material content differs, stop and investigate before continuing.

- [ ] **Step 5: Revert the registry flag**

Edit `data/tournaments.json` and set 394299's `"completed"` back to `true`.

- [ ] **Step 6: Restore exact original data files** (the re-scrape may have produced functionally-equivalent but byte-different output)

```bash
cp /tmp/protour-394299-backup/tournament-394299-*.json data/
rm -rf /tmp/protour-394299-backup
```

- [ ] **Step 7: Verify clean working tree for `data/`**

Run: `git status data/`
Expected: Only `data/tournaments.json` shown as new file (from Task 1). No changes to existing 394299 JSONs. If 394299 JSONs differ, commit those changes separately with message `chore(data): re-emit 394299 dataset under multi-tournament scraper` — this is acceptable but should be visible.

---

### Task 10: Scrape tournament 415628

**Files:**
- Generates: `data/tournament-415628-matches.json`, `tournament-415628-decklists.json`, `tournament-415628-player-decks.json`, `tournament-415628-stats.json`

- [ ] **Step 1: Confirm registry has correct values for 415628**

Read `data/tournaments.json`. Verify the 415628 entry has real values for `slug`, `name`, `date` (not `TBD-FILL-IN`). If they're still placeholders, ask the user before scraping.

- [ ] **Step 2: Run the scraper**

```bash
cd scraper && go run . -tournament 415628
```
Expected: Logs show round-ID discovery succeeded, all rounds in `["4-8", "12-16"]` fetched, four output files written under `data/`. Roughly 3-5 minutes given Day 1 + Day 2 rounds. If the round-ID discovery fails (zero buttons matched), the regex in `round_ids.go` may need adjustment for differences in the live tournament page HTML — inspect the page source manually and refine.

- [ ] **Step 3: Spot-check the data**

```bash
jq 'length' data/tournament-415628-decklists.json     # should print player count, expect 200+
jq 'keys' data/tournament-415628-matches.json         # should list rounds 4,5,6,7,8,12,13,14,15,16
jq '.archetypes | length' data/tournament-415628-stats.json  # archetype count, expect 20+
```

- [ ] **Step 4: Commit**

```bash
git add data/tournament-415628-*.json
git commit -m "feat(data): add tournament 415628 scraped dataset"
```

---

### Task 11: Update CLAUDE.md to reflect new scraper behavior

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the "Scraper (Go)" command block**

In `CLAUDE.md`, find the `### Scraper (Go)` heading and replace its code block with:

```bash
cd scraper
go run .                            # sweep: scrape all non-completed tournaments in data/tournaments.json
go run . -tournament 415628         # targeted: scrape one tournament (must be in registry)
go run . -tournament 415628 -rounds "4-8"   # override registry rounds for this run
go test ./...                       # run scraper unit tests
go build -o scraper                 # build binary
```

And update the surrounding paragraph to say:

> Output goes to `../data/`. The scraper reads `data/tournaments.json` to know what to scrape; `completed: true` entries are skipped. Round IDs are discovered from the tournament page on each run (no hardcoded mapping). Polite 1s delay between rounds and between tournaments — don't remove it.

- [ ] **Step 2: Update the "data contract" section**

Replace the existing description with:

> Five files in `data/` form the contract:
>
> - `tournaments.json` — registry of all known tournaments (id, slug, name, format, date, rounds, completed). Hand-maintained.
> - `tournament-<id>-matches.json` — per-tournament match data keyed by round number
> - `tournament-<id>-decklists.json` — per-tournament 60+15 decklists per player
> - `tournament-<id>-player-decks.json` — per-tournament player → archetype map
> - `tournament-<id>-stats.json` — per-tournament aggregated stats + matchup matrix
>
> The `mcp-server` allowlist in `data-loader.ts` is now derived from `tournaments.json` — adding a tournament to the registry implicitly allows its files. Web pages load tournament data dynamically based on slug routing.

(Note: the second sentence describes Stage 2 behavior that lands later — flag this in the commit so a reader of Stage 1 alone knows it's a forward reference.)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for multi-tournament scraper"
```

---

### Task 12: Verification & wrap-up

- [ ] **Step 1: Run all scraper tests one more time**

Run: `cd scraper && go test ./... -v`
Expected: All tests pass.

- [ ] **Step 2: Run `go vet`**

Run: `cd scraper && go vet ./...`
Expected: No errors.

- [ ] **Step 3: Confirm clean working tree**

Run: `git status`
Expected: Working tree clean (all changes committed).

- [ ] **Step 4: Summary**

Stage 1 is complete. Verify:
- `data/tournaments.json` exists with both tournaments registered.
- `data/tournament-415628-*.json` exist and look sane.
- `data/tournament-394299-*.json` are unchanged from before this stage.
- All scraper tests pass.
- The web app and MCP server are still hardcoded to 394299 — they'll be updated in Stages 2 and 3. The system is in a consistent intermediate state: data exists for both tournaments, but consumers only see 394299.

Proceed to Stage 2 (`2026-05-02-multi-tournament-stage2-mcp.md`) when ready.
