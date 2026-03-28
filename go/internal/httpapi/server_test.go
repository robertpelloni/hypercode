package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/borghq/borg-go/internal/config"
	"github.com/borghq/borg-go/internal/controlplane"
	"github.com/borghq/borg-go/internal/lockfile"
	"github.com/borghq/borg-go/internal/memorystore"
)

type stubDetector struct {
	tools []controlplane.Tool
	err   error
}

func (s stubDetector) DetectAll(context.Context) ([]controlplane.Tool, error) {
	return s.tools, s.err
}

func TestHealthEndpoint(t *testing.T) {
	server := New(config.Default(), stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/health/server", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
}

func TestAPIIndexEndpoint(t *testing.T) {
	server := New(config.Default(), stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/index", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"/api/runtime/status\"") {
		t.Fatalf("expected runtime status route in payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"category\":\"imports\"") {
		t.Fatalf("expected categorized routes in payload, got %s", recorder.Body.String())
	}
}

func TestConfigStatusEndpoint(t *testing.T) {
	workspaceRoot := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.ConfigDir = filepath.Join(workspaceRoot, ".borg-go")
	cfg.MainConfigDir = filepath.Join(workspaceRoot, ".borg")
	if err := os.MkdirAll(cfg.ConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create config dir: %v", err)
	}
	if err := os.MkdirAll(cfg.MainConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create main config dir: %v", err)
	}

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/config/status", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"workspaceRoot\"") {
		t.Fatalf("expected workspace root in payload, got %s", recorder.Body.String())
	}
}

func TestProviderStatusEndpoint(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", "openai")

	server := New(config.Default(), stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/providers/status", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"openai\"") {
		t.Fatalf("expected openai in payload, got %s", recorder.Body.String())
	}
}

func TestProviderCatalogEndpoint(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", "openai")

	server := New(config.Default(), stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/providers/catalog", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"defaultModel\":\"gpt-4o\"") {
		t.Fatalf("expected OpenAI default model in payload, got %s", recorder.Body.String())
	}
}

func TestProviderSummaryEndpoint(t *testing.T) {
	t.Setenv("GOOGLE_API_KEY", "")
	t.Setenv("GEMINI_API_KEY", "")
	t.Setenv("OPENROUTER_API_KEY", "")
	t.Setenv("DEEPSEEK_API_KEY", "")
	t.Setenv("XAI_API_KEY", "")
	t.Setenv("COPILOT_PAT", "")
	t.Setenv("GITHUB_TOKEN", "")
	t.Setenv("GOOGLE_OAUTH_ACCESS_TOKEN", "")
	t.Setenv("OPENAI_API_KEY", "openai")
	t.Setenv("ANTHROPIC_API_KEY", "anthropic")

	server := New(config.Default(), stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/providers/summary", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"configuredCount\":2") {
		t.Fatalf("expected configured provider count in payload, got %s", recorder.Body.String())
	}
}

func TestRoutingSummaryEndpoint(t *testing.T) {
	t.Setenv("GOOGLE_API_KEY", "google")
	t.Setenv("ANTHROPIC_API_KEY", "anthropic")

	server := New(config.Default(), stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/providers/routing-summary", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"coding\"") {
		t.Fatalf("expected coding task summary in payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"best\"") {
		t.Fatalf("expected strategy data in payload, got %s", recorder.Body.String())
	}
}

func TestSessionsEndpointReturnsDiscoveredSessions(t *testing.T) {
	tempDir := t.TempDir()
	homeDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	targetPath := filepath.Join(tempDir, ".claude", "session-1.jsonl")
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		t.Fatalf("failed to create claude dir: %v", err)
	}
	if err := os.WriteFile(targetPath, []byte("{\"model\":\"claude-sonnet\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to write session file: %v", err)
	}

	t.Setenv("HOME", homeDir)
	t.Setenv("USERPROFILE", homeDir)

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/sessions", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"status\":\"discovered\"") {
		t.Fatalf("expected discovered session payload, got %s", recorder.Body.String())
	}
}

func TestSessionSummaryEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	homeDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	targetPath := filepath.Join(tempDir, ".claude", "session-1.jsonl")
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		t.Fatalf("failed to create claude dir: %v", err)
	}
	if err := os.WriteFile(targetPath, []byte("{\"model\":\"claude-sonnet\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to write session file: %v", err)
	}

	t.Setenv("HOME", homeDir)
	t.Setenv("USERPROFILE", homeDir)

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/sessions/summary", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"byCliType\"") {
		t.Fatalf("expected session summary buckets, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"claude-code\"") {
		t.Fatalf("expected claude-code in summary payload, got %s", recorder.Body.String())
	}
}

func TestSupervisorSessionBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/session.list":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"id": "sess_bridge_1", "status": "running"},
						},
					},
				},
			})
		case "/trpc/session.stop":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read upstream request body: %v", err)
			}
			if !strings.Contains(string(body), `"id":"sess_bridge_1"`) {
				t.Fatalf("expected session id in upstream request body, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"id":     "sess_bridge_1",
							"status": "stopped",
						},
					},
				},
			})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	server := New(config.Default(), stubDetector{})

	listRequest := httptest.NewRequest(http.MethodGet, "/api/sessions/supervisor/list", nil)
	listRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(listRecorder, listRequest)
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from list bridge, got %d", listRecorder.Code)
	}
	if !strings.Contains(listRecorder.Body.String(), "\"sess_bridge_1\"") {
		t.Fatalf("expected bridged session list payload, got %s", listRecorder.Body.String())
	}

	stopRequest := httptest.NewRequest(http.MethodPost, "/api/sessions/supervisor/stop", strings.NewReader(`{"id":"sess_bridge_1","force":true}`))
	stopRequest.Header.Set("content-type", "application/json")
	stopRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(stopRecorder, stopRequest)
	if stopRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from stop bridge, got %d", stopRecorder.Code)
	}
	if !strings.Contains(stopRecorder.Body.String(), "\"procedure\":\"session.stop\"") {
		t.Fatalf("expected bridge metadata in stop payload, got %s", stopRecorder.Body.String())
	}
}

