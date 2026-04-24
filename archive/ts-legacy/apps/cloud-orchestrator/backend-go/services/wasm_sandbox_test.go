package services

import (
	"sync"
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupSandboxTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestValidateWasmBinary(t *testing.T) {
	tests := []struct {
		name    string
		data    []byte
		wantErr bool
	}{
		{"valid header", []byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x00}, false},
		{"too small", []byte{0x00, 0x61}, true},
		{"bad magic", []byte{0x00, 0x62, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00}, true},
		{"bad version", []byte{0x00, 0x61, 0x73, 0x6d, 0x02, 0x00, 0x00, 0x00}, true},
		{"empty", []byte{}, true},
		{"nil", nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateWasmBinary(tt.data)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateWasmBinary() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestDefaultSandboxConfig(t *testing.T) {
	cfg := DefaultSandboxConfig()
	if cfg.MaxMemoryMB != 64 {
		t.Errorf("MaxMemoryMB = %d, want 64", cfg.MaxMemoryMB)
	}
	if cfg.MaxTimeoutSec != 30 {
		t.Errorf("MaxTimeoutSec = %d, want 30", cfg.MaxTimeoutSec)
	}
	if cfg.MaxCPUMs != 5000 {
		t.Errorf("MaxCPUMs = %d, want 5000", cfg.MaxCPUMs)
	}
	if cfg.AllowNetwork != false {
		t.Error("AllowNetwork should be false by default")
	}
}

func TestGetWasmSandbox(t *testing.T) {
	sandbox := GetWasmSandbox()
	if sandbox == nil {
		t.Fatal("Expected non-nil sandbox")
	}
	// Singleton
	sandbox2 := GetWasmSandbox()
	if sandbox != sandbox2 {
		t.Error("Expected singleton sandbox")
	}
}

func TestGetWasmSandboxCustomConfig(t *testing.T) {
	// Reset singleton for this test
	sandboxOnce = syncOnceReset()
	cfg := SandboxConfig{
		MaxMemoryMB:   128,
		MaxTimeoutSec: 60,
		MaxCPUMs:     10000,
		AllowNetwork:  true,
	}
	sandbox := GetWasmSandbox(cfg)
	if sandbox.config.MaxMemoryMB != 128 {
		t.Errorf("MaxMemoryMB = %d, want 128", sandbox.config.MaxMemoryMB)
	}
	// Reset for other tests
	sandboxOnce = syncOnceReset()
}

func TestGetSandboxStatus(t *testing.T) {
	sandboxOnce = syncOnceReset()
	status := GetSandboxStatus()
	if status == nil {
		t.Fatal("Expected non-nil status")
	}
	if status["initialized"] != true {
		t.Error("Expected initialized to be true")
	}
	if status["cgoRequired"] != false {
		t.Error("Expected cgoRequired to be false")
	}
	if status["runtimeType"] != "pure-go" {
		t.Error("Expected pure-go runtime type")
	}
	sandboxOnce = syncOnceReset()
}

func TestWarmupSandbox(t *testing.T) {
	sandboxOnce = syncOnceReset()
	WarmupSandbox() // Just verify no panic
	sandboxOnce = syncOnceReset()
}

func TestExecutePluginNotFound(t *testing.T) {
	setupSandboxTestDB(t)
	sandboxOnce = syncOnceReset()
	defer func() { sandboxOnce = syncOnceReset() }()

	result, err := ExecutePluginInSandbox("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent plugin")
	}
	if result.Success {
		t.Error("Expected success=false")
	}
}

func TestExecutePluginNotEnabled(t *testing.T) {
	setupSandboxTestDB(t)
	sandboxOnce = syncOnceReset()
	defer func() { sandboxOnce = syncOnceReset() }()

	plugin := models.Plugin{
		ID:          "sandbox-disabled-plugin",
		Name:        "disabled-test",
		Version:     "1.0.0",
		Status:      "disabled",
		SourceURL:   "https://example.com/test.wasm",
		InstalledAt: time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.DB.Create(&plugin)

	result, err := ExecutePluginInSandbox("sandbox-disabled-plugin")
	if err == nil {
		t.Error("Expected error for disabled plugin")
	}
	if result.Success {
		t.Error("Expected success=false for disabled plugin")
	}
}

func TestSandboxResultStruct(t *testing.T) {
	r := SandboxResult{
		PluginID:   "test",
		Success:    true,
		Output:     "hello",
		DurationMs: 42,
		ExitCode:   0,
	}
	if r.PluginID != "test" {
		t.Error("PluginID mismatch")
	}
	if !r.Success {
		t.Error("Success should be true")
	}
}

// Helper to reset the singleton for testing
func syncOnceReset() sync.Once {
	var once sync.Once
	sandboxOnce = once
	return once
}

// Wrapper for ExecutePlugin that matches the API
func ExecutePluginInSandbox(pluginID string) (*SandboxResult, error) {
	return GetWasmSandbox().ExecutePlugin(pluginID, nil)
}
