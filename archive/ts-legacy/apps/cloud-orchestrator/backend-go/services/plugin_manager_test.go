package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupPluginTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestInstallPluginValidation(t *testing.T) {
	setupPluginTestDB(t)

	// Missing name
	_, err := InstallPluginFromURL(InstallPluginRequest{SourceURL: "http://example.com/plugin.json"})
	if err == nil {
		t.Error("Expected error for missing name")
	}

	// Missing source URL
	_, err = InstallPluginFromURL(InstallPluginRequest{Name: "test"})
	if err == nil {
		t.Error("Expected error for missing sourceUrl")
	}
}

func TestInstallPluginBadURL(t *testing.T) {
	setupPluginTestDB(t)

	_, err := InstallPluginFromURL(InstallPluginRequest{
		Name:      "bad-plugin",
		SourceURL: "http://localhost:99999/nonexistent",
	})
	if err == nil {
		t.Error("Expected error for bad URL")
	}
}

func TestGetPluginNotFound(t *testing.T) {
	setupPluginTestDB(t)

	_, err := GetPlugin("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent plugin")
	}
}

func TestListPlugins(t *testing.T) {
	setupPluginTestDB(t)

	plugins, err := ListPlugins("")
	if err != nil {
		t.Fatalf("ListPlugins error: %v", err)
	}
	if plugins == nil {
		t.Error("Expected non-nil slice")
	}
}

func TestListPluginsByStatus(t *testing.T) {
	setupPluginTestDB(t)

	plugins, err := ListPlugins("enabled")
	if err != nil {
		t.Fatalf("ListPlugins error: %v", err)
	}
	if len(plugins) != 0 {
		t.Errorf("Expected 0 enabled plugins, got %d", len(plugins))
	}
}

func TestEnablePluginNotFound(t *testing.T) {
	setupPluginTestDB(t)

	err := EnablePlugin("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent plugin")
	}
}

func TestDisablePluginNotFound(t *testing.T) {
	setupPluginTestDB(t)

	err := DisablePlugin("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent plugin")
	}
}

func TestUninstallPluginNotFound(t *testing.T) {
	setupPluginTestDB(t)

	err := UninstallPlugin("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent plugin")
	}
}

func TestUpdatePluginConfigNotFound(t *testing.T) {
	setupPluginTestDB(t)

	err := UpdatePluginConfig("nonexistent", "{}")
	if err == nil {
		t.Error("Expected error for nonexistent plugin")
	}
}

func TestGetPluginStats(t *testing.T) {
	setupPluginTestDB(t)

	stats := GetPluginStats()
	if stats == nil {
		t.Fatal("Expected non-nil stats")
	}
	if stats["total"].(int64) != 0 {
		t.Errorf("Expected 0 total, got %d", stats["total"])
	}
}

func TestPluginCRUD(t *testing.T) {
	setupPluginTestDB(t)

	// Create a plugin directly
	plugin := models.Plugin{
		ID:           "plugin-crud-test",
		Name:         "test-plugin",
		Version:      "1.0.0",
		Author:       "test-author",
		Description:  "A test plugin",
		SourceURL:    "https://example.com/plugin.json",
		Status:       "installed",
		Capabilities: `["read","write"]`,
		Config:       `{"debug": true}`,
		Size:         1024,
		InstalledAt:  time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := db.DB.Create(&plugin).Error; err != nil {
		t.Fatalf("Failed to create plugin: %v", err)
	}

	// Get
	found, err := GetPlugin("plugin-crud-test")
	if err != nil {
		t.Fatalf("GetPlugin error: %v", err)
	}
	if found.Name != "test-plugin" {
		t.Errorf("Name = %q, want 'test-plugin'", found.Name)
	}
	if found.Version != "1.0.0" {
		t.Errorf("Version = %q, want '1.0.0'", found.Version)
	}
	if found.Capabilities != `["read","write"]` {
		t.Errorf("Capabilities = %q", found.Capabilities)
	}

	// Enable
	if err := EnablePlugin("plugin-crud-test"); err != nil {
		t.Fatalf("EnablePlugin error: %v", err)
	}
	enabled, _ := GetPlugin("plugin-crud-test")
	if enabled.Status != "enabled" {
		t.Errorf("Status = %q, want 'enabled'", enabled.Status)
	}

	// Disable
	if err := DisablePlugin("plugin-crud-test"); err != nil {
		t.Fatalf("DisablePlugin error: %v", err)
	}
	disabled, _ := GetPlugin("plugin-crud-test")
	if disabled.Status != "disabled" {
		t.Errorf("Status = %q, want 'disabled'", disabled.Status)
	}

	// Update config
	if err := UpdatePluginConfig("plugin-crud-test", `{"debug": false}`); err != nil {
		t.Fatalf("UpdatePluginConfig error: %v", err)
	}
	updated, _ := GetPlugin("plugin-crud-test")
	if updated.Config != `{"debug": false}` {
		t.Errorf("Config = %q, want '{\"debug\": false}'", updated.Config)
	}

	// List with filter
	plugins, _ := ListPlugins("disabled")
	if len(plugins) != 1 {
		t.Errorf("Expected 1 disabled plugin, got %d", len(plugins))
	}

	// Stats
	stats := GetPluginStats()
	if stats["total"].(int64) != 1 {
		t.Errorf("Expected total 1, got %d", stats["total"])
	}

	// Uninstall
	if err := UninstallPlugin("plugin-crud-test"); err != nil {
		t.Fatalf("UninstallPlugin error: %v", err)
	}
	_, err = GetPlugin("plugin-crud-test")
	if err == nil {
		t.Error("Expected error after uninstall")
	}
}

func TestCoalesce(t *testing.T) {
	if coalesce("", "", "hello", "world") != "hello" {
		t.Error("Expected first non-empty value")
	}
	if coalesce("first", "second") != "first" {
		t.Error("Expected first value")
	}
	if coalesce("", "", "") != "" {
		t.Error("Expected empty string when all empty")
	}
}

func TestPluginStatusConstants(t *testing.T) {
	if PluginStatusInstalled != "installed" {
		t.Error("PluginStatusInstalled mismatch")
	}
	if PluginStatusEnabled != "enabled" {
		t.Error("PluginStatusEnabled mismatch")
	}
	if PluginStatusDisabled != "disabled" {
		t.Error("PluginStatusDisabled mismatch")
	}
	if PluginStatusError != "error" {
		t.Error("PluginStatusError mismatch")
	}
}
