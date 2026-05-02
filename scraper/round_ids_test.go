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
	// Real melee.gg HTML may have data-id before or after class.
	// Buttons without round-selector class must be ignored.
	html := `
		<button data-id="111" class="round-selector">Round 1</button>
		<button class="other-class" data-id="999">Round 99</button>
		<button class="round-selector special" data-id="222">Round 2</button>
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
	if _, ok := ids[99]; ok {
		t.Errorf("non-round-selector button should not appear: %v", ids)
	}
}
