package services

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// PluginStatus represents the lifecycle state of a plugin
type PluginStatus string

const (
	PluginStatusInstalled PluginStatus = "installed"
	PluginStatusEnabled   PluginStatus = "enabled"
	PluginStatusDisabled  PluginStatus = "disabled"
	PluginStatusError     PluginStatus = "error"
)

// InstallPluginRequest is the API request to install a plugin
type InstallPluginRequest struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Author      string `json:"author,omitempty"`
	Description string `json:"description,omitempty"`
	SourceURL   string `json:"sourceUrl"`
	Signature   string `json:"signature,omitempty"` // SHA256 of the plugin payload
	Config      string `json:"config,omitempty"`    // JSON config blob
}

// InstallPluginFromURL downloads and installs a plugin from a URL
func InstallPluginFromURL(req InstallPluginRequest) (*models.Plugin, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("plugin name is required")
	}
	if req.SourceURL == "" {
		return nil, fmt.Errorf("sourceUrl is required")
	}
	if req.Version == "" {
		req.Version = "0.0.1"
	}

	// Check for duplicate
	var existing models.Plugin
	if db.DB.Where("name = ? AND version = ?", req.Name, req.Version).First(&existing).Error == nil {
		return nil, fmt.Errorf("plugin %s v%s already installed", req.Name, req.Version)
	}

	// Fetch the plugin manifest from URL
	resp, err := http.Get(req.SourceURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch plugin from %s: %w", req.SourceURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("plugin source returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024)) // 10MB limit
	if err != nil {
		return nil, fmt.Errorf("failed to read plugin body: %w", err)
	}

	// Verify signature if provided
	hash := fmt.Sprintf("%x", sha256.Sum256(body))
	if req.Signature != "" && !strings.EqualFold(hash, req.Signature) {
		return nil, fmt.Errorf("signature mismatch: expected %s, got %s", req.Signature, hash)
	}

	// Parse manifest from the body (expect JSON manifest)
	var manifest struct {
		Name        string                 `json:"name"`
		Version     string                 `json:"version"`
		Author      string                 `json:"author"`
		Description string                 `json:"description"`
		Capabilities []string              `json:"capabilities"`
		Config      map[string]interface{} `json:"config"`
	}
	if err := json.Unmarshal(body, &manifest); err != nil {
		// If not JSON, use the raw body as the plugin payload
		manifest.Name = req.Name
		manifest.Version = req.Version
		manifest.Description = req.Description
	}

	capabilities := "[]"
	if len(manifest.Capabilities) > 0 {
		capJSON, _ := json.Marshal(manifest.Capabilities)
		capabilities = string(capJSON)
	}

	plugin := &models.Plugin{
		ID:           uuid.New().String(),
		Name:         coalesce(manifest.Name, req.Name),
		Version:      coalesce(manifest.Version, req.Version),
		Author:       coalesce(manifest.Author, req.Author),
		Description:  coalesce(manifest.Description, req.Description),
		SourceURL:    req.SourceURL,
		Signature:    hash,
		Status:       string(PluginStatusInstalled),
		Capabilities: capabilities,
		Config:       req.Config,
		Size:         len(body),
		InstalledAt:  time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := db.DB.Create(plugin).Error; err != nil {
		return nil, fmt.Errorf("failed to persist plugin: %w", err)
	}

	AuditAction("plugin_installed", "plugin_manager", "plugin", plugin.ID, "success",
		fmt.Sprintf("Installed plugin %s v%s", plugin.Name, plugin.Version))

	CreateNotification("success", "system",
		fmt.Sprintf("Plugin Installed: %s", plugin.Name),
		fmt.Sprintf("Version %s from %s", plugin.Version, req.SourceURL),
		WithPriority(3))

	return plugin, nil
}

// GetPlugin retrieves a plugin by ID
func GetPlugin(id string) (*models.Plugin, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}
	var plugin models.Plugin
	if err := db.DB.Where("id = ?", id).First(&plugin).Error; err != nil {
		return nil, err
	}
	return &plugin, nil
}

// ListPlugins returns all installed plugins
func ListPlugins(status string) ([]models.Plugin, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}
	var plugins []models.Plugin
	query := db.DB.Order("installed_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	return plugins, query.Find(&plugins).Error
}

// EnablePlugin activates a plugin
func EnablePlugin(id string) error {
	if db.DB == nil {
		return fmt.Errorf("database not available")
	}
	result := db.DB.Model(&models.Plugin{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": string(PluginStatusEnabled), "updated_at": time.Now()})
	if result.RowsAffected == 0 {
		return fmt.Errorf("plugin %s not found", id)
	}
	AuditAction("plugin_enabled", "plugin_manager", "plugin", id, "success", "Plugin enabled")
	return nil
}

// DisablePlugin deactivates a plugin
func DisablePlugin(id string) error {
	if db.DB == nil {
		return fmt.Errorf("database not available")
	}
	result := db.DB.Model(&models.Plugin{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": string(PluginStatusDisabled), "updated_at": time.Now()})
	if result.RowsAffected == 0 {
		return fmt.Errorf("plugin %s not found", id)
	}
	AuditAction("plugin_disabled", "plugin_manager", "plugin", id, "success", "Plugin disabled")
	return nil
}

// UninstallPlugin removes a plugin
func UninstallPlugin(id string) error {
	if db.DB == nil {
		return fmt.Errorf("database not available")
	}
	var plugin models.Plugin
	if err := db.DB.Where("id = ?", id).First(&plugin).Error; err != nil {
		return fmt.Errorf("plugin not found: %w", err)
	}
	if err := db.DB.Delete(&plugin).Error; err != nil {
		return err
	}
	AuditAction("plugin_uninstalled", "plugin_manager", "plugin", id, "success",
		fmt.Sprintf("Uninstalled plugin %s v%s", plugin.Name, plugin.Version))
	return nil
}

// UpdatePluginConfig updates a plugin's configuration
func UpdatePluginConfig(id string, config string) error {
	if db.DB == nil {
		return fmt.Errorf("database not available")
	}
	result := db.DB.Model(&models.Plugin{}).Where("id = ?", id).
		Updates(map[string]interface{}{"config": config, "updated_at": time.Now()})
	if result.RowsAffected == 0 {
		return fmt.Errorf("plugin %s not found", id)
	}
	return nil
}

// GetPluginStats returns aggregate plugin statistics
func GetPluginStats() map[string]interface{} {
	if db.DB == nil {
		return map[string]interface{}{"total": 0}
	}
	var total, enabled, installed, disabled, errored int64
	db.DB.Model(&models.Plugin{}).Count(&total)
	db.DB.Model(&models.Plugin{}).Where("status = ?", PluginStatusEnabled).Count(&enabled)
	db.DB.Model(&models.Plugin{}).Where("status = ?", PluginStatusInstalled).Count(&installed)
	db.DB.Model(&models.Plugin{}).Where("status = ?", PluginStatusDisabled).Count(&disabled)
	db.DB.Model(&models.Plugin{}).Where("status = ?", PluginStatusError).Count(&errored)

	return map[string]interface{}{
		"total":     total,
		"enabled":   enabled,
		"installed": installed,
		"disabled":  disabled,
		"error":     errored,
	}
}

func coalesce(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
