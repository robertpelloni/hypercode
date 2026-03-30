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
	"github.com/borghq/borg-go/internal/interop"
	"github.com/borghq/borg-go/internal/lockfile"
	"github.com/borghq/borg-go/internal/memorystore"
	"github.com/borghq/borg-go/internal/providers"
	"github.com/borghq/borg-go/internal/sessionimport"
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
	if !strings.Contains(recorder.Body.String(), "\"/api/mesh/status\"") {
		t.Fatalf("expected mesh route in payload, got %s", recorder.Body.String())
	}
}

func TestMeshEndpoints(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/trpc/mesh.getCapabilities":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"node-ts": []string{"git", "research"},
						},
					},
				},
			})
		case "/trpc/mesh.queryCapabilities":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"capabilities": []string{"git", "research"},
							"role":         "typescript-main",
							"load":         0.5,
							"cachedAt":     1700000000000,
						},
					},
				},
			})
		default:
			t.Fatalf("unexpected bridge path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	server := New(config.Default(), stubDetector{})

	statusRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(statusRecorder, httptest.NewRequest(http.MethodGet, "/api/mesh/status", nil))
	if statusRecorder.Code != http.StatusOK {
		t.Fatalf("expected mesh status 200, got %d", statusRecorder.Code)
	}
	if !strings.Contains(statusRecorder.Body.String(), "\"peersCount\":1") {
		t.Fatalf("expected mesh peer count in payload, got %s", statusRecorder.Body.String())
	}

	peersRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(peersRecorder, httptest.NewRequest(http.MethodGet, "/api/mesh/peers", nil))
	if peersRecorder.Code != http.StatusOK {
		t.Fatalf("expected mesh peers 200, got %d", peersRecorder.Code)
	}
	if !strings.Contains(peersRecorder.Body.String(), "\"node-ts\"") {
		t.Fatalf("expected upstream node in peers payload, got %s", peersRecorder.Body.String())
	}

	capabilitiesRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(capabilitiesRecorder, httptest.NewRequest(http.MethodGet, "/api/mesh/capabilities", nil))
	if capabilitiesRecorder.Code != http.StatusOK {
		t.Fatalf("expected mesh capabilities 200, got %d", capabilitiesRecorder.Code)
	}
	if !strings.Contains(capabilitiesRecorder.Body.String(), "\"node-ts\"") {
		t.Fatalf("expected upstream capabilities in payload, got %s", capabilitiesRecorder.Body.String())
	}
	if !strings.Contains(capabilitiesRecorder.Body.String(), "\"runtime-status\"") {
		t.Fatalf("expected local Go capabilities in payload, got %s", capabilitiesRecorder.Body.String())
	}

	queryRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(queryRecorder, httptest.NewRequest(http.MethodGet, "/api/mesh/query-capabilities?nodeId=node-ts&timeoutMs=1500", nil))
	if queryRecorder.Code != http.StatusOK {
		t.Fatalf("expected mesh query capabilities 200, got %d", queryRecorder.Code)
	}
	if !strings.Contains(queryRecorder.Body.String(), "\"typescript-main\"") {
		t.Fatalf("expected remote role in query payload, got %s", queryRecorder.Body.String())
	}

	findRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(findRecorder, httptest.NewRequest(http.MethodGet, "/api/mesh/find-peer?capability=git,research", nil))
	if findRecorder.Code != http.StatusOK {
		t.Fatalf("expected mesh find peer 200, got %d", findRecorder.Code)
	}
	if !strings.Contains(findRecorder.Body.String(), "\"nodeId\":\"node-ts\"") {
		t.Fatalf("expected matching peer in payload, got %s", findRecorder.Body.String())
	}
}

