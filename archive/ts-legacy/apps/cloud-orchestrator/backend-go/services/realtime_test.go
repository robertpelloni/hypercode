package services

import (
	"encoding/json"
	"testing"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupRealtimeTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestSetBroadcaster(t *testing.T) {
	var received interface{}
	SetBroadcaster(func(msg interface{}) {
		received = msg
	})

	emitRealtime(map[string]interface{}{"test": "hello"})
	if received == nil {
		t.Error("Expected broadcast to be called")
	}

	// Reset
	SetBroadcaster(nil)
}

func TestEmitDaemonEvent(t *testing.T) {
	var received interface{}
	SetBroadcaster(func(msg interface{}) {
		received = msg
	})

	emitDaemonEvent("test_event", map[string]interface{}{"key": "value"})

	if received == nil {
		t.Fatal("Expected broadcast to be called")
	}
	msg, ok := received.(map[string]interface{})
	if !ok {
		t.Fatal("Expected map[string]interface{}")
	}
	if msg["type"] != "test_event" {
		t.Errorf("Expected type 'test_event', got '%v'", msg["type"])
	}
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected data to be map")
	}
	if data["key"] != "value" {
		t.Errorf("Expected data.key='value', got '%v'", data["key"])
	}

	SetBroadcaster(nil)
}

func TestEmitRealtimeNilBroadcaster(t *testing.T) {
	// Should not panic
	SetBroadcaster(nil)
	emitRealtime(map[string]interface{}{"test": "hello"})
}

func TestAddKeeperLog(t *testing.T) {
	setupRealtimeTestDB(t)

	var broadcasted interface{}
	SetBroadcaster(func(msg interface{}) {
		broadcasted = msg
	})

	addKeeperLog("Test log message", "info", "session-123", map[string]interface{}{
		"event": "test_event",
	})

	// Verify log was created in DB
	var count int64
	db.DB.Model(&models.KeeperLog{}).Where("session_id = ?", "session-123").Count(&count)
	if count == 0 {
		t.Error("Expected keeper log to be created in database")
	}

	// Verify broadcast was sent
	if broadcasted == nil {
		t.Error("Expected broadcast for log_added event")
	}

	SetBroadcaster(nil)
}

func TestAddKeeperLogWithMetadata(t *testing.T) {
	setupRealtimeTestDB(t)

	details := map[string]interface{}{
		"event":    "session_spawned",
		"sourceId": "repo-1",
		"risk":     42,
	}
	addKeeperLog("Session spawned", "action", "session-456", details)

	var log models.KeeperLog
	if err := db.DB.Where("session_id = ?", "session-456").First(&log).Error; err != nil {
		t.Fatalf("Expected to find log: %v", err)
	}

	if log.Message != "Session spawned" {
		t.Errorf("Expected message 'Session spawned', got '%s'", log.Message)
	}
	if log.Type != "action" {
		t.Errorf("Expected type 'action', got '%s'", log.Type)
	}
	if log.Metadata != nil {
		var meta map[string]interface{}
		if err := json.Unmarshal([]byte(*log.Metadata), &meta); err != nil {
			t.Fatalf("Failed to parse metadata: %v", err)
		}
		if meta["event"] != "session_spawned" {
			t.Errorf("Expected event 'session_spawned', got '%v'", meta["event"])
		}
	}
}

func TestAddKeeperLogNilDetails(t *testing.T) {
	setupRealtimeTestDB(t)

	addKeeperLog("Simple log", "info", "global", nil)

	var log models.KeeperLog
	if err := db.DB.Where("session_id = ? AND message = ?", "global", "Simple log").First(&log).Error; err != nil {
		t.Fatalf("Expected to find log: %v", err)
	}
	if log.Metadata != nil {
		t.Error("Expected nil metadata for nil details")
	}
}

func TestAddKeeperLogErrorType(t *testing.T) {
	setupRealtimeTestDB(t)

	addKeeperLog("Something failed", "error", "global", map[string]interface{}{
		"event": "daemon_session_poll_failed",
	})

	var log models.KeeperLog
	if err := db.DB.Where("type = ?", "error").First(&log).Error; err != nil {
		t.Fatalf("Expected to find error log: %v", err)
	}
}

func TestAuditActionIndexing(t *testing.T) {
	setupRealtimeTestDB(t)

	auditAction("codebase_indexed", "info", "global", "Indexing complete", map[string]interface{}{
		"event": "codebase_indexed",
	})

	var entry models.AuditEntry
	if err := db.DB.Where("action = ?", "codebase_indexed").First(&entry).Error; err != nil {
		t.Fatalf("Expected to find audit entry: %v", err)
	}
	if entry.ResourceType != "codebase" {
		t.Errorf("Expected resource type 'codebase', got '%s'", entry.ResourceType)
	}
	if entry.Status != "success" {
		t.Errorf("Expected status 'success', got '%s'", entry.Status)
	}
}

func TestAuditActionError(t *testing.T) {
	setupRealtimeTestDB(t)

	auditAction("session_poll_failed", "error", "session-789", "Poll failed", map[string]interface{}{
		"event": "session_poll_failed",
	})

	var entry models.AuditEntry
	if err := db.DB.Where("action = ?", "session_poll_failed").First(&entry).Error; err != nil {
		t.Fatalf("Expected to find audit entry: %v", err)
	}
	if entry.Status != "failure" {
		t.Errorf("Expected status 'failure', got '%s'", entry.Status)
	}
}

func TestAuditActionCircuitBreaker(t *testing.T) {
	setupRealtimeTestDB(t)

	auditAction("circuit_breaker_opened", "error", "global", "CB tripped", map[string]interface{}{
		"event":    "circuit_breaker_opened",
		"provider": "anthropic",
	})

	var entry models.AuditEntry
	if err := db.DB.Where("action = ?", "circuit_breaker_opened").First(&entry).Error; err != nil {
		t.Fatalf("Expected to find audit entry: %v", err)
	}
	if entry.ResourceType != "provider" {
		t.Errorf("Expected resource type 'provider', got '%s'", entry.ResourceType)
	}
	if entry.ResourceID != "anthropic" {
		t.Errorf("Expected resource ID 'anthropic', got '%s'", entry.ResourceID)
	}
	if entry.Actor != "circuit_breaker" {
		t.Errorf("Expected actor 'circuit_breaker', got '%s'", entry.Actor)
	}
}

func TestAuditActionSkipped(t *testing.T) {
	setupRealtimeTestDB(t)

	auditAction("recovery_skipped", "info", "session-abc", "Already recovered", map[string]interface{}{
		"event": "recovery_skipped",
	})

	var entry models.AuditEntry
	if err := db.DB.Where("action = ?", "recovery_skipped").First(&entry).Error; err != nil {
		t.Fatalf("Expected to find audit entry: %v", err)
	}
	if entry.Status != "skipped" {
		t.Errorf("Expected status 'skipped', got '%s'", entry.Status)
	}
}
