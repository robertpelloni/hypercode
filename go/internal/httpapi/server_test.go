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
			if !strings.Contains(string(body), `"name":"search_tools"`) {
				t.Fatalf("expected tool name in bridged callTool body, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"ok": true,
							"result": map[string]any{
								"content": []map[string]any{{"type": "text", "text": "done"}},
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

	server := New(config.Default(), stubDetector{})

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
		{name: "get preferences", method: http.MethodGet, path: "/api/mcp/preferences", contains: "\"importantTools\":[\"search_tools\"]", procedure: "\"procedure\":\"mcp.getToolPreferences\""},
		{name: "set preferences", method: http.MethodPost, path: "/api/mcp/preferences", body: `{"importantTools":["search_tools"]}`, contains: "\"ok\":true", procedure: "\"procedure\":\"mcp.setToolPreferences\""},
		{name: "working set", method: http.MethodGet, path: "/api/mcp/working-set", contains: "\"hydrated\":true", procedure: "\"procedure\":\"mcp.getWorkingSet\""},
		{name: "load tool", method: http.MethodPost, path: "/api/mcp/working-set/load", body: `{"name":"search_tools"}`, contains: "\"message\":\"loaded\"", procedure: "\"procedure\":\"mcp.loadTool\""},
		{name: "unload tool", method: http.MethodPost, path: "/api/mcp/working-set/unload", body: `{"name":"search_tools"}`, contains: "\"message\":\"unloaded\"", procedure: "\"procedure\":\"mcp.unloadTool\""},
		{name: "tool schema", method: http.MethodPost, path: "/api/mcp/tools/schema", body: `{"name":"search_tools"}`, contains: "\"inputSchema\"", procedure: "\"procedure\":\"mcp.getToolSchema\""},
		{name: "status", method: http.MethodGet, path: "/api/mcp/status", contains: "\"connected\":true", procedure: "\"procedure\":\"mcp.getStatus\""},
		{name: "runtime servers", method: http.MethodGet, path: "/api/mcp/servers/runtime", contains: "\"runtimeConnected\":true", procedure: "\"procedure\":\"mcp.listServers\""},
		{name: "configured servers", method: http.MethodGet, path: "/api/mcp/servers/configured", contains: "\"uuid\":\"srv-1\"", procedure: "\"procedure\":\"mcpServers.list\""},
		{name: "registry snapshot", method: http.MethodGet, path: "/api/mcp/servers/registry-snapshot", contains: "\"Core MCP\"", procedure: "\"procedure\":\"mcpServers.registrySnapshot\""},
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