func TestCLIToolsEndpoint(t *testing.T) {
	server := New(config.Default(), stubDetector{
		tools: []controlplane.Tool{
			{Type: "go", Name: "Go", Command: "go", Available: true},
		},
	})
	request := httptest.NewRequest(http.MethodGet, "/api/cli/tools", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	body := recorder.Body.String()
	if body == "" || body[0] != '{' {
		t.Fatalf("expected JSON object body, got %q", body)
	}
}

func TestCLIHarnessesEndpoint(t *testing.T) {
	workspaceRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(workspaceRoot, "submodules", "hypercode"), 0o755); err != nil {
		t.Fatalf("failed to create hypercode submodule path: %v", err)
	}
	toolsDir := filepath.Join(workspaceRoot, "submodules", "hypercode", "tools")
	if err := os.MkdirAll(toolsDir, 0o755); err != nil {
		t.Fatalf("failed to create hypercode tools path: %v", err)
	}
	if err := os.WriteFile(filepath.Join(toolsDir, "registry.go"), []byte(`
package tools

func demo() {
	_ = Tool{Name: "run_shell_command"}
	_ = Tool{Name: "read_file"}
}
`), 0o644); err != nil {
		t.Fatalf("failed to seed hypercode tool registry: %v", err)
	}

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	server := New(cfg, stubDetector{
		tools: []controlplane.Tool{
			{Type: "codex", Name: "Codex CLI", Available: true},
			{Type: "claude-code", Name: "Claude Code CLI", Available: true},
		},
	})
	request := httptest.NewRequest(http.MethodGet, "/api/cli/harnesses", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"hypercode\"") {
		t.Fatalf("expected hypercode in harness payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"toolCallCount\":2") {
		t.Fatalf("expected hypercode tool inventory in harness payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"toolInventoryStatus\":\"source-backed\"") {
		t.Fatalf("expected source-backed inventory status in harness payload, got %s", recorder.Body.String())
	}
}

func TestCLISummaryEndpoint(t *testing.T) {
	workspaceRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(workspaceRoot, "submodules", "hypercode"), 0o755); err != nil {
		t.Fatalf("failed to create hypercode submodule path: %v", err)
	}
	toolsDir := filepath.Join(workspaceRoot, "submodules", "hypercode", "tools")
	if err := os.MkdirAll(toolsDir, 0o755); err != nil {
		t.Fatalf("failed to create hypercode tools path: %v", err)
	}
	if err := os.WriteFile(filepath.Join(toolsDir, "registry.go"), []byte(`
package tools

func demo() {
	_ = Tool{Name: "run_shell_command"}
	_ = Tool{Name: "read_file"}
}
`), 0o644); err != nil {
		t.Fatalf("failed to seed hypercode tool registry: %v", err)
	}

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	server := New(cfg, stubDetector{
		tools: []controlplane.Tool{
			{Type: "go", Name: "Go", Available: true},
			{Type: "codex", Name: "Codex CLI", Available: true},
			{Type: "gemini", Name: "Gemini CLI", Available: false},
		},
	})
	request := httptest.NewRequest(http.MethodGet, "/api/cli/summary", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"primaryHarness\":\"hypercode\"") {
		t.Fatalf("expected hypercode primary harness in payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"installedHarnessCount\":2") {
		t.Fatalf("expected two installed harnesses in payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"sourceBackedHarnessCount\":1") {
		t.Fatalf("expected one source-backed harness in payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"metadataOnlyHarnessCount\":14") {
		t.Fatalf("expected metadata-only harness count in payload, got %s", recorder.Body.String())
	}
}

func TestRuntimeLocksEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	cfg := config.Default()
	cfg.ConfigDir = filepath.Join(tempDir, ".borg-go")
	cfg.MainConfigDir = filepath.Join(tempDir, ".borg")

	if err := os.MkdirAll(cfg.MainConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create main config dir: %v", err)
	}

	if err := lockfile.Write(cfg.MainLockPath(), lockfile.Record{
		Host:      "127.0.0.1",
		Port:      4000,
		Version:   "0.99.1",
		StartedAt: "2026-03-28T00:00:00Z",
	}); err != nil {
		t.Fatalf("failed to write main lock: %v", err)
	}

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/runtime/locks", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	body := recorder.Body.String()
	if body == "" || body[0] != '{' {
		t.Fatalf("expected JSON object body, got %q", body)
	}
}

func TestImportedInstructionsEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	docPath := cfg.ImportedInstructionsPath()
	if err := os.MkdirAll(filepath.Dir(docPath), 0o755); err != nil {
		t.Fatalf("failed to create imported instructions directory: %v", err)
	}

	if err := os.WriteFile(docPath, []byte("# Auto-imported Agent Instructions\n"), 0o644); err != nil {
		t.Fatalf("failed to write imported instructions doc: %v", err)
	}

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/runtime/imported-instructions", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	body := recorder.Body.String()
	if body == "" || body[0] != '{' {
		t.Fatalf("expected JSON object body, got %q", body)
	}
}

func TestImportSourcesEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	homeDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	claudePath := filepath.Join(tempDir, ".claude", "session-1.jsonl")
	if err := os.MkdirAll(filepath.Dir(claudePath), 0o755); err != nil {
		t.Fatalf("failed to create claude dir: %v", err)
	}
	if err := os.WriteFile(claudePath, []byte("{\"model\":\"claude-sonnet\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to write claude session file: %v", err)
	}

	originalHome := os.Getenv("HOME")
	originalUserProfile := os.Getenv("USERPROFILE")
	t.Setenv("HOME", homeDir)
	t.Setenv("USERPROFILE", homeDir)
	if originalHome == "" && originalUserProfile == "" {
		// handled by t.Setenv restoring values
	}

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/import/sources", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	body := recorder.Body.String()
	if body == "" || body[0] != '{' {
		t.Fatalf("expected JSON object body, got %q", body)
	}
}

func TestImportRootsEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	homeDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	claudeRoot := filepath.Join(tempDir, ".claude")
	if err := os.MkdirAll(claudeRoot, 0o755); err != nil {
		t.Fatalf("failed to create claude root: %v", err)
	}

	t.Setenv("HOME", homeDir)
	t.Setenv("USERPROFILE", homeDir)

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/import/roots", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"sourceTool\":\"claude-code\"") {
		t.Fatalf("expected claude root payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"exists\":true") {
		t.Fatalf("expected existing root in payload, got %s", recorder.Body.String())
	}
}

func TestImportValidateEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	targetPath := filepath.Join(tempDir, ".claude", "session-1.jsonl")
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		t.Fatalf("failed to create claude dir: %v", err)
	}
	if err := os.WriteFile(targetPath, []byte("{\"message\":\"hello\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to write session file: %v", err)
	}

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/import/validate?path="+targetPath, nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
}

func TestImportCandidatesAndManifestEndpoints(t *testing.T) {
	tempDir := t.TempDir()
	homeDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	targetPath := filepath.Join(tempDir, ".claude", "session-1.jsonl")
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		t.Fatalf("failed to create claude dir: %v", err)
	}
	if err := os.WriteFile(targetPath, []byte("{\"model\":\"gpt-5\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to write session file: %v", err)
	}

	t.Setenv("HOME", homeDir)
	t.Setenv("USERPROFILE", homeDir)

	server := New(cfg, stubDetector{})

	for _, endpoint := range []string{"/api/import/candidates", "/api/import/manifest", "/api/import/summary"} {
		request := httptest.NewRequest(http.MethodGet, endpoint, nil)
		recorder := httptest.NewRecorder()

		server.Handler().ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200 for %s, got %d", endpoint, recorder.Code)
		}
		if !strings.Contains(recorder.Body.String(), "\"success\":true") {
			t.Fatalf("expected success payload for %s, got %s", endpoint, recorder.Body.String())
		}
	}
}

func TestMemoryStatusEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir

	storePath := filepath.Join(tempDir, ".borg", "sectioned_memory.json")
	if err := os.MkdirAll(filepath.Dir(storePath), 0o755); err != nil {
		t.Fatalf("failed to create memory dir: %v", err)
	}
	if err := os.WriteFile(storePath, []byte(`{"sections":[{"section":"project_context","entries":[{"createdAt":"2026-03-10T10:00:00Z"}]}]}`), 0o644); err != nil {
		t.Fatalf("failed to write memory store: %v", err)
	}

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/memory/borg-memory/status", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var payload struct {
		Success bool                    `json:"success"`
		Data    memorystore.StoreStatus `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode JSON body: %v", err)
	}

	if !payload.Success {
		t.Fatalf("expected success payload, got %#v", payload)
	}
	if !payload.Data.Exists {
		t.Fatalf("expected memory store to exist")
	}
	if payload.Data.TotalEntries != 1 {
		t.Fatalf("expected 1 memory entry, got %d", payload.Data.TotalEntries)
	}
}

func TestRuntimeStatusEndpoint(t *testing.T) {
	tempDir := t.TempDir()
	homeDir := t.TempDir()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/trpc/session.catalog" {
			t.Fatalf("unexpected bridge path %s", r.URL.Path)
		}
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"result": map[string]any{
				"data": map[string]any{
					"json": []map[string]any{
						{"id": "hypercode", "maturity": "Experimental"},
					},
				},
			},
		})
	}))
	defer upstream.Close()

	cfg := config.Default()
	cfg.WorkspaceRoot = tempDir
	cfg.ConfigDir = filepath.Join(tempDir, ".borg-go")
	cfg.MainConfigDir = filepath.Join(tempDir, ".borg")

	if err := os.MkdirAll(cfg.ConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create go config dir: %v", err)
	}
	if err := os.MkdirAll(cfg.MainConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create main config dir: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(tempDir, "submodules", "hypercode"), 0o755); err != nil {
		t.Fatalf("failed to create hypercode submodule path: %v", err)
	}
	toolsDir := filepath.Join(tempDir, "submodules", "hypercode", "tools")
	if err := os.MkdirAll(toolsDir, 0o755); err != nil {
		t.Fatalf("failed to create hypercode tools path: %v", err)
	}
	if err := os.WriteFile(filepath.Join(toolsDir, "registry.go"), []byte(`
