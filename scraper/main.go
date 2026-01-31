package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gocolly/colly/v2"
)

const (
	tournamentURL = "https://melee.gg/Tournament/View/394299"
	outputDir     = "../data"
)

func main() {
	log.Println("Starting ProTour data scraper...")

	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	// Initialize collector
	c := colly.NewCollector(
		colly.AllowedDomains("melee.gg"),
	)

	// Set realistic browser headers
	c.UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
	c.OnRequest(func(r *colly.Request) {
		r.Headers.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
		r.Headers.Set("Accept-Language", "en-US,en;q=0.9")
	})

	// TODO: Implement scraping logic
	c.OnHTML("body", func(e *colly.HTMLElement) {
		log.Println("Successfully connected to melee.gg")
		// Scraping logic will be implemented here
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Request failed: %v", err)
	})

	// Visit the tournament page
	if err := c.Visit(tournamentURL); err != nil {
		log.Fatalf("Failed to visit tournament page: %v", err)
	}

	log.Println("Scraping completed")
}

// saveJSON writes data to a JSON file in the output directory
func saveJSON(filename string, data interface{}) error {
	outputPath := filepath.Join(outputDir, filename)
	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	log.Printf("Saved data to %s", outputPath)
	return nil
}
