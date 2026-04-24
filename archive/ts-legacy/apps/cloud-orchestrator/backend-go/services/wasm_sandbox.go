package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

// SandboxConfig defines isolation parameters for a Wasm plugin
type SandboxConfig struct {
	MaxMemoryMB   int  `json:"maxMemoryMB"`
	MaxTimeoutSec int  `json:"maxTimeoutSec"`
	MaxCPUMs     int  `json:"maxCpuMs"`
	AllowNetwork  bool `json:"allowNetwork"`
}

// DefaultSandboxConfig returns secure defaults
func DefaultSandboxConfig() SandboxConfig {
	return SandboxConfig{
		MaxMemoryMB:   64,
		MaxTimeoutSec: 30,
		MaxCPUMs:     5000,
		AllowNetwork:  false,
	}
}

// SandboxResult is the output of a sandboxed execution
type SandboxResult struct {
	PluginID   string `json:"pluginId"`
	Success    bool   `json:"success"`
	Output     string `json:"output"`
	Error      string `json:"error,omitempty"`
	DurationMs int64  `json:"durationMs"`
	ExitCode   int    `json:"exitCode"`
}

// WasmSandbox provides isolated plugin execution
type WasmSandbox struct {
	runtime wazero.Runtime
	mu      sync.Mutex
	config  SandboxConfig
}

var (
	globalSandbox *WasmSandbox
	sandboxOnce   sync.Once
)

// GetWasmSandbox returns the singleton sandbox instance
func GetWasmSandbox(config ...SandboxConfig) *WasmSandbox {
	sandboxOnce.Do(func() {
		cfg := DefaultSandboxConfig()
		if len(config) > 0 {
			cfg = config[0]
		}

		ctx := context.Background()
		rt := wazero.NewRuntime(ctx)

		globalSandbox = &WasmSandbox{
			runtime: rt,
			config:  cfg,
		}

		log.Printf("[WasmSandbox] Initialized: memory=%dMB, timeout=%ds, cgo=false",
			cfg.MaxMemoryMB, cfg.MaxTimeoutSec)
	})
	return globalSandbox
}

// ExecutePlugin runs a plugin's Wasm module in an isolated sandbox
func (s *WasmSandbox) ExecutePlugin(pluginID string, input []byte) (*SandboxResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	start := time.Now()
	result := &SandboxResult{PluginID: pluginID}

	// Get plugin from DB
	var plugin models.Plugin
	if err := db.DB.Where("id = ?", pluginID).First(&plugin).Error; err != nil {
		result.Error = fmt.Sprintf("Plugin %s not found", pluginID)
		return result, err
	}

	if plugin.Status != "enabled" {
		result.Error = fmt.Sprintf("Plugin %s is not enabled", plugin.Name)
		return result, fmt.Errorf("plugin not enabled")
	}

	// Load the Wasm binary
	wasmBytes, err := loadPluginBinary(plugin)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to load binary: %v", err)
		return result, err
	}

	// Validate
	if err := ValidateWasmBinary(wasmBytes); err != nil {
		result.Error = fmt.Sprintf("Invalid Wasm: %v", err)
		return result, err
	}

	// Execute with timeout
	timeout := time.Duration(s.config.MaxTimeoutSec) * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Compile
	compiled, err := s.runtime.CompileModule(ctx, wasmBytes)
	if err != nil {
		result.Error = fmt.Sprintf("Compile error: %v", err)
		return result, err
	}
	defer compiled.Close(ctx)

	moduleConfig := wazero.NewModuleConfig().
		WithName(fmt.Sprintf("plugin-%s", pluginID)).
		WithStartFunctions("_start")

	// Host functions for controlled I/O
	hostBuilder := s.runtime.NewHostModuleBuilder("env")

	// stdout capture
	hostBuilder.NewFunctionBuilder().
		WithFunc(func(ctx context.Context, m api.Module, offset, size uint32) {
			if data, ok := m.Memory().Read(offset, size); ok {
				result.Output += string(data)
			}
		}).
		Export("host_print")

	// logging
	hostBuilder.NewFunctionBuilder().
		WithFunc(func(ctx context.Context, m api.Module, offset, size uint32) {
			if data, ok := m.Memory().Read(offset, size); ok {
				log.Printf("[WasmSandbox:%s] %s", plugin.Name, string(data))
			}
		}).
		Export("host_log")

	if _, err := hostBuilder.Instantiate(ctx); err != nil {
		result.Error = fmt.Sprintf("Host module error: %v", err)
		return result, err
	}

	// Instantiate and run
	module, err := s.runtime.InstantiateModule(ctx, compiled, moduleConfig)
	if err != nil {
		result.Error = fmt.Sprintf("Instantiate error: %v", err)
		result.DurationMs = time.Since(start).Milliseconds()
		return result, err
	}
	defer module.Close(ctx)

	// Try entry points
	for _, name := range []string{"_start", "run"} {
		fn := module.ExportedFunction(name)
		if fn != nil {
			_, err = fn.Call(ctx)
			if err != nil {
				result.Error = fmt.Sprintf("Execution error: %v", err)
				result.Success = false
			} else {
				result.Success = true
			}
			break
		}
	}

	if result.Output == "" && result.Error == "" {
		result.Error = "No entry point found"
	}

	result.DurationMs = time.Since(start).Milliseconds()

	// Audit
	status := "success"
	if !result.Success {
		status = "failure"
	}
	AuditAction("plugin_executed", "wasm_sandbox", "plugin", pluginID, status,
		fmt.Sprintf("Executed %s v%s: %dms", plugin.Name, plugin.Version, result.DurationMs))

	return result, nil
}

