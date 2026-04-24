package services

import (
	"testing"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupAuditTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}
}

func TestAuditAction(t *testing.T) {
	setupAuditTestDB(t)

	entry := AuditAction("session_nudged", "daemon", "session", "sess-123", "success", "Nudged session after 10m inactivity",
		WithDetails(map[string]interface{}{"inactiveMinutes": 10}),
		WithProvider("openai"),
		WithModel("gpt-4o"),
		WithTokenUsage(150),
		WithDuration(250),
	)

	if entry.ID == "" {
		t.Error("Expected audit entry to have an ID")
	}
	if entry.Action != "session_nudged" {
		t.Errorf("Expected action 'session_nudged', got '%s'", entry.Action)
	}
	if entry.Actor != "daemon" {
		t.Errorf("Expected actor 'daemon', got '%s'", entry.Actor)
	}
	if entry.ResourceType != "session" {
		t.Errorf("Expected resource type 'session', got '%s'", entry.ResourceType)
	}
	if entry.ResourceID != "sess-123" {
		t.Errorf("Expected resource ID 'sess-123', got '%s'", entry.ResourceID)
	}
	if entry.Status != "success" {
		t.Errorf("Expected status 'success', got '%s'", entry.Status)
	}
	if entry.Provider == nil || *entry.Provider != "openai" {
		t.Error("Expected provider to be 'openai'")
	}
	if entry.TokenUsage == nil || *entry.TokenUsage != 150 {
		t.Error("Expected token usage to be 150")
	}
	if entry.DurationMs == nil || *entry.DurationMs != 250 {
		t.Error("Expected duration to be 250ms")
	}
}

func TestGetAuditEntries(t *testing.T) {
	setupAuditTestDB(t)

	AuditAction("session_nudged", "daemon", "session", "s1", "success", "Nudge 1")
	AuditAction("plan_approved", "daemon", "session", "s2", "success", "Approved")
	AuditAction("codebase_index_completed", "scheduler", "codebase", "default", "success", "Indexed 50 chunks")
	AuditAction("session_recovery_failed", "daemon", "session", "s3", "failure", "Recovery failed")

	// Get all
	entries, total, err := GetAuditEntries(AuditFilter{})
	if err != nil {
		t.Fatalf("Failed to get entries: %v", err)
	}
	if total != 4 {
		t.Errorf("Expected 4 total entries, got %d", total)
	}
	if len(entries) != 4 {
		t.Errorf("Expected 4 entries, got %d", len(entries))
	}

	// Filter by action
	_, filteredTotal, _ := GetAuditEntries(AuditFilter{Action: "session_nudged"})
	if filteredTotal != 1 {
		t.Errorf("Expected 1 filtered entry, got %d", filteredTotal)
	}

	// Filter by actor
	_, actorTotal, _ := GetAuditEntries(AuditFilter{Actor: "scheduler"})
	if actorTotal != 1 {
		t.Errorf("Expected 1 scheduler entry, got %d", actorTotal)
	}

	// Filter by status
	_, statusTotal, _ := GetAuditEntries(AuditFilter{Status: "failure"})
	if statusTotal != 1 {
		t.Errorf("Expected 1 failure entry, got %d", statusTotal)
	}

	// Filter by resource type
	_, resTotal, _ := GetAuditEntries(AuditFilter{ResourceType: "session"})
	if resTotal != 3 {
		t.Errorf("Expected 3 session entries, got %d", resTotal)
	}
}

func TestGetAuditStats(t *testing.T) {
	setupAuditTestDB(t)

	AuditAction("session_nudged", "daemon", "session", "s1", "success", "Nudge", WithTokenUsage(100))
	AuditAction("plan_approved", "daemon", "session", "s2", "success", "Approved", WithTokenUsage(200))
	AuditAction("index_completed", "scheduler", "codebase", "default", "success", "Indexed", WithTokenUsage(300))

	stats, err := GetAuditStats()
	if err != nil {
		t.Fatalf("Failed to get stats: %v", err)
	}

	total, ok := stats["total"].(int64)
	if !ok || total != 3 {
		t.Errorf("Expected total 3, got %v", stats["total"])
	}

	last24h, ok := stats["last24h"].(int64)
	if !ok || last24h != 3 {
		t.Errorf("Expected last24h 3, got %v", stats["last24h"])
	}
}

func TestAuditFilterPagination(t *testing.T) {
	setupAuditTestDB(t)

	for i := 0; i < 15; i++ {
		AuditAction("test_action", "daemon", "session", "s", "success", "test")
	}

	page1, total, _ := GetAuditEntries(AuditFilter{Limit: 5, Offset: 0})
	if total != 15 {
		t.Errorf("Expected total 15, got %d", total)
	}
	if len(page1) != 5 {
		t.Errorf("Expected 5 items on page 1, got %d", len(page1))
	}

	page3, _, _ := GetAuditEntries(AuditFilter{Limit: 5, Offset: 10})
	if len(page3) != 5 {
		t.Errorf("Expected 5 items on page 3, got %d", len(page3))
	}
}

func TestAuditEntryImmutability(t *testing.T) {
	setupAuditTestDB(t)

	entry := AuditAction("test_action", "daemon", "session", "s1", "success", "Test immutability")

	// Verify the entry was persisted
	var count int64
	db.DB.Model(&models.AuditEntry{}).Where("id = ?", entry.ID).Count(&count)
	if count != 1 {
		t.Errorf("Expected 1 audit entry, got %d", count)
	}

	// Verify the content is intact
	var found models.AuditEntry
	db.DB.First(&found, "id = ?", entry.ID)
	if found.Action != "test_action" {
		t.Errorf("Expected action to persist, got '%s'", found.Action)
	}
	if found.Summary != "Test immutability" {
		t.Errorf("Expected summary to persist, got '%s'", found.Summary)
	}
}
