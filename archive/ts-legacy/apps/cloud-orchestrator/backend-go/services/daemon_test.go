package services

import (
	"encoding/json"
	"testing"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupDaemonTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestGetDaemon(t *testing.T) {
	d := GetDaemon()
	if d == nil {
		t.Fatal("Expected non-nil daemon")
	}
	// Singleton
	d2 := GetDaemon()
	if d != d2 {
		t.Error("Expected singleton daemon")
	}
}

func TestDaemonNotRunningInitially(t *testing.T) {
	d := GetDaemon()
	if d.IsRunning() {
		t.Error("Expected daemon to not be running initially (may be running from another test)")
	}
}

func TestDaemonTickNoAPIKey(t *testing.T) {
	setupDaemonTestDB(t)

	// Create settings with no API key
	settings := models.KeeperSettings{
		ID:                  "default",
		IsEnabled:           true,
		CheckIntervalSeconds: 30,
	}
	db.DB.Save(&settings)

	d := GetDaemon()
	interval := d.tick()

	if interval != 30*1e9 { // 30 seconds in nanoseconds
		t.Errorf("Expected 30s interval, got %v", interval)
	}
}

func TestDaemonTickDisabled(t *testing.T) {
	setupDaemonTestDB(t)

	settings := models.KeeperSettings{
		ID:                  "default",
		IsEnabled:           false,
		CheckIntervalSeconds: 60,
	}
	db.DB.Save(&settings)

	d := GetDaemon()
	interval := d.tick()

	if interval != 60*1e9 {
		t.Errorf("Expected 60s interval, got %v", interval)
	}
}

func TestDaemonTickNoSettings(t *testing.T) {
	setupDaemonTestDB(t)

	// Don't create any settings - should default to 30s
	d := GetDaemon()
	interval := d.tick()

	if interval != 30*1e9 {
		t.Errorf("Expected default 30s interval, got %v", interval)
	}
}

func TestDaemonTickZeroInterval(t *testing.T) {
	setupDaemonTestDB(t)

	settings := models.KeeperSettings{
		ID:                  "default",
		IsEnabled:           false,
		CheckIntervalSeconds: 0,
	}
	db.DB.Save(&settings)

	d := GetDaemon()
	interval := d.tick()

	// Zero interval should default to 30s
	if interval != 30*1e9 {
		t.Errorf("Expected default 30s for zero interval, got %v", interval)
	}
}

func TestDaemonTickNegativeInterval(t *testing.T) {
	setupDaemonTestDB(t)

	settings := models.KeeperSettings{
		ID:                  "default",
		IsEnabled:           false,
		CheckIntervalSeconds: -5,
	}
	db.DB.Save(&settings)

	d := GetDaemon()
	interval := d.tick()

	if interval != 30*1e9 {
		t.Errorf("Expected default 30s for negative interval, got %v", interval)
	}
}

func TestKeeperLogCreation(t *testing.T) {
	setupDaemonTestDB(t)

	// Test that addKeeperLog properly creates entries
	addKeeperLog("test message", "info", "test-session", nil)

	var log models.KeeperLog
	if err := db.DB.Where("session_id = ?", "test-session").First(&log).Error; err != nil {
		t.Fatalf("Expected to find keeper log: %v", err)
	}

	if log.Message != "test message" {
		t.Errorf("Expected message 'test message', got '%s'", log.Message)
	}
	if log.SessionID != "test-session" {
		t.Errorf("Expected session_id 'test-session', got '%s'", log.SessionID)
	}
	if log.ID == "" {
		t.Error("Expected non-empty ID")
	}
}

func TestKeeperLogMetadata(t *testing.T) {
	setupDaemonTestDB(t)

	details := map[string]interface{}{
		"key1": "value1",
		"key2": float64(42),
	}
	addKeeperLog("metadata test", "action", "meta-session", details)

	var log models.KeeperLog
	db.DB.Where("session_id = ?", "meta-session").First(&log)

	if log.Metadata == nil {
		t.Fatal("Expected non-nil metadata")
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(*log.Metadata), &parsed); err != nil {
		t.Fatalf("Failed to parse metadata JSON: %v", err)
	}
	if parsed["key1"] != "value1" {
		t.Errorf("Expected key1='value1', got '%v'", parsed["key1"])
	}
}
