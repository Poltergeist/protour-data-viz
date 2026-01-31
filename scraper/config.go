package main

import (
	"fmt"
	"strconv"
	"strings"
)

// parseRounds parses round configuration string
// Supports: "4-8", "4,5,6", "4-8,12-16", "4-8,17,18"
func parseRounds(roundsStr string) ([]int, error) {
	if roundsStr == "" {
		// Default to rounds 4-8 (Day 1 Standard)
		return []int{4, 5, 6, 7, 8}, nil
	}

	var rounds []int
	seen := make(map[int]bool)

	// Split by comma
	segments := strings.Split(roundsStr, ",")

	for _, segment := range segments {
		segment = strings.TrimSpace(segment)

		// Check if it's a range (contains "-")
		if strings.Contains(segment, "-") {
			parts := strings.Split(segment, "-")
			if len(parts) != 2 {
				return nil, fmt.Errorf("invalid range format: %s", segment)
			}

			start, err := strconv.Atoi(strings.TrimSpace(parts[0]))
			if err != nil {
				return nil, fmt.Errorf("invalid start number in range %s: %w", segment, err)
			}

			end, err := strconv.Atoi(strings.TrimSpace(parts[1]))
			if err != nil {
				return nil, fmt.Errorf("invalid end number in range %s: %w", segment, err)
			}

			if start > end {
				return nil, fmt.Errorf("invalid range %s: start > end", segment)
			}

			// Add all rounds in range
			for i := start; i <= end; i++ {
				if !seen[i] {
					rounds = append(rounds, i)
					seen[i] = true
				}
			}
		} else {
			// Single round number
			num, err := strconv.Atoi(segment)
			if err != nil {
				return nil, fmt.Errorf("invalid round number %s: %w", segment, err)
			}

			if !seen[num] {
				rounds = append(rounds, num)
				seen[num] = true
			}
		}
	}

	return rounds, nil
}
