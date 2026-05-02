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