package tools

func demo() {
	_ = Tool{Name: "run_shell_command"}
	_ = Tool{Name: "read_file"}
}
`), 0o644); err != nil {
		t.Fatalf("failed to seed hypercode tool registry: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tempDir, "borg.config.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("failed to create borg config file: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tempDir, "mcp.jsonc"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("failed to create mcp config file: %v", err)
	}

	if err := lockfile.Write(cfg.MainLockPath(), lockfile.Record{
		Host:      "127.0.0.1",
		Port:      4000,
		Version:   "0.99.1",
		StartedAt: "2026-03-28T00:00:00Z",
	}); err != nil {
		t.Fatalf("failed to write main lock: %v", err)
	}

	claudePath := filepath.Join(tempDir, ".claude", "session-1.jsonl")
	if err := os.MkdirAll(filepath.Dir(claudePath), 0o755); err != nil {
		t.Fatalf("failed to create claude dir: %v", err)
	}
	if err := os.WriteFile(claudePath, []byte("{\"model\":\"claude-sonnet\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to write claude session file: %v", err)
	}

	docPath := cfg.ImportedInstructionsPath()
	if err := os.MkdirAll(filepath.Dir(docPath), 0o755); err != nil {
		t.Fatalf("failed to create imported instructions directory: %v", err)
	}
	if err := os.WriteFile(docPath, []byte("# Auto-imported Agent Instructions\n"), 0o644); err != nil {
		t.Fatalf("failed to write imported instructions doc: %v", err)
	}

	storePath := filepath.Join(tempDir, ".borg", "sectioned_memory.json")
	if err := os.MkdirAll(filepath.Dir(storePath), 0o755); err != nil {
		t.Fatalf("failed to create memory dir: %v", err)
	}
	if err := os.WriteFile(storePath, []byte(`{"sections":[{"section":"project_context","entries":[{"createdAt":"2026-03-10T10:00:00Z"}]}]}`), 0o644); err != nil {
		t.Fatalf("failed to write memory store: %v", err)
	}

	t.Setenv("HOME", homeDir)
	t.Setenv("USERPROFILE", homeDir)
	t.Setenv("GOOGLE_API_KEY", "")
	t.Setenv("GEMINI_API_KEY", "")
	t.Setenv("OPENROUTER_API_KEY", "")
	t.Setenv("DEEPSEEK_API_KEY", "")
	t.Setenv("XAI_API_KEY", "")
	t.Setenv("COPILOT_PAT", "")
	t.Setenv("GITHUB_TOKEN", "")
	t.Setenv("OPENAI_API_KEY", "openai")
	t.Setenv("ANTHROPIC_API_KEY", "anthropic")
	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	server := New(cfg, stubDetector{})
	request := httptest.NewRequest(http.MethodGet, "/api/runtime/status", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var payload struct {
		Success bool          `json:"success"`
		Data    RuntimeStatus `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode JSON body: %v", err)
	}

	if !payload.Success {
		t.Fatalf("expected success payload, got %#v", payload)
	}
	if payload.Data.Service != "borg-go" {
		t.Fatalf("expected borg-go service, got %q", payload.Data.Service)
	}
	if len(payload.Data.Locks) != 2 {
		t.Fatalf("expected 2 lock statuses, got %d", len(payload.Data.Locks))
	}
	if payload.Data.LockSummary.VisibleCount != 2 {
		t.Fatalf("expected 2 visible lock slots, got %d", payload.Data.LockSummary.VisibleCount)
	}
	if payload.Data.LockSummary.RunningCount != 1 {
		t.Fatalf("expected 1 running control plane from seeded main lock, got %d", payload.Data.LockSummary.RunningCount)
	}
	if !payload.Data.Config.WorkspaceRootAvailable {
		t.Fatalf("expected workspace root to be available")
	}
	if !payload.Data.Config.RepoConfigAvailable || !payload.Data.Config.MCPConfigAvailable {
		t.Fatalf("expected repo config files to be available, got %+v", payload.Data.Config)
	}
	if !payload.Data.Config.HypercodeSubmoduleAvailable {
		t.Fatalf("expected hypercode submodule to be available")
	}
	if !payload.Data.ImportedInstructions.Available {
		t.Fatalf("expected imported instructions to be available")
	}
	if payload.Data.CLI.ToolCount != 0 {
		t.Fatalf("expected zero total CLI tools from empty stub, got %d", payload.Data.CLI.ToolCount)
	}
	if payload.Data.CLI.AvailableToolCount != 0 {
		t.Fatalf("expected no available CLI tools from empty stub, got %d", payload.Data.CLI.AvailableToolCount)
	}
	if payload.Data.CLI.HarnessCount != 16 {
		t.Fatalf("expected 16 total harness definitions, got %d", payload.Data.CLI.HarnessCount)
	}
	if payload.Data.CLI.InstalledHarnessCount != 1 {
		t.Fatalf("expected 1 installed harness from hypercode submodule, got %d", payload.Data.CLI.InstalledHarnessCount)
	}
	if payload.Data.CLI.SourceBackedHarnessCount != 1 || payload.Data.CLI.SourceBackedToolCount != 2 {
		t.Fatalf("expected runtime source-backed CLI summary, got %+v", payload.Data.CLI)
	}
	if payload.Data.CLI.MetadataOnlyHarnessCount != 14 || payload.Data.CLI.OperatorDefinedHarnessCount != 1 {
		t.Fatalf("expected runtime metadata/operator harness counts, got %+v", payload.Data.CLI)
	}
	if payload.Data.CLI.PrimaryHarness != "hypercode" {
		t.Fatalf("expected hypercode primary harness, got %q", payload.Data.CLI.PrimaryHarness)
	}
	if payload.Data.Providers.ProviderCount < payload.Data.Providers.ConfiguredCount {
		t.Fatalf("expected provider count to cover configured providers, got providerCount=%d configured=%d", payload.Data.Providers.ProviderCount, payload.Data.Providers.ConfiguredCount)
	}
	if payload.Data.Providers.ConfiguredCount != 2 {
		t.Fatalf("expected 2 configured providers, got %d", payload.Data.Providers.ConfiguredCount)
	}
	if payload.Data.Providers.ExecutableCount < payload.Data.Providers.ConfiguredCount {
		t.Fatalf("expected executable provider count to cover configured providers, got executable=%d configured=%d", payload.Data.Providers.ExecutableCount, payload.Data.Providers.ConfiguredCount)
	}
	if len(payload.Data.Providers.ByAuthMethod) < 1 {
		t.Fatalf("expected runtime provider auth buckets, got %+v", payload.Data.Providers.ByAuthMethod)
	}
	if !payload.Data.Memory.Available {
		t.Fatalf("expected memory store to be available")
	}
	if payload.Data.Memory.SectionCount != 1 {
		t.Fatalf("expected runtime memory section count 1, got %d", payload.Data.Memory.SectionCount)
	}
	if payload.Data.Memory.DefaultSectionCount != 5 {
		t.Fatalf("expected runtime default memory section count 5, got %d", payload.Data.Memory.DefaultSectionCount)
	}
	if payload.Data.Memory.PresentDefaultSectionCount != 1 {
		t.Fatalf("expected one present default memory section, got %d", payload.Data.Memory.PresentDefaultSectionCount)
	}
	if len(payload.Data.Memory.Sections) != 1 || payload.Data.Memory.Sections[0].EntryCount != 1 {
		t.Fatalf("expected runtime memory sections payload with one populated section, got %+v", payload.Data.Memory.Sections)
	}
	if payload.Data.Sessions.DiscoveredCount < 1 {
		t.Fatalf("expected at least one discovered session, got %d", payload.Data.Sessions.DiscoveredCount)
	}
	if len(payload.Data.Sessions.ByCLIType) < 1 {
		t.Fatalf("expected runtime session CLI breakdown, got %+v", payload.Data.Sessions.ByCLIType)
	}
	if !payload.Data.Sessions.SupervisorBridgeAvailable {
		t.Fatalf("expected runtime session bridge to be available")
	}
	if payload.Data.Sessions.SupervisorBridgeBase != upstream.URL+"/trpc" {
		t.Fatalf("expected runtime session bridge base %q, got %q", upstream.URL+"/trpc", payload.Data.Sessions.SupervisorBridgeBase)
	}
	if len(payload.Data.Sessions.ByTask) < 1 {
		t.Fatalf("expected runtime session task breakdown, got %+v", payload.Data.Sessions.ByTask)
	}
	if len(payload.Data.Sessions.ByModelHint) < 1 {
		t.Fatalf("expected runtime session model-hint breakdown, got %+v", payload.Data.Sessions.ByModelHint)
	}
	if payload.Data.ImportRoots.Count < 1 {
		t.Fatalf("expected at least one import root, got %d", payload.Data.ImportRoots.Count)
	}
	if payload.Data.ImportRoots.ExistingCount < 1 {
		t.Fatalf("expected at least one existing import root, got %d", payload.Data.ImportRoots.ExistingCount)
	}
	if payload.Data.ImportSources.Count < 1 {
		t.Fatalf("expected at least one import source candidate, got %d", payload.Data.ImportSources.Count)
	}
	if payload.Data.ImportSources.ValidCount < 1 {
		t.Fatalf("expected at least one valid import source, got %d", payload.Data.ImportSources.ValidCount)
	}
	if payload.Data.ImportSources.InvalidCount != 0 {
		t.Fatalf("expected zero invalid import sources, got %d", payload.Data.ImportSources.InvalidCount)
	}
	if payload.Data.ImportSources.TotalEstimatedSize <= 0 {
		t.Fatalf("expected positive total estimated import size, got %d", payload.Data.ImportSources.TotalEstimatedSize)
	}
	if len(payload.Data.ImportSources.BySourceTool) < 1 {
		t.Fatalf("expected runtime import source buckets, got %+v", payload.Data.ImportSources.BySourceTool)
	}
	if len(payload.Data.ImportSources.BySourceType) < 1 {
		t.Fatalf("expected runtime import source-type buckets, got %+v", payload.Data.ImportSources.BySourceType)
	}
	if len(payload.Data.ImportSources.ByModelHint) < 1 {
		t.Fatalf("expected runtime import model-hint buckets, got %+v", payload.Data.ImportSources.ByModelHint)
	}
	if !strings.Contains(payload.Data.ImportSources.Candidates[0].SourcePath, ".claude") {
		t.Fatalf("expected claude source path, got %q", payload.Data.ImportSources.Candidates[0].SourcePath)
	}
}