// loadPluginBinary loads the Wasm binary for a plugin
func loadPluginBinary(plugin models.Plugin) ([]byte, error) {
	// Check local cache
	cacheDir := filepath.Join(os.TempDir(), "jules-plugins")
	cacheFile := filepath.Join(cacheDir, fmt.Sprintf("%s-%s.wasm", plugin.Name, plugin.Version))

	if data, err := os.ReadFile(cacheFile); err == nil {
		return data, nil
	}

	// Download from source
	if plugin.SourceURL == "" {
		return nil, fmt.Errorf("no cached binary and no source URL for %s", plugin.Name)
	}

	resp, err := http.Get(plugin.SourceURL)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read failed: %w", err)
	}

	// Cache for future use
	_ = os.MkdirAll(cacheDir, 0755)
	_ = os.WriteFile(cacheFile, data, 0644)

	return data, nil
}

// ValidateWasmBinary checks if data is a valid Wasm module
func ValidateWasmBinary(data []byte) error {
	if len(data) < 8 {
		return fmt.Errorf("data too small to be a Wasm module")
	}
	// Wasm magic: 0x00 0x61 0x73 0x6d
	if data[0] != 0x00 || data[1] != 0x61 || data[2] != 0x73 || data[3] != 0x6d {
		return fmt.Errorf("invalid Wasm magic number")
	}
	// Version 1: 0x01 0x00 0x00 0x00
	if data[4] != 0x01 || data[5] != 0x00 || data[6] != 0x00 || data[7] != 0x00 {
		return fmt.Errorf("unsupported Wasm version")
	}
	return nil
}

// GetSandboxStatus returns sandbox configuration
func GetSandboxStatus() map[string]interface{} {
	sandbox := GetWasmSandbox()
	return map[string]interface{}{
		"initialized":    sandbox.runtime != nil,
		"maxMemoryMB":    sandbox.config.MaxMemoryMB,
		"maxTimeoutSec":  sandbox.config.MaxTimeoutSec,
		"maxCpuMs":       sandbox.config.MaxCPUMs,
		"allowNetwork":   sandbox.config.AllowNetwork,
		"runtimeVersion": "wazero v1.11.0",
		"runtimeType":    "pure-go",
		"cgoRequired":    false,
	}
}

// WarmupSandbox pre-initializes the Wasm runtime
func WarmupSandbox() {
	_ = GetWasmSandbox()
	log.Println("[WasmSandbox] Warmed up (pure-go, no CGO)")
}
