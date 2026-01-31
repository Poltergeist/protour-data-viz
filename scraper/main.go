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
	tournamentURL = "https://melee.gg/Tournament/View/394299"
	tournamentID  = "394299"
	outputDir     = "../data"
)

func main() {
	// Parse command-line flags
	roundsFlag := flag.String("rounds", "4-8", "Rounds to scrape (e.g., '4-8', '4,5,6', '4-8,12-16')")
	flag.Parse()

	log.Println("Starting ProTour data scraper...")
	log.Printf("Tournament: %s", tournamentURL)

	// Parse rounds configuration
	rounds, err := parseRounds(*roundsFlag)
	if err != nil {
		log.Fatalf("Invalid rounds configuration: %v", err)
	}
	log.Printf("Scraping rounds: %v", rounds)

	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	// Fetch match data for each round
	allMatches := make(map[int][]Match)
	for _, roundNum := range rounds {
		log.Printf("Fetching Round %d...", roundNum)

		matches, err := fetchRoundMatches(roundNum)
		if err != nil {
			log.Printf("Warning: Failed to fetch Round %d: %v", roundNum, err)
			continue
		}

		log.Printf("  Found %d matches in Round %d", matches.RecordsTotal, roundNum)
		allMatches[roundNum] = matches.Data

		// Be polite - add delay between requests
		time.Sleep(1 * time.Second)
	}

	// Save raw match data
	if err := saveMatchData(allMatches); err != nil {
		log.Fatalf("Failed to save match data: %v", err)
	}

	log.Println("Scraping completed successfully!")
	log.Printf("Data saved to: %s", outputDir)
}

// saveMatchData saves match data to JSON file
func saveMatchData(matches map[int][]Match) error {
	filename := fmt.Sprintf("tournament-%s-matches.json", tournamentID)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(matches); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	log.Printf("Saved match data to %s", outputPath)
	return nil
}

