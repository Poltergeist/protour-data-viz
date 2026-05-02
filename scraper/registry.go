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