func TestStartupStatusEndpoint(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/trpc/health":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"status": "ok"},
					},
				},
			})
		case "/trpc/session.catalog":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"sessions": []any{}},
					},
				},
			})
		case "/trpc/mesh.getCapabilities":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{},
					},
				},
			})
		default:
			t.Fatalf("unexpected bridge path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	workspaceRoot := t.TempDir()
	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.ConfigDir = filepath.Join(workspaceRoot, ".borg-go")
	cfg.MainConfigDir = filepath.Join(workspaceRoot, ".borg")
	if err := os.MkdirAll(cfg.ConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create go config dir: %v", err)
	}
	if err := os.MkdirAll(cfg.MainConfigDir, 0o755); err != nil {
		t.Fatalf("failed to create main config dir: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(workspaceRoot, ".borg", "memory"), 0o755); err != nil {
		t.Fatalf("failed to create memory dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(workspaceRoot, ".borg", "memory", "claude_mem.json"), []byte(`{"default":[]}`), 0o644); err != nil {
		t.Fatalf("failed to seed memory store: %v", err)
	}

	server := New(cfg, stubDetector{})
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/startup/status", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected startup status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "\"ready\":true") {
		t.Fatalf("expected ready startup payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"mainControlPlane\"") {
		t.Fatalf("expected main control plane checks, got %s", recorder.Body.String())
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

	var payload struct {
		Success bool          `json:"success"`
		Data    config.Status `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if payload.Data.WorkspaceRoot.Path != workspaceRoot || !payload.Data.WorkspaceRoot.Exists {
		t.Fatalf("expected workspace root status for %s, got %+v", workspaceRoot, payload.Data.WorkspaceRoot)
	}
	if payload.Data.ConfigDir.Path != cfg.ConfigDir || !payload.Data.ConfigDir.Exists {
		t.Fatalf("expected config dir status for %s, got %+v", cfg.ConfigDir, payload.Data.ConfigDir)
	}
	if payload.Data.MainConfigDir.Path != cfg.MainConfigDir || !payload.Data.MainConfigDir.Exists {
		t.Fatalf("expected main config dir status for %s, got %+v", cfg.MainConfigDir, payload.Data.MainConfigDir)
	}
	if payload.Data.BorgConfigFile.Exists || payload.Data.MCPConfigFile.Exists {
		t.Fatalf("expected config files to be absent in this fixture, got borg=%+v mcp=%+v", payload.Data.BorgConfigFile, payload.Data.MCPConfigFile)
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

	var payload struct {
		Success bool               `json:"success"`
		Data    []providers.Status `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if len(payload.Data) != 8 {
		t.Fatalf("expected 8 provider statuses, got %d", len(payload.Data))
	}
	if payload.Data[0].Provider != "openai" || payload.Data[0].AuthMethod != "api_key" {
		t.Fatalf("expected openai provider first, got %+v", payload.Data[0])
	}
	if !payload.Data[0].Configured || !payload.Data[0].Authenticated || payload.Data[0].EnvVar != "OPENAI_API_KEY" {
		t.Fatalf("expected configured openai provider, got %+v", payload.Data[0])
	}
	if payload.Data[3].Provider != "google-oauth" || payload.Data[3].AuthMethod != "oauth" {
		t.Fatalf("expected google-oauth provider in payload, got %+v", payload.Data[3])
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

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

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

func TestMCPBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/mcp.listTools":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"name": "search_tools", "server": "core", "alwaysOn": true},
						},
					},
				},
			})
		case "/trpc/mcp.searchTools":
			if got := r.URL.Query().Get("input"); got != "" {
				t.Fatalf("expected POST-style body bridge without input query param, got %q", got)
			}
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read searchTools body: %v", err)
			}
			if !strings.Contains(string(body), `"query":"search"`) || !strings.Contains(string(body), `"profile":"repo-coding"`) {
				t.Fatalf("expected bridged search payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"name": "search_tools", "server": "core", "alwaysShow": true},
						},
					},
				},
			})
		case "/trpc/mcp.callTool":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read callTool body: %v", err)
			}
			bodyText := string(body)
			if !strings.Contains(bodyText, `"name":"search_tools"`) && !strings.Contains(bodyText, `"name":"list_all_tools"`) {
				t.Fatalf("expected supported tool name in bridged callTool body, got %s", bodyText)
			}
			contentText := "done"
			if strings.Contains(bodyText, `"name":"list_all_tools"`) {
				contentText = "list_all_tools"
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"ok": true,
							"result": map[string]any{
								"content": []map[string]any{{"type": "text", "text": contentText}},
							},
						},
					},
				},
			})
		case "/trpc/mcp.getToolPreferences":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"importantTools":          []string{"search_tools"},
							"alwaysLoadedTools":       []string{"search_tools"},
							"autoLoadMinConfidence":   0.85,
							"maxLoadedTools":          16,
							"maxHydratedSchemas":      8,
							"idleEvictionThresholdMs": 300000,
						},
					},
				},
			})
		case "/trpc/mcp.setToolPreferences":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read setToolPreferences body: %v", err)
			}
			if !strings.Contains(string(body), `"importantTools":["search_tools"]`) {
				t.Fatalf("expected preference payload in bridged body, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"ok":                      true,
							"importantTools":          []string{"search_tools"},
							"alwaysLoadedTools":       []string{"search_tools"},
							"autoLoadMinConfidence":   0.85,
							"maxLoadedTools":          16,
							"maxHydratedSchemas":      8,
							"idleEvictionThresholdMs": 300000,
						},
					},
				},
			})
		case "/trpc/mcp.getWorkingSet":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"limits": map[string]any{"maxLoadedTools": 16},
							"tools":  []map[string]any{{"name": "search_tools", "hydrated": true}},
						},
					},
				},
			})
		case "/trpc/mcp.loadTool":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read loadTool body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"search_tools"`) {
				t.Fatalf("expected loadTool payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true, "message": "loaded"},
					},
				},
			})
		case "/trpc/mcp.unloadTool":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read unloadTool body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"search_tools"`) {
				t.Fatalf("expected unloadTool payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true, "message": "unloaded"},
					},
				},
			})
		case "/trpc/mcp.getToolSchema":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read getToolSchema body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"search_tools"`) {
				t.Fatalf("expected getToolSchema payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"inputSchema": map[string]any{"type": "object"}},
					},
				},
			})
		case "/trpc/mcp.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"connected": true, "serverCount": 1, "toolCount": 1},
					},
				},
			})
		case "/trpc/mcp.listServers":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"name": "core", "runtimeConnected": true, "toolCount": 1},
						},
					},
				},
			})
		case "/trpc/mcpServers.list":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"uuid": "srv-1", "name": "core"},
						},
					},
				},
			})
		case "/trpc/mcp.traffic":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"server": "core", "method": "tools/call", "success": true},
						},
					},
				},
			})
		case "/trpc/mcp.getToolSelectionTelemetry":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"type": "search", "toolName": "search_tools", "status": "success"},
						},
					},
				},
			})
		case "/trpc/mcp.clearToolSelectionTelemetry":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true},
					},
				},
			})
		case "/trpc/mcp.getWorkingSetEvictionHistory":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"toolName": "search_tools", "tier": "loaded"},
						},
					},
				},
			})
		case "/trpc/mcp.clearWorkingSetEvictionHistory":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true, "message": "cleared"},
					},
				},
			})
		case "/trpc/mcp.runServerTest":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read runServerTest body: %v", err)
			}
			if !strings.Contains(string(body), `"targetKind":"router"`) || !strings.Contains(string(body), `"operation":"tools/list"`) {
				t.Fatalf("expected server test payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true, "success": true, "latencyMs": 5},
					},
				},
			})
		case "/trpc/mcp.getJsoncEditor":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"path": "C:/tmp/borg.mcp.jsonc", "content": "// Borg MCP configuration"},
					},
				},
			})
		case "/trpc/mcp.saveJsoncEditor":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read saveJsoncEditor body: %v", err)
			}
			if !strings.Contains(string(body), `"content":"{}`) {
				t.Fatalf("expected JSONC content payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true},
					},
				},
			})
		case "/trpc/mcpServers.get":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read mcpServers.get body: %v", err)
			}
			if !strings.Contains(string(body), `"uuid":"srv-1"`) {
				t.Fatalf("expected uuid payload for mcpServers.get, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"uuid": "srv-1", "name": "core"},
					},
				},
			})
		case "/trpc/mcpServers.create", "/trpc/mcpServers.update", "/trpc/mcpServers.delete", "/trpc/mcpServers.reloadMetadata", "/trpc/mcpServers.clearMetadataCache", "/trpc/mcpServers.syncClientConfig":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read %s body: %v", r.URL.Path, err)
			}
			if len(body) == 0 {
				t.Fatalf("expected non-empty body for %s", r.URL.Path)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"ok": true, "path": r.URL.Path},
					},
				},
			})
		case "/trpc/mcpServers.bulkImport":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read bulkImport body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"core"`) {
				t.Fatalf("expected array import payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{{"uuid": "srv-1", "name": "core"}},
					},
				},
			})
		case "/trpc/mcpServers.syncTargets":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{{"client": "claude-desktop", "configured": true}},
					},
				},
			})
		case "/trpc/mcpServers.exportClientConfig":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read exportClientConfig body: %v", err)
			}
			if !strings.Contains(string(body), `"client":"claude-desktop"`) {
				t.Fatalf("expected client payload for exportClientConfig, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"client": "claude-desktop", "content": "{}"},
					},
				},
			})
		case "/trpc/mcpServers.registrySnapshot":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"id": "mcp-1", "name": "Core MCP", "url": "https://example.com/mcp"},
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

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "list tools", method: http.MethodGet, path: "/api/mcp/tools", contains: "\"search_tools\"", procedure: "\"procedure\":\"mcp.listTools\""},
		{name: "search tools", method: http.MethodGet, path: "/api/mcp/tools/search?query=search&profile=repo-coding", contains: "\"alwaysShow\":true", procedure: "\"procedure\":\"mcp.searchTools\""},
		{name: "call tool", method: http.MethodPost, path: "/api/mcp/tools/call", body: `{"name":"search_tools","args":{"query":"borg"}}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcp.callTool\""},
		{name: "tool advertisements", method: http.MethodGet, path: "/api/mcp/tool-ads?goal=ship&objective=find%20tool&limit=6", contains: "\"list_all_tools\"", procedure: "\"procedure\":\"mcp.callTool\""},
		{name: "get preferences", method: http.MethodGet, path: "/api/mcp/preferences", contains: "\"importantTools\":[\"search_tools\"]", procedure: "\"procedure\":\"mcp.getToolPreferences\""},
		{name: "set preferences", method: http.MethodPost, path: "/api/mcp/preferences", body: `{"importantTools":["search_tools"]}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcp.setToolPreferences\""},
		{name: "working set", method: http.MethodGet, path: "/api/mcp/working-set", contains: "\"hydrated\":true", procedure: "\"procedure\":\"mcp.getWorkingSet\""},
		{name: "load tool", method: http.MethodPost, path: "/api/mcp/working-set/load", body: `{"name":"search_tools"}`, contains: "\"message\":\"loaded\"", procedure: "\"procedure\":\"mcp.loadTool\""},
		{name: "unload tool", method: http.MethodPost, path: "/api/mcp/working-set/unload", body: `{"name":"search_tools"}`, contains: "\"message\":\"unloaded\"", procedure: "\"procedure\":\"mcp.unloadTool\""},
		{name: "tool schema", method: http.MethodPost, path: "/api/mcp/tools/schema", body: `{"name":"search_tools"}`, contains: "\"inputSchema\"", procedure: "\"procedure\":\"mcp.getToolSchema\""},
		{name: "status", method: http.MethodGet, path: "/api/mcp/status", contains: "\"connected\":true", procedure: "\"procedure\":\"mcp.getStatus\""},
		{name: "traffic", method: http.MethodGet, path: "/api/mcp/traffic", contains: "\"method\":\"tools/call\"", procedure: "\"procedure\":\"mcp.traffic\""},
		{name: "tool selection telemetry", method: http.MethodGet, path: "/api/mcp/tool-selection-telemetry", contains: "\"toolName\":\"search_tools\"", procedure: "\"procedure\":\"mcp.getToolSelectionTelemetry\""},
		{name: "clear tool selection telemetry", method: http.MethodPost, path: "/api/mcp/tool-selection-telemetry/clear", body: `null`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcp.clearToolSelectionTelemetry\""},
		{name: "working set evictions", method: http.MethodGet, path: "/api/mcp/working-set/evictions", contains: "\"tier\":\"loaded\"", procedure: "\"procedure\":\"mcp.getWorkingSetEvictionHistory\""},
		{name: "clear working set evictions", method: http.MethodPost, path: "/api/mcp/working-set/evictions/clear", body: `null`, contains: "\"message\":\"cleared\"", procedure: "\"procedure\":\"mcp.clearWorkingSetEvictionHistory\""},
		{name: "server test", method: http.MethodPost, path: "/api/mcp/server-test", body: `{"targetKind":"router","operation":"tools/list"}`, contains: "\"latencyMs\":5", procedure: "\"procedure\":\"mcp.runServerTest\""},
		{name: "get jsonc config", method: http.MethodGet, path: "/api/mcp/config/jsonc", contains: "\"content\":\"// Borg MCP configuration\"", procedure: "\"procedure\":\"mcp.getJsoncEditor\""},
		{name: "save jsonc config", method: http.MethodPost, path: "/api/mcp/config/jsonc", body: `{"content":"{}"}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcp.saveJsoncEditor\""},
		{name: "runtime servers", method: http.MethodGet, path: "/api/mcp/servers/runtime", contains: "\"runtimeConnected\":true", procedure: "\"procedure\":\"mcp.listServers\""},
		{name: "configured servers", method: http.MethodGet, path: "/api/mcp/servers/configured", contains: "\"uuid\":\"srv-1\"", procedure: "\"procedure\":\"mcpServers.list\""},
		{name: "configured server get", method: http.MethodGet, path: "/api/mcp/servers/get?uuid=srv-1", contains: "\"uuid\":\"srv-1\"", procedure: "\"procedure\":\"mcpServers.get\""},
		{name: "configured server create", method: http.MethodPost, path: "/api/mcp/servers/create", body: `{"name":"core","command":"node","args":["server.js"]}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcpServers.create\""},
		{name: "configured server update", method: http.MethodPost, path: "/api/mcp/servers/update", body: `{"uuid":"srv-1","name":"core","command":"node"}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcpServers.update\""},
		{name: "configured server delete", method: http.MethodPost, path: "/api/mcp/servers/delete", body: `{"uuid":"srv-1"}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcpServers.delete\""},
		{name: "configured server bulk import", method: http.MethodPost, path: "/api/mcp/servers/bulk-import", body: `[{"name":"core","command":"node","args":["server.js"]}]`, contains: "\"uuid\":\"srv-1\"", procedure: "\"procedure\":\"mcpServers.bulkImport\""},
		{name: "configured server reload metadata", method: http.MethodPost, path: "/api/mcp/servers/reload-metadata", body: `{"uuid":"srv-1","mode":"binary"}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcpServers.reloadMetadata\""},
		{name: "configured server clear metadata cache", method: http.MethodPost, path: "/api/mcp/servers/clear-metadata-cache", body: `{"uuid":"srv-1"}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcpServers.clearMetadataCache\""},
		{name: "registry snapshot", method: http.MethodGet, path: "/api/mcp/servers/registry-snapshot", contains: "\"Core MCP\"", procedure: "\"procedure\":\"mcpServers.registrySnapshot\""},
		{name: "sync targets", method: http.MethodGet, path: "/api/mcp/servers/sync-targets", contains: "\"claude-desktop\"", procedure: "\"procedure\":\"mcpServers.syncTargets\""},
		{name: "export client config", method: http.MethodGet, path: "/api/mcp/servers/export-client-config?client=claude-desktop", contains: "\"client\":\"claude-desktop\"", procedure: "\"procedure\":\"mcpServers.exportClientConfig\""},
		{name: "sync client config", method: http.MethodPost, path: "/api/mcp/servers/sync-client-config", body: `{"client":"claude-desktop"}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcpServers.syncClientConfig\""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestImportedSessionBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/session.importedList":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read importedList body: %v", err)
			}
			if !strings.Contains(string(body), `"limit":25`) {
				t.Fatalf("expected importedList limit payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"id": "imp-1", "sourceTool": "claude-code", "parsedMemories": []any{}},
						},
					},
				},
			})
		case "/trpc/session.importedGet":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read importedGet body: %v", err)
			}
			if !strings.Contains(string(body), `"id":"imp-1"`) {
				t.Fatalf("expected importedGet id payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"id": "imp-1", "sourceTool": "claude-code", "parsedMemories": []any{}},
					},
				},
			})
		case "/trpc/session.importedScan":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read importedScan body: %v", err)
			}
			if !strings.Contains(string(body), `"force":true`) {
				t.Fatalf("expected importedScan force payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"discoveredCount":    3,
							"importedCount":      1,
							"skippedCount":       2,
							"storedMemoryCount":  4,
							"instructionDocPath": "C:/tmp/auto-imported-agent-instructions.md",
							"tools":              []string{"claude-code"},
						},
					},
				},
			})
		case "/trpc/session.importedInstructionDocs":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"path": "C:/tmp/auto-imported-agent-instructions.md", "name": "auto-imported-agent-instructions.md"},
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

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "imported list", method: http.MethodGet, path: "/api/sessions/imported/list?limit=25", contains: "\"sourceTool\":\"claude-code\"", procedure: "\"procedure\":\"session.importedList\""},
		{name: "imported get", method: http.MethodGet, path: "/api/sessions/imported/get?id=imp-1", contains: "\"id\":\"imp-1\"", procedure: "\"procedure\":\"session.importedGet\""},
		{name: "imported scan", method: http.MethodPost, path: "/api/sessions/imported/scan", body: `{"force":true}`, contains: "\"storedMemoryCount\":4", procedure: "\"procedure\":\"session.importedScan\""},
		{name: "imported docs", method: http.MethodGet, path: "/api/sessions/imported/instruction-docs", contains: "\"auto-imported-agent-instructions.md\"", procedure: "\"procedure\":\"session.importedInstructionDocs\""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestMemoryBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/memory.query":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"bootstrap"`) {
				t.Fatalf("expected memory.query payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "ctx-1", "title": "Bootstrap Context"}}}}})
		case "/trpc/memory.listContexts":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "ctx-1", "title": "Bootstrap Context"}}}}})
		case "/trpc/memory.getContext":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"ctx-1"`) {
				t.Fatalf("expected memory.getContext id payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "ctx-1", "content": "hello"}}}})
		case "/trpc/memory.deleteContext":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/memory.getAgentStats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"session": 1, "working": 2, "longTerm": 3, "total": 6}}}})
		case "/trpc/memory.searchAgentMemory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"memory"`) {
				t.Fatalf("expected memory.searchAgentMemory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "mem-1", "content": "memory result"}}}}})
		case "/trpc/memory.getSessionBootstrap":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"activeGoal": "ship parity", "memories": []any{}}}}})
		case "/trpc/memory.getToolContext":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"toolName":"search_tools"`) {
				t.Fatalf("expected memory.getToolContext tool payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"toolName": "search_tools", "context": []any{}}}}})
		case "/trpc/memory.getRecentSessionSummaries":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"sessionId": "sess-1", "summary": "recent"}}}}})
		case "/trpc/memory.searchSessionSummaries":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"recent"`) {
				t.Fatalf("expected memory.searchSessionSummaries payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"sessionId": "sess-1", "summary": "recent"}}}}})
		case "/trpc/memory.listInterchangeFormats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []string{"json", "markdown"}}}})
		case "/trpc/memory.exportMemories":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"data": "{}", "format": "json"}}}})
		case "/trpc/memory.importMemories":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"imported": 2}}}})
		case "/trpc/memory.convertMemories":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"data": "---", "toFormat": "markdown"}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "memory search", method: http.MethodGet, path: "/api/memory/search?query=bootstrap&limit=3", contains: "\"Bootstrap Context\"", procedure: "\"procedure\":\"memory.query\""},
		{name: "memory contexts", method: http.MethodGet, path: "/api/memory/contexts", contains: "\"ctx-1\"", procedure: "\"procedure\":\"memory.listContexts\""},
		{name: "memory get context", method: http.MethodGet, path: "/api/memory/context/get?id=ctx-1", contains: "\"content\":\"hello\"", procedure: "\"procedure\":\"memory.getContext\""},
		{name: "memory delete context", method: http.MethodPost, path: "/api/memory/context/delete", body: `{"id":"ctx-1"}`, contains: "\"success\":true", procedure: "\"procedure\":\"memory.deleteContext\""},
		{name: "memory agent stats", method: http.MethodGet, path: "/api/memory/agent-stats", contains: "\"total\":6", procedure: "\"procedure\":\"memory.getAgentStats\""},
		{name: "memory agent search", method: http.MethodGet, path: "/api/memory/agent-search?query=memory&type=working&limit=5", contains: "\"memory result\"", procedure: "\"procedure\":\"memory.searchAgentMemory\""},
		{name: "memory session bootstrap", method: http.MethodGet, path: "/api/memory/session-bootstrap?activeGoal=ship%20parity", contains: "\"activeGoal\":\"ship parity\"", procedure: "\"procedure\":\"memory.getSessionBootstrap\""},
		{name: "memory tool context", method: http.MethodGet, path: "/api/memory/tool-context?toolName=search_tools", contains: "\"toolName\":\"search_tools\"", procedure: "\"procedure\":\"memory.getToolContext\""},
		{name: "recent session summaries", method: http.MethodGet, path: "/api/memory/session-summaries/recent?limit=5", contains: "\"sessionId\":\"sess-1\"", procedure: "\"procedure\":\"memory.getRecentSessionSummaries\""},
		{name: "search session summaries", method: http.MethodGet, path: "/api/memory/session-summaries/search?query=recent&limit=5", contains: "\"summary\":\"recent\"", procedure: "\"procedure\":\"memory.searchSessionSummaries\""},
		{name: "memory interchange formats", method: http.MethodGet, path: "/api/memory/interchange-formats", contains: "\"markdown\"", procedure: "\"procedure\":\"memory.listInterchangeFormats\""},
		{name: "memory export", method: http.MethodGet, path: "/api/memory/export?userId=default&format=json", contains: "\"format\":\"json\"", procedure: "\"procedure\":\"memory.exportMemories\""},
		{name: "memory import", method: http.MethodPost, path: "/api/memory/import", body: `{"userId":"default","format":"json","data":"{}"}`, contains: "\"imported\":2", procedure: "\"procedure\":\"memory.importMemories\""},
		{name: "memory convert", method: http.MethodPost, path: "/api/memory/convert", body: `{"userId":"default","fromFormat":"json","toFormat":"markdown","data":"{}"}`, contains: "\"toFormat\":\"markdown\"", procedure: "\"procedure\":\"memory.convertMemories\""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestAgentMemoryBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/agentMemory.search":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"bridge"`) {
				t.Fatalf("expected agentMemory.search payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "am-1", "content": "bridge result"}}}}})
		case "/trpc/agentMemory.add":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "am-2", "content": "added memory"}}}})
		case "/trpc/agentMemory.getRecent":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "am-3", "type": "working"}}}}})
		case "/trpc/agentMemory.getByType":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"type":"working"`) {
				t.Fatalf("expected agentMemory.getByType payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "am-4", "type": "working"}}}}})
		case "/trpc/agentMemory.getByNamespace":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"namespace":"project"`) {
				t.Fatalf("expected agentMemory.getByNamespace payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "am-5", "namespace": "project"}}}}})
		case "/trpc/agentMemory.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/agentMemory.clearSession":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/agentMemory.export":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"session": []any{}, "working": []any{}, "long_term": []any{}}}}})
		case "/trpc/agentMemory.handoff":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"artifact": "handoff.md"}}}})
		case "/trpc/agentMemory.pickup":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"restored": 3}}}})
		case "/trpc/agentMemory.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"session": 2, "working": 3, "longTerm": 4, "total": 9}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "agent memory search", method: http.MethodGet, path: "/api/agent-memory/search?query=bridge&namespace=project&type=working&limit=5", contains: "\"bridge result\"", procedure: "\"procedure\":\"agentMemory.search\""},
		{name: "agent memory add", method: http.MethodPost, path: "/api/agent-memory/add", body: `{"content":"remember this","type":"working","namespace":"project","tags":["bridge"]}`, contains: "\"added memory\"", procedure: "\"procedure\":\"agentMemory.add\""},
		{name: "agent memory recent", method: http.MethodGet, path: "/api/agent-memory/recent?type=working&limit=3", contains: "\"type\":\"working\"", procedure: "\"procedure\":\"agentMemory.getRecent\""},
		{name: "agent memory by type", method: http.MethodGet, path: "/api/agent-memory/by-type?type=working", contains: "\"am-4\"", procedure: "\"procedure\":\"agentMemory.getByType\""},
		{name: "agent memory by namespace", method: http.MethodGet, path: "/api/agent-memory/by-namespace?namespace=project", contains: "\"namespace\":\"project\"", procedure: "\"procedure\":\"agentMemory.getByNamespace\""},
		{name: "agent memory delete", method: http.MethodPost, path: "/api/agent-memory/delete", body: `{"id":"am-1"}`, contains: "\"data\":true", procedure: "\"procedure\":\"agentMemory.delete\""},
		{name: "agent memory clear session", method: http.MethodPost, path: "/api/agent-memory/clear-session", contains: "\"success\":true", procedure: "\"procedure\":\"agentMemory.clearSession\""},
		{name: "agent memory export", method: http.MethodGet, path: "/api/agent-memory/export", contains: "\"long_term\":[]", procedure: "\"procedure\":\"agentMemory.export\""},
		{name: "agent memory handoff", method: http.MethodPost, path: "/api/agent-memory/handoff", body: `{"notes":"bridge handoff"}`, contains: "\"artifact\":\"handoff.md\"", procedure: "\"procedure\":\"agentMemory.handoff\""},
		{name: "agent memory pickup", method: http.MethodPost, path: "/api/agent-memory/pickup", body: `{"artifact":"handoff.md"}`, contains: "\"restored\":3", procedure: "\"procedure\":\"agentMemory.pickup\""},
		{name: "agent memory stats", method: http.MethodGet, path: "/api/agent-memory/stats", contains: "\"total\":9", procedure: "\"procedure\":\"agentMemory.stats\""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestCodeBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/graph.get":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"nodes": []map[string]any{{"id": "file-a"}}, "links": []any{}, "dependencies": map[string]any{"file-a": []string{"file-b"}}}}}})
		case "/trpc/graph.rebuild":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "nodes": []map[string]any{{"id": "file-b"}}}}}})
		case "/trpc/graph.getConsumers":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"filePath":"src/app.ts"`) {
				t.Fatalf("expected graph.getConsumers payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []string{"src/consumer.ts"}}}})
		case "/trpc/graph.getDependencies":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"filePath":"src/app.ts"`) {
				t.Fatalf("expected graph.getDependencies payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []string{"src/dep.ts"}}}})
		case "/trpc/graph.getSymbolsGraph":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"nodes": []map[string]any{{"id": "sym-1", "name": "demo"}}, "links": []map[string]any{{"source": "src/demo.ts", "target": "sym-1", "type": "defines"}}}}}})
		case "/trpc/borgContext.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []string{"src/app.ts"}}}})
		case "/trpc/borgContext.add":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "added src/app.ts"}}})
		case "/trpc/borgContext.remove":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "removed src/app.ts"}}})
		case "/trpc/borgContext.clear":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "cleared"}}})
		case "/trpc/borgContext.getPrompt":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "Prompt context"}}})
		case "/trpc/git.getModules":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"name": "hypercode", "path": "submodules/hypercode"}}}}})
		case "/trpc/git.getLog":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":5`) {
				t.Fatalf("expected git.getLog limit payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"hash": "abc123", "message": "ship bridge"}}}}})
		case "/trpc/git.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"branch": "main", "clean": false}}}})
		case "/trpc/git.revert":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/tests.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"isRunning": true, "results": map[string]any{"src/app.ts": map[string]any{"status": "passed"}}}}}})
		case "/trpc/tests.start":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/tests.stop":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/tests.run":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"filePath":"src/app.ts"`) {
				t.Fatalf("expected tests.run payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "testFile": "src/app.test.ts"}}}})
		case "/trpc/tests.results":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"file": "src/app.test.ts", "status": "passed"}}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "graph get", method: http.MethodGet, path: "/api/graph", contains: "\"file-a\"", procedure: "\"procedure\":\"graph.get\""},
		{name: "graph rebuild", method: http.MethodPost, path: "/api/graph/rebuild", contains: "\"success\":true", procedure: "\"procedure\":\"graph.rebuild\""},
		{name: "graph consumers", method: http.MethodGet, path: "/api/graph/consumers?filePath=src/app.ts", contains: "\"src/consumer.ts\"", procedure: "\"procedure\":\"graph.getConsumers\""},
		{name: "graph dependencies", method: http.MethodGet, path: "/api/graph/dependencies?filePath=src/app.ts", contains: "\"src/dep.ts\"", procedure: "\"procedure\":\"graph.getDependencies\""},
		{name: "graph symbols", method: http.MethodGet, path: "/api/graph/symbols", contains: "\"sym-1\"", procedure: "\"procedure\":\"graph.getSymbolsGraph\""},
		{name: "context list", method: http.MethodGet, path: "/api/context/list", contains: "\"src/app.ts\"", procedure: "\"procedure\":\"borgContext.list\""},
		{name: "context add", method: http.MethodPost, path: "/api/context/add", body: "{\"filePath\":\"src/app.ts\"}", contains: "added src/app.ts", procedure: "\"procedure\":\"borgContext.add\""},
		{name: "context remove", method: http.MethodPost, path: "/api/context/remove", body: "{\"filePath\":\"src/app.ts\"}", contains: "removed src/app.ts", procedure: "\"procedure\":\"borgContext.remove\""},
		{name: "context clear", method: http.MethodPost, path: "/api/context/clear", contains: "cleared", procedure: "\"procedure\":\"borgContext.clear\""},
		{name: "context prompt", method: http.MethodGet, path: "/api/context/prompt", contains: "Prompt context", procedure: "\"procedure\":\"borgContext.getPrompt\""},
		{name: "git modules", method: http.MethodGet, path: "/api/git/modules", contains: "\"hypercode\"", procedure: "\"procedure\":\"git.getModules\""},
		{name: "git log", method: http.MethodGet, path: "/api/git/log?limit=5", contains: "\"abc123\"", procedure: "\"procedure\":\"git.getLog\""},
		{name: "git status", method: http.MethodGet, path: "/api/git/status", contains: "\"branch\":\"main\"", procedure: "\"procedure\":\"git.getStatus\""},
		{name: "git revert", method: http.MethodPost, path: "/api/git/revert", body: "{\"hash\":\"abc123\"}", contains: "\"success\":true", procedure: "\"procedure\":\"git.revert\""},
		{name: "tests status", method: http.MethodGet, path: "/api/tests/status", contains: "\"isRunning\":true", procedure: "\"procedure\":\"tests.status\""},
		{name: "tests start", method: http.MethodPost, path: "/api/tests/start", contains: "\"success\":true", procedure: "\"procedure\":\"tests.start\""},
		{name: "tests stop", method: http.MethodPost, path: "/api/tests/stop", contains: "\"success\":true", procedure: "\"procedure\":\"tests.stop\""},
		{name: "tests run", method: http.MethodPost, path: "/api/tests/run", body: "{\"filePath\":\"src/app.ts\"}", contains: "\"testFile\":\"src/app.test.ts\"", procedure: "\"procedure\":\"tests.run\""},
		{name: "tests results", method: http.MethodGet, path: "/api/tests/results", contains: "\"src/app.test.ts\"", procedure: "\"procedure\":\"tests.results\""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestAdminBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/metrics.getStats":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"windowMs":60000`) {
				t.Fatalf("expected metrics.getStats payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"counts": map[string]any{"requests": 5}}}}})
		case "/trpc/metrics.track":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/metrics.systemSnapshot":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"process": map[string]any{"pid": 1234}, "system": map[string]any{"platform": "win32"}}}}})
		case "/trpc/metrics.getTimeline":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"metricType":"requests"`) {
				t.Fatalf("expected metrics.getTimeline payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"series": []any{map[string]any{"timestamp": 1, "value": 2}}, "buckets": 10}}}})
		case "/trpc/metrics.getProviderBreakdown":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"totalCost": 1.25, "providers": []any{map[string]any{"provider": "openai", "requests": 3}}}}}})
		case "/trpc/metrics.toggleMonitoring":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "monitoring": true}}}})
		case "/trpc/metrics.getRoutingHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":7`) {
				t.Fatalf("expected metrics.getRoutingHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"provider": "openai", "reason": "quota"}}}}})
		case "/trpc/logs.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"sess-1"`) || !strings.Contains(string(body), `"serverName":"core"`) {
				t.Fatalf("expected logs.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"toolName": "search_tools", "level": "info"}}}}})
		case "/trpc/logs.summary":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":50`) {
				t.Fatalf("expected logs.summary payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"totals": map[string]any{"totalCalls": 3}, "topTools": []map[string]any{{"name": "search_tools", "count": 2}}}}}})
		case "/trpc/logs.clear":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "message": "Logs cleared"}}}})
		case "/trpc/serverHealth.check":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"serverUuid":"srv-1"`) {
				t.Fatalf("expected serverHealth.check payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"status": "HEALTHY", "crashCount": 0, "maxAttempts": 3}}}})
		case "/trpc/serverHealth.reset":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "metrics stats", method: http.MethodGet, path: "/api/metrics/stats?windowMs=60000", contains: `"requests":5`, procedure: `"procedure":"metrics.getStats"`},
		{name: "metrics track", method: http.MethodPost, path: "/api/metrics/track", body: `{"type":"requests","value":1,"tags":{"provider":"openai"}}`, contains: `"success":true`, procedure: `"procedure":"metrics.track"`},
		{name: "metrics system snapshot", method: http.MethodGet, path: "/api/metrics/system-snapshot", contains: `"platform":"win32"`, procedure: `"procedure":"metrics.systemSnapshot"`},
		{name: "metrics timeline", method: http.MethodGet, path: "/api/metrics/timeline?windowMs=60000&buckets=10&metricType=requests", contains: `"buckets":10`, procedure: `"procedure":"metrics.getTimeline"`},
		{name: "metrics provider breakdown", method: http.MethodGet, path: "/api/metrics/provider-breakdown", contains: `"totalCost":1.25`, procedure: `"procedure":"metrics.getProviderBreakdown"`},
		{name: "metrics monitoring", method: http.MethodPost, path: "/api/metrics/monitoring", body: `{"enabled":true,"intervalMs":5000}`, contains: `"monitoring":true`, procedure: `"procedure":"metrics.toggleMonitoring"`},
		{name: "metrics routing history", method: http.MethodGet, path: "/api/metrics/routing-history?limit=7", contains: `"reason":"quota"`, procedure: `"procedure":"metrics.getRoutingHistory"`},
		{name: "logs list", method: http.MethodGet, path: "/api/logs?limit=10&sessionId=sess-1&serverName=core", contains: `"search_tools"`, procedure: `"procedure":"logs.list"`},
		{name: "logs summary", method: http.MethodGet, path: "/api/logs/summary?limit=50", contains: `"totalCalls":3`, procedure: `"procedure":"logs.summary"`},
		{name: "logs clear", method: http.MethodPost, path: "/api/logs/clear", contains: `"Logs cleared"`, procedure: `"procedure":"logs.clear"`},
		{name: "server health check", method: http.MethodGet, path: "/api/server-health/check?serverUuid=srv-1", contains: `"maxAttempts":3`, procedure: `"procedure":"serverHealth.check"`},
		{name: "server health reset", method: http.MethodPost, path: "/api/server-health/reset", body: `{"serverUuid":"srv-1"}`, contains: `"success":true`, procedure: `"procedure":"serverHealth.reset"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestControlBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/settings.get":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"theme": "dark"}}}})
		case "/trpc/settings.update":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/settings.getProviders":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "openai", "configured": true}}}}})
		case "/trpc/settings.testConnection":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "provider": "openai"}}}})
		case "/trpc/settings.getEnvironment":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"platform": "win32"}}}})
		case "/trpc/settings.getMcpServers":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "core"}}}}})
		case "/trpc/settings.updateProviderKey":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "updatedKey": "OPENAI_API_KEY"}}}})
		case "/trpc/tools.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "search_tools"}}}}})
		case "/trpc/tools.listByServer":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"mcpServerUuid":"srv-1"`) {
				t.Fatalf("expected tools.listByServer payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"server": "core"}}}}})
		case "/trpc/tools.search":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"search"`) {
				t.Fatalf("expected tools.search payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "search_tools"}}}}})
		case "/trpc/tools.detectCliHarnesses":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "hypercode"}}}}})
		case "/trpc/tools.detectExecutionEnvironment":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"shell": "pwsh"}}}})
		case "/trpc/tools.detectInstallSurfaces":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"surface": "npm-global"}}}}})
		case "/trpc/tools.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"search_tools"`) {
				t.Fatalf("expected tools.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"name": "search_tools"}}}})
		case "/trpc/tools.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/tools.upsertBatch":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/tools.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/tools.setAlwaysOn":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "tool": map[string]any{"always_on": true}}}}})
		case "/trpc/toolSets.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"uuid": "ts-1"}}}}})
		case "/trpc/toolSets.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"ts-1"`) {
				t.Fatalf("expected toolSets.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "ts-1", "name": "Core Tools"}}}})
		case "/trpc/toolSets.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "ts-2"}}}})
		case "/trpc/toolSets.update":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "ts-1", "name": "Updated"}}}})
		case "/trpc/toolSets.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/project.getContext":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "# Project Context"}}})
		case "/trpc/project.updateContext":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/project.getHandoffs":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "handoff_1.json"}}}}})
		case "/trpc/shell.logCommand":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "id": "cmd-1"}}}})
		case "/trpc/shell.queryHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"pnpm"`) {
				t.Fatalf("expected shell.queryHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"command": "pnpm test"}}}}})
		case "/trpc/shell.getSystemHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":5`) {
				t.Fatalf("expected shell.getSystemHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"command": "git status"}}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "settings get", method: http.MethodGet, path: "/api/settings", contains: `"theme":"dark"`, procedure: `"procedure":"settings.get"`},
		{name: "settings update", method: http.MethodPost, path: "/api/settings/update", body: `{"config":{"theme":"dark"}}`, contains: `"success":true`, procedure: `"procedure":"settings.update"`},
		{name: "settings providers", method: http.MethodGet, path: "/api/settings/providers", contains: `"configured":true`, procedure: `"procedure":"settings.getProviders"`},
		{name: "settings test connection", method: http.MethodPost, path: "/api/settings/test-connection", body: `{"provider":"openai"}`, contains: `"provider":"openai"`, procedure: `"procedure":"settings.testConnection"`},
		{name: "settings environment", method: http.MethodGet, path: "/api/settings/environment", contains: `"platform":"win32"`, procedure: `"procedure":"settings.getEnvironment"`},
		{name: "settings mcp servers", method: http.MethodGet, path: "/api/settings/mcp-servers", contains: `"name":"core"`, procedure: `"procedure":"settings.getMcpServers"`},
		{name: "settings provider key", method: http.MethodPost, path: "/api/settings/provider-key", body: `{"provider":"openai","key":"sk-test"}`, contains: `"updatedKey":"OPENAI_API_KEY"`, procedure: `"procedure":"settings.updateProviderKey"`},
		{name: "tools list", method: http.MethodGet, path: "/api/tools", contains: `"search_tools"`, procedure: `"procedure":"tools.list"`},
		{name: "tools by server", method: http.MethodGet, path: "/api/tools/by-server?mcpServerUuid=srv-1", contains: `"core"`, procedure: `"procedure":"tools.listByServer"`},
		{name: "tools search", method: http.MethodGet, path: "/api/tools/search?query=search&limit=5", contains: `"search_tools"`, procedure: `"procedure":"tools.search"`},
		{name: "tools detect cli harnesses", method: http.MethodGet, path: "/api/tools/detect-cli-harnesses", contains: `"hypercode"`, procedure: `"procedure":"tools.detectCliHarnesses"`},
		{name: "tools detect execution environment", method: http.MethodGet, path: "/api/tools/detect-execution-environment", contains: `"shell":"pwsh"`, procedure: `"procedure":"tools.detectExecutionEnvironment"`},
		{name: "tools detect install surfaces", method: http.MethodGet, path: "/api/tools/detect-install-surfaces", contains: `"npm-global"`, procedure: `"procedure":"tools.detectInstallSurfaces"`},
		{name: "tools get", method: http.MethodGet, path: "/api/tools/get?uuid=search_tools", contains: `"name":"search_tools"`, procedure: `"procedure":"tools.get"`},
		{name: "tools create", method: http.MethodPost, path: "/api/tools/create", body: `{"name":"demo","mcp_server_uuid":"srv-1","description":"Demo","toolSchema":{"type":"object"}}`, contains: `"success":true`, procedure: `"procedure":"tools.create"`},
		{name: "tools upsert batch", method: http.MethodPost, path: "/api/tools/upsert-batch", body: `[{"name":"demo","mcp_server_uuid":"srv-1","description":"Demo","toolSchema":{"type":"object"}}]`, contains: `"success":true`, procedure: `"procedure":"tools.upsertBatch"`},
		{name: "tools delete", method: http.MethodPost, path: "/api/tools/delete", body: `{"uuid":"search_tools"}`, contains: `"success":true`, procedure: `"procedure":"tools.delete"`},
		{name: "tools always on", method: http.MethodPost, path: "/api/tools/always-on", body: `{"uuid":"search_tools","alwaysOn":true}`, contains: `"always_on":true`, procedure: `"procedure":"tools.setAlwaysOn"`},
		{name: "tool sets list", method: http.MethodGet, path: "/api/tool-sets", contains: `"uuid":"ts-1"`, procedure: `"procedure":"toolSets.list"`},
		{name: "tool sets get", method: http.MethodGet, path: "/api/tool-sets/get?uuid=ts-1", contains: `"Core Tools"`, procedure: `"procedure":"toolSets.get"`},
		{name: "tool sets create", method: http.MethodPost, path: "/api/tool-sets/create", body: `{"name":"Core Tools","tools":["search_tools"]}`, contains: `"uuid":"ts-2"`, procedure: `"procedure":"toolSets.create"`},
		{name: "tool sets update", method: http.MethodPost, path: "/api/tool-sets/update", body: `{"uuid":"ts-1","name":"Updated"}`, contains: `"Updated"`, procedure: `"procedure":"toolSets.update"`},
		{name: "tool sets delete", method: http.MethodPost, path: "/api/tool-sets/delete", body: `{"uuid":"ts-1"}`, contains: `"success":true`, procedure: `"procedure":"toolSets.delete"`},
		{name: "project context", method: http.MethodGet, path: "/api/project/context", contains: `# Project Context`, procedure: `"procedure":"project.getContext"`},
		{name: "project context update", method: http.MethodPost, path: "/api/project/context/update", body: `{"content":"# Project Context"}`, contains: `"success":true`, procedure: `"procedure":"project.updateContext"`},
		{name: "project handoffs", method: http.MethodGet, path: "/api/project/handoffs", contains: `"handoff_1.json"`, procedure: `"procedure":"project.getHandoffs"`},
		{name: "shell log", method: http.MethodPost, path: "/api/shell/log", body: `{"command":"pnpm test","cwd":"C:\\repo","session":"sess-1"}`, contains: `"id":"cmd-1"`, procedure: `"procedure":"shell.logCommand"`},
		{name: "shell query history", method: http.MethodGet, path: "/api/shell/history/query?query=pnpm&limit=5", contains: `"pnpm test"`, procedure: `"procedure":"shell.queryHistory"`},
		{name: "shell system history", method: http.MethodGet, path: "/api/shell/history/system?limit=5", contains: `"git status"`, procedure: `"procedure":"shell.getSystemHistory"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestAgentBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/agent.runTool":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"ok": true, "content": "tool output"}}}})
		case "/trpc/agent.chat":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"response": "hello", "degraded": false}}}})
		case "/trpc/commands.execute":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"input":"/status"`) {
				t.Fatalf("expected commands.execute payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"handled": true, "output": "ok"}}}})
		case "/trpc/commands.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "status", "description": "Show status"}}}}})
		case "/trpc/skills.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "skill-1", "name": "debug", "description": "Debug help", "content": "Use rg", "path": "skills/debug.md"}}}}})
		case "/trpc/skills.read":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"debug"`) {
				t.Fatalf("expected skills.read payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"content": []any{map[string]any{"type": "text", "text": "Skill content"}}}}}})
		case "/trpc/skills.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"content": []any{map[string]any{"type": "text", "text": "Created"}}}}}})
		case "/trpc/skills.save":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"content": []any{map[string]any{"type": "text", "text": "Saved"}}}}}})
		case "/trpc/skills.assimilate":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "logs": []any{"assimilated"}}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "agent run tool", method: http.MethodPost, path: "/api/agent/tool", body: `{"toolName":"search_tools","arguments":{"query":"borg"}}`, contains: `"tool output"`, procedure: `"procedure":"agent.runTool"`},
		{name: "agent chat", method: http.MethodPost, path: "/api/agent/chat", body: `{"message":"hello"}`, contains: `"response":"hello"`, procedure: `"procedure":"agent.chat"`},
		{name: "commands execute", method: http.MethodPost, path: "/api/commands/execute", body: `{"input":"/status"}`, contains: `"handled":true`, procedure: `"procedure":"commands.execute"`},
		{name: "commands list", method: http.MethodGet, path: "/api/commands", contains: `"name":"status"`, procedure: `"procedure":"commands.list"`},
		{name: "skills list", method: http.MethodGet, path: "/api/skills", contains: `"skill-1"`, procedure: `"procedure":"skills.list"`},
		{name: "skills read", method: http.MethodGet, path: "/api/skills/read?name=debug", contains: `"Skill content"`, procedure: `"procedure":"skills.read"`},
		{name: "skills create", method: http.MethodPost, path: "/api/skills/create", body: `{"id":"skill-2","name":"trace","description":"Trace help"}`, contains: `"Created"`, procedure: `"procedure":"skills.create"`},
		{name: "skills save", method: http.MethodPost, path: "/api/skills/save", body: `{"id":"skill-2","content":"Updated content"}`, contains: `"Saved"`, procedure: `"procedure":"skills.save"`},
		{name: "skills assimilate", method: http.MethodPost, path: "/api/skills/assimilate", body: `{"topic":"debugging","docsUrl":"https://example.com"}`, contains: `"assimilated"`, procedure: `"procedure":"skills.assimilate"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestWorkflowBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/workflow.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "wf-1", "name": "Workflow One"}}}}})
		case "/trpc/workflow.getGraph":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"workflowId":"wf-1"`) {
				t.Fatalf("expected workflowId in getGraph payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"nodes": []any{map[string]any{"id": "n1"}}, "edges": []any{}}}}})
		case "/trpc/workflow.start":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"workflowId":"wf-1"`) {
				t.Fatalf("expected workflow.start payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"executionId": "exec-1", "status": "running"}}}})
		case "/trpc/workflow.listExecutions":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"executionId": "exec-1", "status": "running"}}}}})
		case "/trpc/workflow.getExecution":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"executionId":"exec-1"`) {
				t.Fatalf("expected workflow.getExecution payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"executionId": "exec-1", "status": "running"}}}})
		case "/trpc/workflow.getHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"executionId":"exec-1"`) {
				t.Fatalf("expected workflow.getHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"event": "started"}}}}})
		case "/trpc/workflow.resume":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/workflow.pause":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/workflow.approve":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/workflow.reject":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"reason":"needs changes"`) {
				t.Fatalf("expected workflow.reject payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/workflow.listCanvases":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "canvas-1", "name": "Canvas One"}}}}})
		case "/trpc/workflow.loadCanvas":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"canvas-1"`) {
				t.Fatalf("expected workflow.loadCanvas payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "canvas-1", "nodes": []any{}, "edges": []any{}}}}})
		case "/trpc/workflow.saveCanvas":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"Canvas One"`) {
				t.Fatalf("expected workflow.saveCanvas payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "canvas-1"}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "workflow list", method: http.MethodGet, path: "/api/workflows", contains: `"wf-1"`, procedure: `"procedure":"workflow.list"`},
		{name: "workflow graph", method: http.MethodGet, path: "/api/workflows/graph?workflowId=wf-1", contains: `"nodes"`, procedure: `"procedure":"workflow.getGraph"`},
		{name: "workflow start", method: http.MethodPost, path: "/api/workflows/start", body: `{"workflowId":"wf-1","initialState":{"ticket":"123"}}`, contains: `"executionId":"exec-1"`, procedure: `"procedure":"workflow.start"`},
		{name: "workflow executions", method: http.MethodGet, path: "/api/workflows/executions", contains: `"status":"running"`, procedure: `"procedure":"workflow.listExecutions"`},
		{name: "workflow execution", method: http.MethodGet, path: "/api/workflows/execution?executionId=exec-1", contains: `"executionId":"exec-1"`, procedure: `"procedure":"workflow.getExecution"`},
		{name: "workflow history", method: http.MethodGet, path: "/api/workflows/history?executionId=exec-1", contains: `"started"`, procedure: `"procedure":"workflow.getHistory"`},
		{name: "workflow resume", method: http.MethodPost, path: "/api/workflows/resume", body: `{"executionId":"exec-1"}`, contains: `"success":true`, procedure: `"procedure":"workflow.resume"`},
		{name: "workflow pause", method: http.MethodPost, path: "/api/workflows/pause", body: `{"executionId":"exec-1"}`, contains: `"success":true`, procedure: `"procedure":"workflow.pause"`},
		{name: "workflow approve", method: http.MethodPost, path: "/api/workflows/approve", body: `{"executionId":"exec-1"}`, contains: `"success":true`, procedure: `"procedure":"workflow.approve"`},
		{name: "workflow reject", method: http.MethodPost, path: "/api/workflows/reject", body: `{"executionId":"exec-1","reason":"needs changes"}`, contains: `"success":true`, procedure: `"procedure":"workflow.reject"`},
		{name: "workflow canvases", method: http.MethodGet, path: "/api/workflows/canvases", contains: `"canvas-1"`, procedure: `"procedure":"workflow.listCanvases"`},
		{name: "workflow canvas", method: http.MethodGet, path: "/api/workflows/canvas?id=canvas-1", contains: `"canvas-1"`, procedure: `"procedure":"workflow.loadCanvas"`},
		{name: "workflow canvas save", method: http.MethodPost, path: "/api/workflows/canvas/save", body: `{"name":"Canvas One","description":"desc","nodes":[],"edges":[]}`, contains: `"id":"canvas-1"`, procedure: `"procedure":"workflow.saveCanvas"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestSymbolsAndLSPBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/symbols.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sym-1", "name": "RunServer"}}}}})
		case "/trpc/symbols.find":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"Run"`) {
				t.Fatalf("expected symbols.find payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "RunServer"}}}}})
		case "/trpc/symbols.pin":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sym-1"}}}})
		case "/trpc/symbols.unpin":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/symbols.updatePriority":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/symbols.addNotes":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/symbols.clear":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": 2}}})
		case "/trpc/symbols.forFile":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"filePath":"src/app.ts"`) {
				t.Fatalf("expected symbols.forFile payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sym-1", "file": "src/app.ts"}}}}})
		case "/trpc/lsp.findSymbol":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"symbolName":"RunServer"`) {
				t.Fatalf("expected lsp.findSymbol payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"filePath": "src/app.ts", "line": 10}}}})
		case "/trpc/lsp.findReferences":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"character":3`) {
				t.Fatalf("expected lsp.findReferences payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"filePath": "src/app.ts", "line": 10}}}}})
		case "/trpc/lsp.getSymbols":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"filePath":"src/app.ts"`) {
				t.Fatalf("expected lsp.getSymbols payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "RunServer"}}}}})
		case "/trpc/lsp.searchSymbols":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"Run"`) {
				t.Fatalf("expected lsp.searchSymbols payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "RunServer"}}}}})
		case "/trpc/lsp.indexProject":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "symbols list", method: http.MethodGet, path: "/api/symbols", contains: `"sym-1"`, procedure: `"procedure":"symbols.list"`},
		{name: "symbols find", method: http.MethodGet, path: "/api/symbols/find?query=Run&limit=5", contains: `"RunServer"`, procedure: `"procedure":"symbols.find"`},
		{name: "symbols pin", method: http.MethodPost, path: "/api/symbols/pin", body: `{"name":"RunServer","file":"src/app.ts","type":"function"}`, contains: `"id":"sym-1"`, procedure: `"procedure":"symbols.pin"`},
		{name: "symbols unpin", method: http.MethodPost, path: "/api/symbols/unpin", body: `{"id":"sym-1"}`, contains: `"data":true`, procedure: `"procedure":"symbols.unpin"`},
		{name: "symbols priority", method: http.MethodPost, path: "/api/symbols/priority", body: `{"id":"sym-1","priority":7}`, contains: `"data":true`, procedure: `"procedure":"symbols.updatePriority"`},
		{name: "symbols notes", method: http.MethodPost, path: "/api/symbols/notes", body: `{"id":"sym-1","notes":"important"}`, contains: `"data":true`, procedure: `"procedure":"symbols.addNotes"`},
		{name: "symbols clear", method: http.MethodPost, path: "/api/symbols/clear", body: `{}`, contains: `"data":2`, procedure: `"procedure":"symbols.clear"`},
		{name: "symbols for file", method: http.MethodGet, path: "/api/symbols/file?filePath=src%2Fapp.ts", contains: `"src/app.ts"`, procedure: `"procedure":"symbols.forFile"`},
		{name: "lsp find symbol", method: http.MethodGet, path: "/api/lsp/find-symbol?filePath=src%2Fapp.ts&symbolName=RunServer", contains: `"line":10`, procedure: `"procedure":"lsp.findSymbol"`},
		{name: "lsp references", method: http.MethodGet, path: "/api/lsp/find-references?filePath=src%2Fapp.ts&line=10&character=3", contains: `"src/app.ts"`, procedure: `"procedure":"lsp.findReferences"`},
		{name: "lsp symbols", method: http.MethodGet, path: "/api/lsp/symbols?filePath=src%2Fapp.ts", contains: `"RunServer"`, procedure: `"procedure":"lsp.getSymbols"`},
		{name: "lsp search", method: http.MethodGet, path: "/api/lsp/search?query=Run", contains: `"RunServer"`, procedure: `"procedure":"lsp.searchSymbols"`},
		{name: "lsp index", method: http.MethodPost, path: "/api/lsp/index", body: `{}`, contains: `"success":true`, procedure: `"procedure":"lsp.indexProject"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestCompactBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/apiKeys.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"uuid": "key-1", "name": "Primary"}}}}})
		case "/trpc/apiKeys.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"key-1"`) {
				t.Fatalf("expected apiKeys.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "key-1", "name": "Primary"}}}})
		case "/trpc/apiKeys.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "key-2"}}}})
		case "/trpc/apiKeys.update":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "key-1", "name": "Updated"}}}})
		case "/trpc/apiKeys.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/apiKeys.validate":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"valid": true}}}})
		case "/trpc/audit.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":25`) {
				t.Fatalf("expected audit.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"action": "run"}}}}})
		case "/trpc/audit.log":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"level":"info"`) || !strings.Contains(string(body), `"agentId":"agent-1"`) {
				t.Fatalf("expected audit.log payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"action": "run", "level": "info"}}}}})
		case "/trpc/savedScripts.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"uuid": "script-1", "name": "Deploy"}}}}})
		case "/trpc/savedScripts.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"script-1"`) {
				t.Fatalf("expected savedScripts.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "script-1", "name": "Deploy"}}}})
		case "/trpc/savedScripts.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "script-2"}}}})
		case "/trpc/savedScripts.update":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "script-1", "name": "Deploy v2"}}}})
		case "/trpc/savedScripts.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/savedScripts.execute":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "result": "done"}}}})
		case "/trpc/linksBacklog.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"search":"mcp"`) || !strings.Contains(string(body), `"show_duplicates":true`) {
				t.Fatalf("expected linksBacklog.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"items": []any{map[string]any{"uuid": "link-1", "title": "MCP"}}, "total": 1}}}})
		case "/trpc/linksBacklog.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"pending": 10, "done": 5}}}})
		case "/trpc/linksBacklog.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"link-1"`) {
				t.Fatalf("expected linksBacklog.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "link-1", "title": "MCP"}}}})
		case "/trpc/linksBacklog.syncFromBobbyBookmarks":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"imported": 3, "updated": 2}}}})
		case "/trpc/infrastructure.getInfrastructureStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"installed": true, "hasConfig": true}}}})
		case "/trpc/infrastructure.runDoctor":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "output": "ok"}}}})
		case "/trpc/infrastructure.applyConfigurations":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "output": "applied"}}}})
		case "/trpc/expert.research":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"summary": "researched"}}}})
		case "/trpc/expert.code":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"summary": "coded"}}}})
		case "/trpc/expert.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"researcher": "active", "coder": "offline"}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "api keys list", method: http.MethodGet, path: "/api/api-keys", contains: `"key-1"`, procedure: `"procedure":"apiKeys.list"`},
		{name: "api keys get", method: http.MethodGet, path: "/api/api-keys/get?uuid=key-1", contains: `"Primary"`, procedure: `"procedure":"apiKeys.get"`},
		{name: "api keys create", method: http.MethodPost, path: "/api/api-keys/create", body: `{"name":"Secondary","key_prefix":"sk","is_active":true}`, contains: `"key-2"`, procedure: `"procedure":"apiKeys.create"`},
		{name: "api keys update", method: http.MethodPost, path: "/api/api-keys/update", body: `{"uuid":"key-1","name":"Updated"}`, contains: `"Updated"`, procedure: `"procedure":"apiKeys.update"`},
		{name: "api keys delete", method: http.MethodPost, path: "/api/api-keys/delete", body: `{"uuid":"key-1"}`, contains: `"data":true`, procedure: `"procedure":"apiKeys.delete"`},
		{name: "api keys validate", method: http.MethodPost, path: "/api/api-keys/validate", body: `{"key":"secret"}`, contains: `"valid":true`, procedure: `"procedure":"apiKeys.validate"`},
		{name: "audit list", method: http.MethodGet, path: "/api/audit?limit=25", contains: `"action":"run"`, procedure: `"procedure":"audit.list"`},
		{name: "audit query", method: http.MethodGet, path: "/api/audit/query?level=info&agentId=agent-1&action=run&limit=10", contains: `"level":"info"`, procedure: `"procedure":"audit.log"`},
		{name: "scripts list", method: http.MethodGet, path: "/api/scripts", contains: `"script-1"`, procedure: `"procedure":"savedScripts.list"`},
		{name: "scripts get", method: http.MethodGet, path: "/api/scripts/get?uuid=script-1", contains: `"Deploy"`, procedure: `"procedure":"savedScripts.get"`},
		{name: "scripts create", method: http.MethodPost, path: "/api/scripts/create", body: `{"name":"Deploy","description":"ship it","code":"echo hi"}`, contains: `"script-2"`, procedure: `"procedure":"savedScripts.create"`},
		{name: "scripts update", method: http.MethodPost, path: "/api/scripts/update", body: `{"uuid":"script-1","name":"Deploy v2"}`, contains: `"Deploy v2"`, procedure: `"procedure":"savedScripts.update"`},
		{name: "scripts delete", method: http.MethodPost, path: "/api/scripts/delete", body: `{"uuid":"script-1"}`, contains: `"success":true`, procedure: `"procedure":"savedScripts.delete"`},
		{name: "scripts execute", method: http.MethodPost, path: "/api/scripts/execute", body: `{"uuid":"script-1"}`, contains: `"result":"done"`, procedure: `"procedure":"savedScripts.execute"`},
		{name: "links backlog list", method: http.MethodGet, path: "/api/links-backlog?limit=5&offset=0&search=mcp&source=bobby&research_status=pending&cluster_id=cluster-1&show_duplicates=true", contains: `"total":1`, procedure: `"procedure":"linksBacklog.list"`},
		{name: "links backlog stats", method: http.MethodGet, path: "/api/links-backlog/stats", contains: `"pending":10`, procedure: `"procedure":"linksBacklog.stats"`},
		{name: "links backlog get", method: http.MethodGet, path: "/api/links-backlog/get?uuid=link-1", contains: `"title":"MCP"`, procedure: `"procedure":"linksBacklog.get"`},
		{name: "links backlog sync", method: http.MethodPost, path: "/api/links-backlog/sync", body: `{"baseUrl":"https://example.com","perPage":100,"includeDuplicates":true,"includeResearched":true}`, contains: `"imported":3`, procedure: `"procedure":"linksBacklog.syncFromBobbyBookmarks"`},
		{name: "infrastructure status", method: http.MethodGet, path: "/api/infrastructure", contains: `"installed":true`, procedure: `"procedure":"infrastructure.getInfrastructureStatus"`},
		{name: "infrastructure doctor", method: http.MethodPost, path: "/api/infrastructure/doctor", body: `{}`, contains: `"output":"ok"`, procedure: `"procedure":"infrastructure.runDoctor"`},
		{name: "infrastructure apply", method: http.MethodPost, path: "/api/infrastructure/apply", body: `{}`, contains: `"output":"applied"`, procedure: `"procedure":"infrastructure.applyConfigurations"`},
		{name: "expert research", method: http.MethodPost, path: "/api/expert/research", body: `{"query":"mcp bridges","depth":2,"breadth":3}`, contains: `"researched"`, procedure: `"procedure":"expert.research"`},
		{name: "expert code", method: http.MethodPost, path: "/api/expert/code", body: `{"task":"wire endpoint"}`, contains: `"coded"`, procedure: `"procedure":"expert.code"`},
		{name: "expert status", method: http.MethodGet, path: "/api/expert/status", contains: `"researcher":"active"`, procedure: `"procedure":"expert.getStatus"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestGovernanceAndCatalogBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/policies.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"uuid": "policy-1", "name": "Default"}}}}})
		case "/trpc/policies.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"policy-1"`) {
				t.Fatalf("expected policies.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "policy-1", "name": "Default"}}}})
		case "/trpc/policies.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "policy-2"}}}})
		case "/trpc/policies.update":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"uuid": "policy-1", "name": "Updated"}}}})
		case "/trpc/policies.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/secrets.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"key": "OPENAI_API_KEY"}}}}})
		case "/trpc/secrets.set":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/secrets.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/marketplace.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"filter":"tool"`) {
				t.Fatalf("expected marketplace.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "entry-1", "name": "Tool One"}}}}})
		case "/trpc/marketplace.install":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"installed": true}}}})
		case "/trpc/marketplace.publish":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "entry-2"}}}})
		case "/trpc/catalog.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"search":"mcp"`) || !strings.Contains(string(body), `"limit":10`) {
				t.Fatalf("expected catalog.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"servers": []any{map[string]any{"uuid": "catalog-1", "display_name": "Catalog One"}}, "total": 1}}}})
		case "/trpc/catalog.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"uuid":"catalog-1"`) {
				t.Fatalf("expected catalog.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"server": map[string]any{"uuid": "catalog-1"}}}}})
		case "/trpc/catalog.listRuns":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"server_uuid":"catalog-1"`) {
				t.Fatalf("expected catalog.listRuns payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"uuid": "run-1", "outcome": "passed"}}}}})
		case "/trpc/catalog.triggerIngestion":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"total_upserted": 3}}}})
		case "/trpc/catalog.triggerValidation":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"run_uuid": "run-1", "outcome": "passed"}}}})
		case "/trpc/catalog.installFromRecipe":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"installed": true, "server_uuid": "managed-1"}}}})
		case "/trpc/catalog.triggerBatchValidation":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"queued": 1, "passed": 1}}}})
		case "/trpc/catalog.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"total": 9, "validated": 4}}}})
		case "/trpc/catalog.listLinkedServers":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"published_server_uuid":"catalog-1"`) {
				t.Fatalf("expected catalog.listLinkedServers payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"uuid": "managed-1"}}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "policies list", method: http.MethodGet, path: "/api/policies", contains: `"policy-1"`, procedure: `"procedure":"policies.list"`},
		{name: "policies get", method: http.MethodGet, path: "/api/policies/get?uuid=policy-1", contains: `"Default"`, procedure: `"procedure":"policies.get"`},
		{name: "policies create", method: http.MethodPost, path: "/api/policies/create", body: `{"name":"New Policy","resource":"tool","action":"read","effect":"allow"}`, contains: `"policy-2"`, procedure: `"procedure":"policies.create"`},
		{name: "policies update", method: http.MethodPost, path: "/api/policies/update", body: `{"uuid":"policy-1","name":"Updated"}`, contains: `"Updated"`, procedure: `"procedure":"policies.update"`},
		{name: "policies delete", method: http.MethodPost, path: "/api/policies/delete", body: `{"uuid":"policy-1"}`, contains: `"success":true`, procedure: `"procedure":"policies.delete"`},
		{name: "secrets list", method: http.MethodGet, path: "/api/secrets", contains: `"OPENAI_API_KEY"`, procedure: `"procedure":"secrets.list"`},
		{name: "secrets set", method: http.MethodPost, path: "/api/secrets/set", body: `{"key":"OPENAI_API_KEY","value":"secret"}`, contains: `"success":true`, procedure: `"procedure":"secrets.set"`},
		{name: "secrets delete", method: http.MethodPost, path: "/api/secrets/delete", body: `{"key":"OPENAI_API_KEY"}`, contains: `"success":true`, procedure: `"procedure":"secrets.delete"`},
		{name: "marketplace list", method: http.MethodGet, path: "/api/marketplace?filter=tool", contains: `"entry-1"`, procedure: `"procedure":"marketplace.list"`},
		{name: "marketplace install", method: http.MethodPost, path: "/api/marketplace/install", body: `{"id":"entry-1"}`, contains: `"installed":true`, procedure: `"procedure":"marketplace.install"`},
		{name: "marketplace publish", method: http.MethodPost, path: "/api/marketplace/publish", body: `{"name":"Tool One","description":"desc","url":"https://example.com"}`, contains: `"entry-2"`, procedure: `"procedure":"marketplace.publish"`},
		{name: "catalog list", method: http.MethodGet, path: "/api/catalog?limit=10&offset=0&search=mcp&status=validated&transport=STDIO&install_method=npm", contains: `"catalog-1"`, procedure: `"procedure":"catalog.list"`},
		{name: "catalog get", method: http.MethodGet, path: "/api/catalog/get?uuid=catalog-1", contains: `"catalog-1"`, procedure: `"procedure":"catalog.get"`},
		{name: "catalog runs", method: http.MethodGet, path: "/api/catalog/runs?server_uuid=catalog-1&limit=5", contains: `"run-1"`, procedure: `"procedure":"catalog.listRuns"`},
		{name: "catalog ingest", method: http.MethodPost, path: "/api/catalog/ingest", body: `{}`, contains: `"total_upserted":3`, procedure: `"procedure":"catalog.triggerIngestion"`},
		{name: "catalog validate", method: http.MethodPost, path: "/api/catalog/validate", body: `{"server_uuid":"catalog-1"}`, contains: `"outcome":"passed"`, procedure: `"procedure":"catalog.triggerValidation"`},
		{name: "catalog install", method: http.MethodPost, path: "/api/catalog/install", body: `{"server_uuid":"catalog-1","env":{"TOKEN":"x"},"name":"installed-server"}`, contains: `"managed-1"`, procedure: `"procedure":"catalog.installFromRecipe"`},
		{name: "catalog validate batch", method: http.MethodPost, path: "/api/catalog/validate-batch", body: `{"statuses":["normalized"],"max_servers":5}`, contains: `"queued":1`, procedure: `"procedure":"catalog.triggerBatchValidation"`},
		{name: "catalog stats", method: http.MethodGet, path: "/api/catalog/stats", contains: `"total":9`, procedure: `"procedure":"catalog.stats"`},
		{name: "catalog linked servers", method: http.MethodGet, path: "/api/catalog/linked-servers?published_server_uuid=catalog-1", contains: `"managed-1"`, procedure: `"procedure":"catalog.listLinkedServers"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestResearchOAuthPulseAndExportBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/oauth.clients.create":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"client_id": "client-1"}}}})
		case "/trpc/oauth.clients.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"clientId":"client-1"`) {
				t.Fatalf("expected oauth.clients.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"client_id": "client-1"}}}})
		case "/trpc/oauth.sessions.upsert":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"mcp_server_uuid": "server-1"}}}})
		case "/trpc/oauth.sessions.getByServer":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"mcpServerUuid":"server-1"`) {
				t.Fatalf("expected oauth.sessions.getByServer payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"mcp_server_uuid": "server-1"}}}})
		case "/trpc/oauth.exchange":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "tokens": map[string]any{"access_token": "token"}}}}})
		case "/trpc/research.conduct":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"report": "done"}}}})
		case "/trpc/research.ingest":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"result": "ingested"}}}})
		case "/trpc/research.recursiveResearch":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"result": map[string]any{"topic": "mcp"}}}}})
		case "/trpc/research.generateQueries":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"topic":"mcp bridges"`) {
				t.Fatalf("expected research.generateQueries payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"queries": []any{"mcp bridges"}}}}})
		case "/trpc/research.ingestionQueue":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"totals": map[string]any{"pending": 2}}}}})
		case "/trpc/research.retryFailed":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/research.retryAllFailed":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"moved": 2}}}})
		case "/trpc/research.enqueuePending":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"queued": true}}}})
		case "/trpc/pulse.getLatestEvents":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":5`) {
				t.Fatalf("expected pulse.getLatestEvents payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"type": "event", "timestamp": 123}}}}})
		case "/trpc/pulse.getSystemStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"status": "online"}}}})
		case "/trpc/pulse.checkLocalProviders":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"ollama": true}}}})
		case "/trpc/sessionExport.export":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "export-1"}}}})
		case "/trpc/sessionExport.import":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"imported": 1}}}})
		case "/trpc/sessionExport.detectFormat":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"format": "borg-export", "valid": true}}}})
		case "/trpc/sessionExport.knownFormats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "borg", "type": "borg"}}}}})
		case "/trpc/sessionExport.history":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "export-1"}}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "oauth client create", method: http.MethodPost, path: "/api/oauth/clients/create", body: `{"client_name":"test","redirect_uris":["https://example.com/callback"]}`, contains: `"client-1"`, procedure: `"procedure":"oauth.clients.create"`},
		{name: "oauth client get", method: http.MethodGet, path: "/api/oauth/clients/get?clientId=client-1", contains: `"client-1"`, procedure: `"procedure":"oauth.clients.get"`},
		{name: "oauth session upsert", method: http.MethodPost, path: "/api/oauth/sessions/upsert", body: `{"mcp_server_uuid":"server-1","client_information":{"client_id":"client-1"}}`, contains: `"server-1"`, procedure: `"procedure":"oauth.sessions.upsert"`},
		{name: "oauth session by server", method: http.MethodGet, path: "/api/oauth/sessions/by-server?mcpServerUuid=server-1", contains: `"server-1"`, procedure: `"procedure":"oauth.sessions.getByServer"`},
		{name: "oauth exchange", method: http.MethodPost, path: "/api/oauth/exchange", body: `{"code":"abc","state":"server-1"}`, contains: `"success":true`, procedure: `"procedure":"oauth.exchange"`},
		{name: "research conduct", method: http.MethodPost, path: "/api/research/conduct", body: `{"topic":"mcp","depth":3}`, contains: `"done"`, procedure: `"procedure":"research.conduct"`},
		{name: "research ingest", method: http.MethodPost, path: "/api/research/ingest", body: `{"url":"https://example.com"}`, contains: `"ingested"`, procedure: `"procedure":"research.ingest"`},
		{name: "research recursive", method: http.MethodPost, path: "/api/research/recursive", body: `{"topic":"mcp","depth":2,"maxBreadth":3}`, contains: `"topic":"mcp"`, procedure: `"procedure":"research.recursiveResearch"`},
		{name: "research queries", method: http.MethodGet, path: "/api/research/queries?topic=mcp%20bridges", contains: `"mcp bridges"`, procedure: `"procedure":"research.generateQueries"`},
		{name: "research queue", method: http.MethodGet, path: "/api/research/queue", contains: `"pending":2`, procedure: `"procedure":"research.ingestionQueue"`},
		{name: "research retry failed", method: http.MethodPost, path: "/api/research/retry-failed", body: `{"url":"https://example.com"}`, contains: `"success":true`, procedure: `"procedure":"research.retryFailed"`},
		{name: "research retry all", method: http.MethodPost, path: "/api/research/retry-all-failed", body: `{}`, contains: `"moved":2`, procedure: `"procedure":"research.retryAllFailed"`},
		{name: "research enqueue", method: http.MethodPost, path: "/api/research/enqueue", body: `{"url":"https://example.com","source":"dashboard-reader"}`, contains: `"queued":true`, procedure: `"procedure":"research.enqueuePending"`},
		{name: "pulse events", method: http.MethodGet, path: "/api/pulse/events?limit=5&afterTimestamp=100", contains: `"timestamp":123`, procedure: `"procedure":"pulse.getLatestEvents"`},
		{name: "pulse status", method: http.MethodGet, path: "/api/pulse/status", contains: `"status":"online"`, procedure: `"procedure":"pulse.getSystemStatus"`},
		{name: "pulse providers", method: http.MethodGet, path: "/api/pulse/providers", contains: `"ollama":true`, procedure: `"procedure":"pulse.checkLocalProviders"`},
		{name: "session export", method: http.MethodPost, path: "/api/session-export/export", body: `{"format":"json","includeMemories":true,"includeLogs":true,"includeMetadata":true}`, contains: `"export-1"`, procedure: `"procedure":"sessionExport.export"`},
		{name: "session import", method: http.MethodPost, path: "/api/session-export/import", body: `{"data":"{}","merge":true,"dryRun":true}`, contains: `"imported":1`, procedure: `"procedure":"sessionExport.import"`},
		{name: "session detect format", method: http.MethodPost, path: "/api/session-export/detect-format", body: `{"data":"{\"version\":\"1.0\",\"sessions\":[]}"}`, contains: `"borg-export"`, procedure: `"procedure":"sessionExport.detectFormat"`},
		{name: "session known formats", method: http.MethodGet, path: "/api/session-export/formats", contains: `"type":"borg"`, procedure: `"procedure":"sessionExport.knownFormats"`},
		{name: "session export history", method: http.MethodGet, path: "/api/session-export/history", contains: `"export-1"`, procedure: `"procedure":"sessionExport.history"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestUIHelperBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/browserExtension.saveMemory":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "mem-1", "deduplicated": false}}}})
		case "/trpc/browserExtension.parseDom":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"wordCount": 12}}}})
		case "/trpc/browserExtension.listMemories":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"search":"mcp"`) {
				t.Fatalf("expected browserExtension.listMemories payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"items": []any{map[string]any{"id": "mem-1"}}, "total": 1}}}})
		case "/trpc/browserExtension.deleteMemory":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"deleted": true}}}})
		case "/trpc/browserExtension.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"totalMemories": 1}}}})
		case "/trpc/openWebUI.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"status": "active"}}}})
		case "/trpc/openWebUI.getEmbedUrl":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"url": "http://localhost:8080"}}}})
		case "/trpc/codeMode.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true}}}})
		case "/trpc/codeMode.enable":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true}}}})
		case "/trpc/codeMode.disable":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": false}}}})
		case "/trpc/codeMode.execute":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/submodule.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"path": "submodules/hypercode"}}}}})
		case "/trpc/submodule.updateAll":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/submodule.installDependencies":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/submodule.build":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/submodule.enable":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/submodule.detectCapabilities":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"path":"submodules/hypercode"`) {
				t.Fatalf("expected submodule.detectCapabilities payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"caps": []any{"build"}}}}})
		case "/trpc/suggestions.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sug-1"}}}}})
		case "/trpc/suggestions.resolve":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sug-1", "status": "APPROVED"}}}})
		case "/trpc/suggestions.clearAll":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/plan.getMode":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"mode": "PLAN"}}}})
		case "/trpc/plan.setMode":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"mode": "BUILD"}}}})
		case "/trpc/plan.getDiffs":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "diff-1"}}}}})
		case "/trpc/plan.approveDiff":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/plan.rejectDiff":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/plan.applyAll":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"applied": 1}}}})
		case "/trpc/plan.getSummary":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"pending": 1}}}})
		case "/trpc/plan.getCheckpoints":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "cp-1"}}}}})
		case "/trpc/plan.createCheckpoint":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "cp-1"}}}})
		case "/trpc/plan.rollback":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/plan.clear":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "browser save memory", method: http.MethodPost, path: "/api/browser-extension/save-memory", body: `{"url":"https://example.com","title":"Example","content":"Hello world"}`, contains: `"mem-1"`, procedure: `"procedure":"browserExtension.saveMemory"`},
		{name: "browser parse dom", method: http.MethodPost, path: "/api/browser-extension/parse-dom", body: `{"url":"https://example.com","html":"<html><body>Hello</body></html>"}`, contains: `"wordCount":12`, procedure: `"procedure":"browserExtension.parseDom"`},
		{name: "browser list memories", method: http.MethodGet, path: "/api/browser-extension/memories?search=mcp&tag=tool&limit=10&offset=0", contains: `"total":1`, procedure: `"procedure":"browserExtension.listMemories"`},
		{name: "browser delete memory", method: http.MethodPost, path: "/api/browser-extension/delete-memory", body: `{"id":"mem-1"}`, contains: `"deleted":true`, procedure: `"procedure":"browserExtension.deleteMemory"`},
		{name: "browser stats", method: http.MethodGet, path: "/api/browser-extension/stats", contains: `"totalMemories":1`, procedure: `"procedure":"browserExtension.stats"`},
		{name: "openwebui status", method: http.MethodGet, path: "/api/open-webui/status", contains: `"status":"active"`, procedure: `"procedure":"openWebUI.getStatus"`},
		{name: "openwebui embed", method: http.MethodGet, path: "/api/open-webui/embed-url", contains: `"http://localhost:8080"`, procedure: `"procedure":"openWebUI.getEmbedUrl"`},
		{name: "code mode status", method: http.MethodGet, path: "/api/code-mode/status", contains: `"enabled":true`, procedure: `"procedure":"codeMode.getStatus"`},
		{name: "code mode enable", method: http.MethodPost, path: "/api/code-mode/enable", body: `{}`, contains: `"enabled":true`, procedure: `"procedure":"codeMode.enable"`},
		{name: "code mode disable", method: http.MethodPost, path: "/api/code-mode/disable", body: `{}`, contains: `"enabled":false`, procedure: `"procedure":"codeMode.disable"`},
		{name: "code mode execute", method: http.MethodPost, path: "/api/code-mode/execute", body: `{"code":"return 1;"}`, contains: `"success":true`, procedure: `"procedure":"codeMode.execute"`},
		{name: "submodule list", method: http.MethodGet, path: "/api/submodules", contains: `"submodules/hypercode"`, procedure: `"procedure":"submodule.list"`},
		{name: "submodule update all", method: http.MethodPost, path: "/api/submodules/update-all", body: `{}`, contains: `"success":true`, procedure: `"procedure":"submodule.updateAll"`},
		{name: "submodule install deps", method: http.MethodPost, path: "/api/submodules/install-dependencies", body: `{"path":"submodules/hypercode"}`, contains: `"success":true`, procedure: `"procedure":"submodule.installDependencies"`},
		{name: "submodule build", method: http.MethodPost, path: "/api/submodules/build", body: `{"path":"submodules/hypercode"}`, contains: `"success":true`, procedure: `"procedure":"submodule.build"`},
		{name: "submodule enable", method: http.MethodPost, path: "/api/submodules/enable", body: `{"path":"submodules/hypercode"}`, contains: `"success":true`, procedure: `"procedure":"submodule.enable"`},
		{name: "submodule capabilities", method: http.MethodGet, path: "/api/submodules/capabilities?path=submodules%2Fhypercode", contains: `"build"`, procedure: `"procedure":"submodule.detectCapabilities"`},
		{name: "suggestions list", method: http.MethodGet, path: "/api/suggestions", contains: `"sug-1"`, procedure: `"procedure":"suggestions.list"`},
		{name: "suggestions resolve", method: http.MethodPost, path: "/api/suggestions/resolve", body: `{"id":"sug-1","status":"APPROVED"}`, contains: `"APPROVED"`, procedure: `"procedure":"suggestions.resolve"`},
		{name: "suggestions clear", method: http.MethodPost, path: "/api/suggestions/clear", body: `{}`, contains: `"data":true`, procedure: `"procedure":"suggestions.clearAll"`},
		{name: "plan mode get", method: http.MethodGet, path: "/api/plan/mode", contains: `"mode":"PLAN"`, procedure: `"procedure":"plan.getMode"`},
		{name: "plan mode set", method: http.MethodPost, path: "/api/plan/mode", body: `{"mode":"BUILD"}`, contains: `"mode":"BUILD"`, procedure: `"procedure":"plan.setMode"`},
		{name: "plan diffs", method: http.MethodGet, path: "/api/plan/diffs", contains: `"diff-1"`, procedure: `"procedure":"plan.getDiffs"`},
		{name: "plan approve diff", method: http.MethodPost, path: "/api/plan/approve-diff", body: `{"diffId":"diff-1"}`, contains: `"data":true`, procedure: `"procedure":"plan.approveDiff"`},
		{name: "plan reject diff", method: http.MethodPost, path: "/api/plan/reject-diff", body: `{"diffId":"diff-1"}`, contains: `"data":true`, procedure: `"procedure":"plan.rejectDiff"`},
		{name: "plan apply all", method: http.MethodPost, path: "/api/plan/apply-all", body: `{}`, contains: `"applied":1`, procedure: `"procedure":"plan.applyAll"`},
		{name: "plan summary", method: http.MethodGet, path: "/api/plan/summary", contains: `"pending":1`, procedure: `"procedure":"plan.getSummary"`},
		{name: "plan checkpoints", method: http.MethodGet, path: "/api/plan/checkpoints", contains: `"cp-1"`, procedure: `"procedure":"plan.getCheckpoints"`},
		{name: "plan checkpoint create", method: http.MethodPost, path: "/api/plan/create-checkpoint", body: `{"name":"checkpoint-1","description":"desc"}`, contains: `"cp-1"`, procedure: `"procedure":"plan.createCheckpoint"`},
		{name: "plan rollback", method: http.MethodPost, path: "/api/plan/rollback", body: `{"checkpointId":"cp-1"}`, contains: `"data":true`, procedure: `"procedure":"plan.rollback"`},
		{name: "plan clear", method: http.MethodPost, path: "/api/plan/clear", body: `{}`, contains: `"success":true`, procedure: `"procedure":"plan.clear"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
	}
}

func TestKnowledgeAndChainingBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/knowledge.getGraph":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"mcp"`) {
				t.Fatalf("expected knowledge.getGraph payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"nodes": []any{map[string]any{"id": "n1"}}}}}})
		case "/trpc/knowledge.getStats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"count": 3}}}})
		case "/trpc/knowledge.ingest":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/knowledge.getResources":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"categories": []any{}}}}})
		case "/trpc/rag.ingestFile":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "chunksIngested": 4}}}})
		case "/trpc/rag.ingestText":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "chunksIngested": 2}}}})
		case "/trpc/unifiedDirectory.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"search":"mcp"`) {
				t.Fatalf("expected unifiedDirectory.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"items": []any{map[string]any{"id": "dir-1"}}, "total": 1}}}})
		case "/trpc/unifiedDirectory.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"combined_total": 9}}}})
		case "/trpc/toolChaining.listAliases":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"alias": "search"}}}}})
		case "/trpc/toolChaining.createAlias":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"alias": "search"}}}})
		case "/trpc/toolChaining.removeAlias":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"removed": true}}}})
		case "/trpc/toolChaining.resolveAlias":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"search"`) {
				t.Fatalf("expected toolChaining.resolveAlias payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"resolved": true}}}})
		case "/trpc/toolChaining.listChains":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "chain-1"}}}}})
		case "/trpc/toolChaining.getChain":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"chain-1"`) {
				t.Fatalf("expected toolChaining.getChain payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "chain-1"}}}})
		case "/trpc/toolChaining.createChain":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "chain-1"}}}})
		case "/trpc/toolChaining.executeChain":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "stepsCompleted": 1}}}})
		case "/trpc/toolChaining.deleteChain":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"deleted": true}}}})
		case "/trpc/toolChaining.lazyStates":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"toolName": "search"}}}}})
		case "/trpc/toolChaining.registerLazy":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"toolName": "search"}}}})
		case "/trpc/toolChaining.markLoaded":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"loaded": true}}}})
		case "/trpc/browserControls.scrape":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"title": "Example"}}}})
		case "/trpc/browserControls.pushHistory":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"stored": 1}}}})
		case "/trpc/browserControls.queryHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"domain":"example.com"`) {
				t.Fatalf("expected browserControls.queryHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"entries": []any{map[string]any{"url": "https://example.com"}}, "total": 1}}}})
		case "/trpc/browserControls.pushConsoleLogs":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"stored": 1}}}})
		case "/trpc/browserControls.queryConsoleLogs":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"search":"err"`) {
				t.Fatalf("expected browserControls.queryConsoleLogs payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"logs": []any{map[string]any{"message": "error"}}, "total": 1}}}})
		case "/trpc/browserControls.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"historyCount": 1}}}})
		default:
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	cases := []struct {
		name      string
		method    string
		path      string
		body      string
		contains  string
		procedure string
	}{
		{name: "knowledge graph", method: http.MethodGet, path: "/api/knowledge/graph?query=mcp&depth=2", contains: `"n1"`, procedure: `"procedure":"knowledge.getGraph"`},
		{name: "knowledge stats", method: http.MethodGet, path: "/api/knowledge/stats", contains: `"count":3`, procedure: `"procedure":"knowledge.getStats"`},
		{name: "knowledge ingest", method: http.MethodPost, path: "/api/knowledge/ingest", body: `{"url":"https://example.com"}`, contains: `"success":true`, procedure: `"procedure":"knowledge.ingest"`},
		{name: "knowledge resources", method: http.MethodGet, path: "/api/knowledge/resources", contains: `"categories"`, procedure: `"procedure":"knowledge.getResources"`},
		{name: "rag ingest file", method: http.MethodPost, path: "/api/rag/file", body: `{"filePath":"README.md","userId":"default"}`, contains: `"chunksIngested":4`, procedure: `"procedure":"rag.ingestFile"`},
		{name: "rag ingest text", method: http.MethodPost, path: "/api/rag/text", body: `{"text":"hello","sourceName":"note","userId":"default"}`, contains: `"chunksIngested":2`, procedure: `"procedure":"rag.ingestText"`},
		{name: "directory list", method: http.MethodGet, path: "/api/directory?limit=10&offset=0&search=mcp&source=all&show_duplicates=true&duplicates_only=false&research_status=pending", contains: `"dir-1"`, procedure: `"procedure":"unifiedDirectory.list"`},
		{name: "directory stats", method: http.MethodGet, path: "/api/directory/stats", contains: `"combined_total":9`, procedure: `"procedure":"unifiedDirectory.stats"`},
		{name: "tool aliases", method: http.MethodGet, path: "/api/tool-chains/aliases", contains: `"search"`, procedure: `"procedure":"toolChaining.listAliases"`},
		{name: "tool alias create", method: http.MethodPost, path: "/api/tool-chains/aliases/create", body: `{"serverId":"srv-1","originalName":"search_tools","alias":"search"}`, contains: `"alias":"search"`, procedure: `"procedure":"toolChaining.createAlias"`},
		{name: "tool alias remove", method: http.MethodPost, path: "/api/tool-chains/aliases/remove", body: `{"alias":"search"}`, contains: `"removed":true`, procedure: `"procedure":"toolChaining.removeAlias"`},
		{name: "tool alias resolve", method: http.MethodGet, path: "/api/tool-chains/aliases/resolve?name=search", contains: `"resolved":true`, procedure: `"procedure":"toolChaining.resolveAlias"`},
		{name: "tool chains list", method: http.MethodGet, path: "/api/tool-chains", contains: `"chain-1"`, procedure: `"procedure":"toolChaining.listChains"`},
		{name: "tool chains get", method: http.MethodGet, path: "/api/tool-chains/get?id=chain-1", contains: `"chain-1"`, procedure: `"procedure":"toolChaining.getChain"`},
		{name: "tool chains create", method: http.MethodPost, path: "/api/tool-chains/create", body: `{"name":"chain","steps":[{"toolName":"search"}]}`, contains: `"chain-1"`, procedure: `"procedure":"toolChaining.createChain"`},
		{name: "tool chains execute", method: http.MethodPost, path: "/api/tool-chains/execute", body: `{"chainId":"chain-1","initialInput":{"q":"mcp"}}`, contains: `"stepsCompleted":1`, procedure: `"procedure":"toolChaining.executeChain"`},
		{name: "tool chains delete", method: http.MethodPost, path: "/api/tool-chains/delete", body: `{"id":"chain-1"}`, contains: `"deleted":true`, procedure: `"procedure":"toolChaining.deleteChain"`},
		{name: "tool chains lazy", method: http.MethodGet, path: "/api/tool-chains/lazy", contains: `"toolName":"search"`, procedure: `"procedure":"toolChaining.lazyStates"`},
		{name: "tool chains register lazy", method: http.MethodPost, path: "/api/tool-chains/lazy/register", body: `{"serverId":"srv-1","toolName":"search"}`, contains: `"toolName":"search"`, procedure: `"procedure":"toolChaining.registerLazy"`},
		{name: "tool chains mark loaded", method: http.MethodPost, path: "/api/tool-chains/lazy/mark-loaded", body: `{"serverId":"srv-1","toolName":"search","loadTimeMs":12}`, contains: `"loaded":true`, procedure: `"procedure":"toolChaining.markLoaded"`},
		{name: "browser controls scrape", method: http.MethodPost, path: "/api/browser-controls/scrape", body: `{"url":"https://example.com"}`, contains: `"Example"`, procedure: `"procedure":"browserControls.scrape"`},
		{name: "browser controls push history", method: http.MethodPost, path: "/api/browser-controls/history/push", body: `{"entries":[{"url":"https://example.com","title":"Example","visitedAt":1,"visitCount":1}]}`, contains: `"stored":1`, procedure: `"procedure":"browserControls.pushHistory"`},
		{name: "browser controls query history", method: http.MethodGet, path: "/api/browser-controls/history/query?query=example&limit=10&since=1&domain=example.com", contains: `"total":1`, procedure: `"procedure":"browserControls.queryHistory"`},
		{name: "browser controls push logs", method: http.MethodPost, path: "/api/browser-controls/logs/push", body: `{"logs":[{"level":"error","message":"err","source":"console","timestamp":1}]}`, contains: `"stored":1`, procedure: `"procedure":"browserControls.pushConsoleLogs"`},
		{name: "browser controls query logs", method: http.MethodGet, path: "/api/browser-controls/logs/query?level=error&search=err&limit=10", contains: `"error"`, procedure: `"procedure":"browserControls.queryConsoleLogs"`},
		{name: "browser controls stats", method: http.MethodGet, path: "/api/browser-controls/stats", contains: `"historyCount":1`, procedure: `"procedure":"browserControls.stats"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var body io.Reader
			if tc.body != "" {
				body = strings.NewReader(tc.body)
			}
			request := httptest.NewRequest(tc.method, tc.path, body)
			if tc.body != "" {
				request.Header.Set("content-type", "application/json")
			}
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.contains) {
				t.Fatalf("expected response to contain %s, got %s", tc.contains, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), tc.procedure) {
				t.Fatalf("expected bridge metadata %s, got %s", tc.procedure, recorder.Body.String())
			}
		})
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

	var payload struct {
		Success bool                `json:"success"`
		Data    []controlplane.Tool `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 CLI tool, got %d", len(payload.Data))
	}
	if payload.Data[0].Type != "go" || payload.Data[0].Name != "Go" {
		t.Fatalf("expected Go tool identity, got %+v", payload.Data[0])
	}
	if payload.Data[0].Command != "go" || !payload.Data[0].Available {
		t.Fatalf("expected available go command, got %+v", payload.Data[0])
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

	var payload struct {
		Success bool                         `json:"success"`
		Data    []interop.ControlPlaneStatus `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if len(payload.Data) != 2 {
		t.Fatalf("expected 2 runtime lock slots, got %d", len(payload.Data))
	}
	if payload.Data[0].Name != "borg-node" {
		t.Fatalf("expected borg-node first lock slot, got %+v", payload.Data[0])
	}
	if payload.Data[0].LockPath != cfg.MainLockPath() {
		t.Fatalf("expected main lock path %s, got %s", cfg.MainLockPath(), payload.Data[0].LockPath)
	}
	if !payload.Data[0].Running || payload.Data[0].Host != "127.0.0.1" || payload.Data[0].Port != 4000 {
		t.Fatalf("expected seeded main lock details, got %+v", payload.Data[0])
	}
	if payload.Data[0].Version != "0.99.1" || payload.Data[0].StartedAt != "2026-03-28T00:00:00Z" {
		t.Fatalf("expected seeded main lock metadata, got %+v", payload.Data[0])
	}
	if payload.Data[1].Name != "borg-go" {
		t.Fatalf("expected borg-go second lock slot, got %+v", payload.Data[1])
	}
	if payload.Data[1].LockPath != cfg.LockPath() {
		t.Fatalf("expected go lock path %s, got %s", cfg.LockPath(), payload.Data[1].LockPath)
	}
	if payload.Data[1].Running {
		t.Fatalf("expected borg-go lock slot to be absent, got %+v", payload.Data[1])
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

	var payload struct {
		Success bool `json:"success"`
		Data    struct {
			Path      string `json:"path"`
			Available bool   `json:"available"`
			Content   string `json:"content"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if !payload.Data.Available {
		t.Fatalf("expected imported instructions to be available, got %s", recorder.Body.String())
	}
	if payload.Data.Path != docPath {
		t.Fatalf("expected imported instructions path %s, got %s", docPath, payload.Data.Path)
	}
	if !strings.Contains(payload.Data.Content, "Auto-imported Agent Instructions") {
		t.Fatalf("expected imported instructions content in payload, got %s", recorder.Body.String())
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

	var payload struct {
		Success bool                      `json:"success"`
		Data    []sessionimport.Candidate `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 import source candidate, got %d", len(payload.Data))
	}
	if payload.Data[0].SourceTool != "claude-code" || payload.Data[0].SessionFormat != "jsonl" {
		t.Fatalf("expected claude-code jsonl candidate, got %+v", payload.Data[0])
	}
	if payload.Data[0].SourcePath != claudePath {
		t.Fatalf("expected source path %s, got %s", claudePath, payload.Data[0].SourcePath)
	}
	if payload.Data[0].EstimatedSize <= 0 {
		t.Fatalf("expected positive estimated size, got %+v", payload.Data[0])
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

	var payload struct {
		Success bool                       `json:"success"`
		Data    []sessionimport.RootStatus `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if len(payload.Data) == 0 {
		t.Fatalf("expected at least one import root, got 0")
	}
	if payload.Data[0].SourceTool != "claude-code" {
		t.Fatalf("expected first root to be claude-code, got %+v", payload.Data[0])
	}
	if payload.Data[0].RootPath != claudeRoot {
		t.Fatalf("expected claude root path %s, got %s", claudeRoot, payload.Data[0].RootPath)
	}
	if !payload.Data[0].Exists {
		t.Fatalf("expected claude root to exist, got %+v", payload.Data[0])
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
