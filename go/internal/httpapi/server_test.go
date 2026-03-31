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

	"github.com/borghq/hypercode-go/internal/config"
	"github.com/borghq/hypercode-go/internal/controlplane"
	"github.com/borghq/hypercode-go/internal/interop"
	"github.com/borghq/hypercode-go/internal/lockfile"
	"github.com/borghq/hypercode-go/internal/memorystore"
	"github.com/borghq/hypercode-go/internal/providers"
	"github.com/borghq/hypercode-go/internal/sessionimport"
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
		case "/trpc/mesh.broadcast":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read mesh broadcast body: %v", err)
			}
			if !strings.Contains(string(body), `"type":"DIRECT_MESSAGE"`) {
				t.Fatalf("expected mesh broadcast payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"success": true,
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

	broadcastRequest := httptest.NewRequest(http.MethodPost, "/api/mesh/broadcast", strings.NewReader(`{"type":"DIRECT_MESSAGE","payload":{"message":"hello"}}`))
	broadcastRequest.Header.Set("content-type", "application/json")
	broadcastRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(broadcastRecorder, broadcastRequest)
	if broadcastRecorder.Code != http.StatusOK {
		t.Fatalf("expected mesh broadcast 200, got %d", broadcastRecorder.Code)
	}
	if !strings.Contains(broadcastRecorder.Body.String(), "\"procedure\":\"mesh.broadcast\"") {
		t.Fatalf("expected mesh broadcast bridge metadata, got %s", broadcastRecorder.Body.String())
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

func TestSessionContextEndpoint(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/trpc/health":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"status": "ok"}}},
			})
		case "/trpc/session.catalog":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"sessions": []any{}}}},
			})
		case "/trpc/memory.getSessionBootstrap":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{
					"goal":                   "ship the go sidecar",
					"objective":              "surface current context",
					"summaryCount":           2,
					"observationCount":       3,
					"toolAdvertisementCount": 1,
					"prompt":                 "Memory bootstrap:\nCurrent goal: ship the go sidecar",
				}}},
			})
		case "/trpc/mcp.searchTools":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read searchTools body: %v", err)
			}
			if !strings.Contains(string(body), `"query":"surface current context ship the go sidecar"`) || !strings.Contains(string(body), `"profile":"repo-coding"`) {
				t.Fatalf("expected contextual searchTools payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []map[string]any{
					{"name": "search_tools", "alwaysShow": true, "matchReason": "recommended for the current topic"},
				}}},
			})
		case "/trpc/mcp.callTool":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read callTool body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"list_all_tools"`) || !strings.Contains(string(body), `"query":"surface current context ship the go sidecar"`) {
				t.Fatalf("expected list_all_tools payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{
					"ok": true,
					"result": map[string]any{
						"content": []map[string]any{{"type": "text", "text": "list_all_tools"}},
					},
				}}},
			})
		case "/trpc/mesh.getCapabilities":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{}}},
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
	request := httptest.NewRequest(http.MethodGet, "/api/sessions/context?activeGoal=ship%20the%20go%20sidecar&lastObjective=surface%20current%20context", nil)
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected session context 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"startup\"") {
		t.Fatalf("expected startup payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"Memory bootstrap:\\nCurrent goal: ship the go sidecar\"") {
		t.Fatalf("expected bootstrap prompt, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"recommendedTools\"") || !strings.Contains(recorder.Body.String(), "\"procedure\":\"mcp.searchTools\"") {
		t.Fatalf("expected recommended tools payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"toolName\":\"list_all_tools\"") {
		t.Fatalf("expected tool ads bridge metadata, got %s", recorder.Body.String())
	}
}

func TestToolsContextEndpoint(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/trpc/health":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"status": "ok"}}},
			})
		case "/trpc/session.catalog":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"sessions": []any{}}}},
			})
		case "/trpc/memory.getToolContext":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{
					"toolName":         "search_tools",
					"query":            "search_tools borg go session",
					"matchedPaths":     []string{"go/internal/httpapi/server.go"},
					"observationCount": 2,
					"summaryCount":     1,
					"prompt":           "JIT tool context for search_tools:",
				}}},
			})
		case "/trpc/mcp.searchTools":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read searchTools body: %v", err)
			}
			if !strings.Contains(string(body), `"query":"search_tools borg go session"`) || !strings.Contains(string(body), `"profile":"repo-coding"`) {
				t.Fatalf("expected contextual searchTools payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []map[string]any{
					{"name": "search_tools", "alwaysShow": true, "matchReason": "recommended for the current topic"},
				}}},
			})
		case "/trpc/mcp.callTool":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read callTool body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"list_all_tools"`) || !strings.Contains(string(body), `"query":"search_tools borg go session"`) {
				t.Fatalf("expected list_all_tools payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{
					"ok": true,
					"result": map[string]any{
						"content": []map[string]any{{"type": "text", "text": "list_all_tools"}},
					},
				}}},
			})
		case "/trpc/mesh.getCapabilities":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{}}},
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
	request := httptest.NewRequest(http.MethodGet, "/api/tools/context?toolName=search_tools&activeGoal=ship%20go%20parity&lastObjective=surface%20jit%20tool%20context", nil)
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected tools context 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"toolContext\"") {
		t.Fatalf("expected toolContext payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"JIT tool context for search_tools:\"") {
		t.Fatalf("expected tool context prompt, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"recommendedTools\"") || !strings.Contains(recorder.Body.String(), "\"procedure\":\"mcp.searchTools\"") {
		t.Fatalf("expected recommended tools bridge payload, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "\"toolName\":\"list_all_tools\"") {
		t.Fatalf("expected related tools bridge metadata, got %s", recorder.Body.String())
	}
}

func TestAutonomyBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/autonomy.getLevel":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "medium"}},
			})
		case "/trpc/autonomy.setLevel":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"level":"high"`) {
				t.Fatalf("expected autonomy.setLevel payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "high"}},
			})
		case "/trpc/autonomy.activateFullAutonomy":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "Autonomous Supervisor Activated (High Level + Chat Daemon + Watchdog)"}},
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
		{name: "autonomy get level", method: http.MethodGet, path: "/api/autonomy/get-level", contains: `"medium"`, procedure: `"procedure":"autonomy.getLevel"`},
		{name: "autonomy set level", method: http.MethodPost, path: "/api/autonomy/set-level", body: `{"level":"high"}`, contains: `"high"`, procedure: `"procedure":"autonomy.setLevel"`},
		{name: "autonomy activate full", method: http.MethodPost, path: "/api/autonomy/activate-full", body: `null`, contains: `"Autonomous Supervisor Activated`, procedure: `"procedure":"autonomy.activateFullAutonomy"`},
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

			var payload struct {
				Success bool            `json:"success"`
				Data    json.RawMessage `json:"data"`
				Bridge  struct {
					Procedure string `json:"procedure"`
				} `json:"bridge"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
				t.Fatalf("expected JSON payload, got decode error: %v", err)
			}
			if !payload.Success {
				t.Fatalf("expected success payload, got %s", recorder.Body.String())
			}

			switch tc.name {
			case "list tools":
				var tools []map[string]any
				if err := json.Unmarshal(payload.Data, &tools); err != nil {
					t.Fatalf("expected tools payload, got decode error: %v", err)
				}
				if len(tools) != 1 || tools[0]["name"] != "search_tools" || tools[0]["server"] != "core" {
					t.Fatalf("expected single core search_tools entry, got %+v", tools)
				}
			case "search tools":
				var tools []map[string]any
				if err := json.Unmarshal(payload.Data, &tools); err != nil {
					t.Fatalf("expected search results payload, got decode error: %v", err)
				}
				if len(tools) != 1 || tools[0]["name"] != "search_tools" || tools[0]["alwaysShow"] != true {
					t.Fatalf("expected always-show search_tools result, got %+v", tools)
				}
			case "call tool":
				var result struct {
					Ok     bool `json:"ok"`
					Result struct {
						Content []struct {
							Type string `json:"type"`
							Text string `json:"text"`
						} `json:"content"`
					} `json:"result"`
				}
				if err := json.Unmarshal(payload.Data, &result); err != nil {
					t.Fatalf("expected tool call payload, got decode error: %v", err)
				}
				if !result.Ok || len(result.Result.Content) != 1 || result.Result.Content[0].Text != "done" {
					t.Fatalf("expected successful tool call result, got %+v", result)
				}
			case "auto call tool":
				var result struct {
					Ok     bool `json:"ok"`
					Result struct {
						Content []struct {
							Type string `json:"type"`
							Text string `json:"text"`
						} `json:"content"`
					} `json:"result"`
				}
				if err := json.Unmarshal(payload.Data, &result); err != nil {
					t.Fatalf("expected auto tool call payload, got decode error: %v", err)
				}
				if payload.Bridge.Procedure != "mcp.callTool" || !result.Ok || len(result.Result.Content) != 1 || result.Result.Content[0].Text != "auto_call_tool" {
					t.Fatalf("expected successful auto_call_tool bridge result, got bridge=%+v data=%+v", payload.Bridge, result)
				}
			case "tool advertisements":
				var result struct {
					RecommendedTools []map[string]any `json:"recommendedTools"`
					RelatedTools     struct {
						Ok     bool `json:"ok"`
						Result struct {
							Content []struct {
								Type string `json:"type"`
								Text string `json:"text"`
							} `json:"content"`
						} `json:"result"`
					} `json:"relatedTools"`
				}
				if err := json.Unmarshal(payload.Data, &result); err != nil {
					t.Fatalf("expected tool advertisement payload, got decode error: %v", err)
				}
				if len(result.RecommendedTools) != 1 || result.RecommendedTools[0]["name"] != "search_tools" {
					t.Fatalf("expected recommended search_tools payload, got %+v", result.RecommendedTools)
				}
				if !result.RelatedTools.Ok || len(result.RelatedTools.Result.Content) != 1 || result.RelatedTools.Result.Content[0].Text != "list_all_tools" {
					t.Fatalf("expected list_all_tools advertisement payload, got %+v", result)
				}
				if !strings.Contains(recorder.Body.String(), "\"procedure\":\"mcp.searchTools\"") || !strings.Contains(recorder.Body.String(), "\"toolName\":\"list_all_tools\"") {
					t.Fatalf("expected mixed bridge metadata for tool advertisements, got %s", recorder.Body.String())
				}
			}
		})
	}
}

func TestDirectorBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/director.memorize":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "Memorized."}},
			})
		case "/trpc/director.chat":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"message":"status?"`) {
				t.Fatalf("expected director.chat payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "Director online"}},
			})
		case "/trpc/director.status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"status": "online"}}},
			})
		case "/trpc/director.updateConfig":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/directorConfig.get":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"persona": "professional", "defaultTopic": "status"}}},
			})
		case "/trpc/directorConfig.test":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "directorReady": true, "llmServiceReady": true}}},
			})
		case "/trpc/directorConfig.update":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"persona":"chaos"`) {
				t.Fatalf("expected directorConfig.update payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/director.stopAutoDrive":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "Stopped"}},
			})
		case "/trpc/director.startAutoDrive":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": "Started"}},
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
		{name: "director memorize", method: http.MethodPost, path: "/api/director/memorize", body: `{"content":"memo","source":"web","title":"Note"}`, contains: `"Memorized."`, procedure: `"procedure":"director.memorize"`},
		{name: "director chat", method: http.MethodPost, path: "/api/director/chat", body: `{"message":"status?"}`, contains: `"Director online"`, procedure: `"procedure":"director.chat"`},
		{name: "director status", method: http.MethodGet, path: "/api/director/status", contains: `"status":"online"`, procedure: `"procedure":"director.status"`},
		{name: "director update config", method: http.MethodPost, path: "/api/director/config/update", body: `{"defaultTopic":"mcp"}`, contains: `"success":true`, procedure: `"procedure":"director.updateConfig"`},
		{name: "director-config get", method: http.MethodGet, path: "/api/director-config", contains: `"persona":"professional"`, procedure: `"procedure":"directorConfig.get"`},
		{name: "director-config test", method: http.MethodGet, path: "/api/director-config/test", contains: `"directorReady":true`, procedure: `"procedure":"directorConfig.test"`},
		{name: "director-config update", method: http.MethodPost, path: "/api/director-config/update", body: `{"persona":"chaos"}`, contains: `"success":true`, procedure: `"procedure":"directorConfig.update"`},
		{name: "director stop auto drive", method: http.MethodPost, path: "/api/director/auto-drive/stop", body: `null`, contains: `"Stopped"`, procedure: `"procedure":"director.stopAutoDrive"`},
		{name: "director start auto drive", method: http.MethodPost, path: "/api/director/auto-drive/start", body: `null`, contains: `"Started"`, procedure: `"procedure":"director.startAutoDrive"`},
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

func TestAutoDevBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/autoDev.startLoop":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"type":"test"`) {
				t.Fatalf("expected autoDev.startLoop payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "loopId": "loop-1"}}},
			})
		case "/trpc/autoDev.cancelLoop":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"loopId":"loop-1"`) {
				t.Fatalf("expected autoDev.cancelLoop payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": true}},
			})
		case "/trpc/autoDev.getLoops":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "loop-1", "status": "running"}}}},
			})
		case "/trpc/autoDev.getLoop":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"loopId":"loop-1"`) {
				t.Fatalf("expected autoDev.getLoop payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "loop-1", "status": "running"}}},
			})
		case "/trpc/autoDev.clearCompleted":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": 3}},
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
		{name: "autodev start loop", method: http.MethodPost, path: "/api/autodev/start-loop", body: `{"type":"test","maxAttempts":3}`, contains: `"loopId":"loop-1"`, procedure: `"procedure":"autoDev.startLoop"`},
		{name: "autodev cancel loop", method: http.MethodPost, path: "/api/autodev/cancel-loop", body: `{"loopId":"loop-1"}`, contains: `"data":true`, procedure: `"procedure":"autoDev.cancelLoop"`},
		{name: "autodev list loops", method: http.MethodGet, path: "/api/autodev/loops", contains: `"loop-1"`, procedure: `"procedure":"autoDev.getLoops"`},
		{name: "autodev get loop", method: http.MethodGet, path: "/api/autodev/loop?loopId=loop-1", contains: `"status":"running"`, procedure: `"procedure":"autoDev.getLoop"`},
		{name: "autodev clear completed", method: http.MethodPost, path: "/api/autodev/clear-completed", contains: `"data":3`, procedure: `"procedure":"autoDev.clearCompleted"`},
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

func TestDarwinBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/darwin.evolve":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"goal":"Improve prompts"`) {
				t.Fatalf("expected darwin.evolve payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"mutationId": "mut-1"}}},
			})
		case "/trpc/darwin.experiment":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"mutationId":"mut-1"`) {
				t.Fatalf("expected darwin.experiment payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"experimentId": "exp-1"}}},
			})
		case "/trpc/darwin.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"running": true, "experimentCount": 1}}},
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
		{name: "darwin evolve", method: http.MethodPost, path: "/api/darwin/evolve", body: `{"prompt":"Refactor prompt","goal":"Improve prompts"}`, contains: `"mutationId":"mut-1"`, procedure: `"procedure":"darwin.evolve"`},
		{name: "darwin experiment", method: http.MethodPost, path: "/api/darwin/experiment", body: `{"mutationId":"mut-1","task":"Run benchmark"}`, contains: `"experimentId":"exp-1"`, procedure: `"procedure":"darwin.experiment"`},
		{name: "darwin status", method: http.MethodGet, path: "/api/darwin/status", contains: `"running":true`, procedure: `"procedure":"darwin.getStatus"`},
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

func TestCouncilBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.members":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "planner", "provider": "openai", "modelId": "gpt-5", "systemPrompt": "plan"}}}},
			})
		case "/trpc/council.updateMembers":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.sessions.list":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sess-1"}}}},
			})
		case "/trpc/council.sessions.active":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sess-1", "status": "running"}}}},
			})
		case "/trpc/council.sessions.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"total": 1, "active": 1}}},
			})
		case "/trpc/council.sessions.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"sess-1"`) {
				t.Fatalf("expected council.sessions.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1"}}},
			})
		case "/trpc/council.sessions.start":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-2"}}},
			})
		case "/trpc/council.sessions.bulkStart":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"count":2`) {
				t.Fatalf("expected council.sessions.bulkStart payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"sessions": []any{map[string]any{"id": "sess-bulk-1"}, map[string]any{"id": "sess-bulk-2"}}, "failed": []any{}}}},
			})
		case "/trpc/council.sessions.bulkStop":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"stopped": 2, "failed": 0}}},
			})
		case "/trpc/council.sessions.bulkResume":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"sessions": []any{map[string]any{"id": "sess-1"}, map[string]any{"id": "sess-2"}}, "failed": []any{}}}},
			})
		case "/trpc/council.sessions.stop":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1", "status": "stopped"}}},
			})
		case "/trpc/council.sessions.resume":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1", "status": "running"}}},
			})
		case "/trpc/council.sessions.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.sessions.sendGuidance":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"sess-1"`) || !strings.Contains(string(body), `"approved":true`) {
				t.Fatalf("expected council.sessions.sendGuidance payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1", "guidanceApplied": true}}},
			})
		case "/trpc/council.sessions.getLogs":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"sess-1"`) {
				t.Fatalf("expected council.sessions.getLogs payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{"log line"}}},
			})
		case "/trpc/council.sessions.templates":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"name": "default"}}}},
			})
		case "/trpc/council.sessions.startFromTemplate":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"default"`) {
				t.Fatalf("expected council.sessions.startFromTemplate payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-template-started", "templateName": "default"}}},
			})
		case "/trpc/council.sessions.persisted":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sess-persisted", "persisted": true}}}},
			})
		case "/trpc/council.sessions.byTag":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"tag":"priority"`) {
				t.Fatalf("expected council.sessions.byTag payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sess-tagged", "tags": []any{"priority"}}}}},
			})
		case "/trpc/council.sessions.byTemplate":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"template":"default"`) {
				t.Fatalf("expected council.sessions.byTemplate payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sess-template", "templateName": "default"}}}},
			})
		case "/trpc/council.sessions.byCLI":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"cliType":"hypercode"`) {
				t.Fatalf("expected council.sessions.byCLI payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "sess-cli", "cliType": "hypercode"}}}},
			})
		case "/trpc/council.sessions.updateTags":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"sess-1"`) || !strings.Contains(string(body), `"priority"`) {
				t.Fatalf("expected council.sessions.updateTags payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1", "tags": []any{"priority", "go"}}}},
			})
		case "/trpc/council.sessions.addTag":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"sess-1"`) || !strings.Contains(string(body), `"tag":"priority"`) {
				t.Fatalf("expected council.sessions.addTag payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1", "tags": []any{"priority"}}}},
			})
		case "/trpc/council.sessions.removeTag":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"sess-1"`) || !strings.Contains(string(body), `"tag":"priority"`) {
				t.Fatalf("expected council.sessions.removeTag payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "sess-1", "tags": []any{}}}},
			})
		case "/trpc/council.quota.status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true}}},
			})
		case "/trpc/council.quota.getConfig":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"windowMs": 60000}}},
			})
		case "/trpc/council.quota.updateConfig":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.quota.enable":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "enabled": true}}},
			})
		case "/trpc/council.quota.disable":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "enabled": false}}},
			})
		case "/trpc/council.quota.check":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"provider":"openai"`) {
				t.Fatalf("expected council.quota.check payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"allowed": true}}},
			})
		case "/trpc/council.quota.allStats":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"providers": 1}}},
			})
		case "/trpc/council.quota.providerStats":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"provider":"openai"`) {
				t.Fatalf("expected council.quota.providerStats payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"provider": "openai"}}},
			})
		case "/trpc/council.quota.getLimits":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"rpm": 60}}},
			})
		case "/trpc/council.quota.setLimits":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"provider":"openai"`) {
				t.Fatalf("expected council.quota.setLimits payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.quota.resetProvider":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.quota.resetAll":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.quota.unthrottle":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.quota.recordRequest":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/council.quota.recordRateLimitError":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
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
		{name: "council members", method: http.MethodGet, path: "/api/council/members", contains: `"planner"`, procedure: `"procedure":"council.members"`},
		{name: "council update members", method: http.MethodPost, path: "/api/council/members/update", body: `[{"name":"planner","provider":"openai","modelId":"gpt-5","systemPrompt":"plan"}]`, contains: `"success":true`, procedure: `"procedure":"council.updateMembers"`},
		{name: "council sessions list", method: http.MethodGet, path: "/api/council/sessions", contains: `"sess-1"`, procedure: `"procedure":"council.sessions.list"`},
		{name: "council sessions active", method: http.MethodGet, path: "/api/council/sessions/active", contains: `"running"`, procedure: `"procedure":"council.sessions.active"`},
		{name: "council sessions stats", method: http.MethodGet, path: "/api/council/sessions/stats", contains: `"total":1`, procedure: `"procedure":"council.sessions.stats"`},
		{name: "council sessions get", method: http.MethodGet, path: "/api/council/sessions/get?id=sess-1", contains: `"sess-1"`, procedure: `"procedure":"council.sessions.get"`},
		{name: "council sessions start", method: http.MethodPost, path: "/api/council/sessions/start", body: `{"cliType":"hypercode"}`, contains: `"sess-2"`, procedure: `"procedure":"council.sessions.start"`},
		{name: "council sessions bulk start", method: http.MethodPost, path: "/api/council/sessions/bulk-start", body: `{"count":2,"cliType":"hypercode"}`, contains: `"sess-bulk-1"`, procedure: `"procedure":"council.sessions.bulkStart"`},
		{name: "council sessions bulk stop", method: http.MethodPost, path: "/api/council/sessions/bulk-stop", contains: `"stopped":2`, procedure: `"procedure":"council.sessions.bulkStop"`},
		{name: "council sessions bulk resume", method: http.MethodPost, path: "/api/council/sessions/bulk-resume", contains: `"sess-2"`, procedure: `"procedure":"council.sessions.bulkResume"`},
		{name: "council sessions stop", method: http.MethodPost, path: "/api/council/sessions/stop", body: `{"id":"sess-1"}`, contains: `"stopped"`, procedure: `"procedure":"council.sessions.stop"`},
		{name: "council sessions resume", method: http.MethodPost, path: "/api/council/sessions/resume", body: `{"id":"sess-1"}`, contains: `"running"`, procedure: `"procedure":"council.sessions.resume"`},
		{name: "council sessions delete", method: http.MethodPost, path: "/api/council/sessions/delete", body: `{"id":"sess-1"}`, contains: `"success":true`, procedure: `"procedure":"council.sessions.delete"`},
		{name: "council sessions guidance", method: http.MethodPost, path: "/api/council/sessions/guidance", body: `{"id":"sess-1","approved":true,"feedback":"ship it","suggestedNextSteps":["test"]}`, contains: `"guidanceApplied":true`, procedure: `"procedure":"council.sessions.sendGuidance"`},
		{name: "council sessions logs", method: http.MethodGet, path: "/api/council/sessions/logs?id=sess-1", contains: `"log line"`, procedure: `"procedure":"council.sessions.getLogs"`},
		{name: "council sessions templates", method: http.MethodGet, path: "/api/council/sessions/templates", contains: `"default"`, procedure: `"procedure":"council.sessions.templates"`},
		{name: "council sessions from template", method: http.MethodPost, path: "/api/council/sessions/from-template", body: `{"name":"default"}`, contains: `"sess-template-started"`, procedure: `"procedure":"council.sessions.startFromTemplate"`},
		{name: "council sessions persisted", method: http.MethodGet, path: "/api/council/sessions/persisted", contains: `"sess-persisted"`, procedure: `"procedure":"council.sessions.persisted"`},
		{name: "council sessions by tag", method: http.MethodGet, path: "/api/council/sessions/by-tag?tag=priority", contains: `"sess-tagged"`, procedure: `"procedure":"council.sessions.byTag"`},
		{name: "council sessions by template", method: http.MethodGet, path: "/api/council/sessions/by-template?template=default", contains: `"sess-template"`, procedure: `"procedure":"council.sessions.byTemplate"`},
		{name: "council sessions by cli", method: http.MethodGet, path: "/api/council/sessions/by-cli?cliType=hypercode", contains: `"sess-cli"`, procedure: `"procedure":"council.sessions.byCLI"`},
		{name: "council sessions update tags", method: http.MethodPost, path: "/api/council/sessions/tags/update", body: `{"id":"sess-1","tags":["priority","go"]}`, contains: `"priority","go"`, procedure: `"procedure":"council.sessions.updateTags"`},
		{name: "council sessions add tag", method: http.MethodPost, path: "/api/council/sessions/tags/add", body: `{"id":"sess-1","tag":"priority"}`, contains: `"priority"`, procedure: `"procedure":"council.sessions.addTag"`},
		{name: "council sessions remove tag", method: http.MethodPost, path: "/api/council/sessions/tags/remove", body: `{"id":"sess-1","tag":"priority"}`, contains: `"tags":[]`, procedure: `"procedure":"council.sessions.removeTag"`},
		{name: "council quota status", method: http.MethodGet, path: "/api/council/quota/status", contains: `"enabled":true`, procedure: `"procedure":"council.quota.status"`},
		{name: "council quota get config", method: http.MethodGet, path: "/api/council/quota/config", contains: `"windowMs":60000`, procedure: `"procedure":"council.quota.getConfig"`},
		{name: "council quota update config", method: http.MethodPost, path: "/api/council/quota/config", body: `{"windowMs":120000}`, contains: `"success":true`, procedure: `"procedure":"council.quota.updateConfig"`},
		{name: "council quota enable", method: http.MethodPost, path: "/api/council/quota/enabled?enabled=true", body: `null`, contains: `"enabled":true`, procedure: `"procedure":"council.quota.enable"`},
		{name: "council quota disable", method: http.MethodPost, path: "/api/council/quota/enabled?enabled=false", body: `null`, contains: `"enabled":false`, procedure: `"procedure":"council.quota.disable"`},
		{name: "council quota check", method: http.MethodGet, path: "/api/council/quota/check?provider=openai", contains: `"allowed":true`, procedure: `"procedure":"council.quota.check"`},
		{name: "council quota all stats", method: http.MethodGet, path: "/api/council/quota/stats", contains: `"providers":1`, procedure: `"procedure":"council.quota.allStats"`},
		{name: "council quota provider stats", method: http.MethodGet, path: "/api/council/quota/stats?provider=openai", contains: `"provider":"openai"`, procedure: `"procedure":"council.quota.providerStats"`},
		{name: "council quota get limits", method: http.MethodGet, path: "/api/council/quota/limits?provider=openai", contains: `"rpm":60`, procedure: `"procedure":"council.quota.getLimits"`},
		{name: "council quota set limits", method: http.MethodPost, path: "/api/council/quota/limits?provider=openai", body: `{"limits":{"rpm":120}}`, contains: `"success":true`, procedure: `"procedure":"council.quota.setLimits"`},
		{name: "council quota reset provider", method: http.MethodPost, path: "/api/council/quota/reset?provider=openai", body: `null`, contains: `"success":true`, procedure: `"procedure":"council.quota.resetProvider"`},
		{name: "council quota reset all", method: http.MethodPost, path: "/api/council/quota/reset", body: `null`, contains: `"success":true`, procedure: `"procedure":"council.quota.resetAll"`},
		{name: "council quota unthrottle", method: http.MethodPost, path: "/api/council/quota/unthrottle?provider=openai", body: `null`, contains: `"success":true`, procedure: `"procedure":"council.quota.unthrottle"`},
		{name: "council quota record request", method: http.MethodPost, path: "/api/council/quota/record-request", body: `{"provider":"openai","tokensUsed":10}`, contains: `"success":true`, procedure: `"procedure":"council.quota.recordRequest"`},
		{name: "council quota rate limit error", method: http.MethodPost, path: "/api/council/quota/rate-limit-error", body: `{"provider":"openai"}`, contains: `"success":true`, procedure: `"procedure":"council.quota.recordRateLimitError"`},
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

func TestDeerFlowBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/deerFlow.status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"active": true}}},
			})
		case "/trpc/deerFlow.models":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"models": []any{"deepseek-chat", "gpt-4.1"}}}},
			})
		case "/trpc/deerFlow.skills":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"skills": []any{"research", "summarize"}}}},
			})
		case "/trpc/deerFlow.memory":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"memory": map[string]any{"enabled": true, "entries": 3}}}},
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
		path      string
		contains  string
		procedure string
	}{
		{name: "deerflow status", path: "/api/deerflow/status", contains: `"active":true`, procedure: `"procedure":"deerFlow.status"`},
		{name: "deerflow models", path: "/api/deerflow/models", contains: `"deepseek-chat"`, procedure: `"procedure":"deerFlow.models"`},
		{name: "deerflow skills", path: "/api/deerflow/skills", contains: `"research"`, procedure: `"procedure":"deerFlow.skills"`},
		{name: "deerflow memory", path: "/api/deerflow/memory", contains: `"entries":3`, procedure: `"procedure":"deerFlow.memory"`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tc.path, nil)
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

func TestHealerBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/healer.diagnose":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"error":"boom"`) {
				t.Fatalf("expected healer.diagnose payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"summary": "likely quota exhaustion"}}},
			})
		case "/trpc/healer.heal":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"context":"retry with fallback"`) {
				t.Fatalf("expected healer.heal payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}},
			})
		case "/trpc/healer.getHistory":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"error": "boom", "success": true}}}},
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
		{name: "healer diagnose", method: http.MethodPost, path: "/api/healer/diagnose", body: `{"error":"boom","context":"provider timeout"}`, contains: `"likely quota exhaustion"`, procedure: `"procedure":"healer.diagnose"`},
		{name: "healer heal", method: http.MethodPost, path: "/api/healer/heal", body: `{"error":"boom","context":"retry with fallback"}`, contains: `"success":true`, procedure: `"procedure":"healer.heal"`},
		{name: "healer history", method: http.MethodGet, path: "/api/healer/history", contains: `"error":"boom"`, procedure: `"procedure":"healer.getHistory"`},
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

func TestCouncilVisualBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.visual.systemDiagram":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"mermaid": "graph TD; A-->B;"}}},
			})
		case "/trpc/council.visual.planDiagram":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"task":"Ship it"`) {
				t.Fatalf("expected council.visual.planDiagram payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"mermaid": "graph TD; Plan-->Done;"}}},
			})
		case "/trpc/council.visual.parsePlan":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"mermaid":"graph TD; A--\u003eB;"`) {
				t.Fatalf("expected council.visual.parsePlan payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"data": map[string]any{"json": map[string]any{"nodes": []any{map[string]any{"id": "A"}}}}},
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
		{name: "council visual system diagram", method: http.MethodGet, path: "/api/council/visual/system-diagram", contains: `"graph TD; A--\u003eB;"`, procedure: `"procedure":"council.visual.systemDiagram"`},
		{name: "council visual plan diagram", method: http.MethodPost, path: "/api/council/visual/plan-diagram", body: `{"task":"Ship it"}`, contains: `"graph TD; Plan--\u003eDone;"`, procedure: `"procedure":"council.visual.planDiagram"`},
		{name: "council visual parse plan", method: http.MethodPost, path: "/api/council/visual/parse-plan", body: `{"mermaid":"graph TD; A-->B;"}`, contains: `"id":"A"`, procedure: `"procedure":"council.visual.parsePlan"`},
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

func TestCloudDevBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/cloudDev.listProviders":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"provider": "jules", "enabled": true, "hasApiKey": true},
			}}}})
		case "/trpc/cloudDev.createSession":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"provider":"jules"`) {
				t.Fatalf("expected cloudDev.createSession payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "cds-1", "status": "pending"}}}})
		case "/trpc/cloudDev.listSessions":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"provider":"jules"`) || !strings.Contains(string(body), `"status":"active"`) {
				t.Fatalf("expected cloudDev.listSessions payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"id": "cds-1", "status": "active"},
			}}}})
		case "/trpc/cloudDev.getSession":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"cds-1"`) {
				t.Fatalf("expected cloudDev.getSession payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "cds-1", "messages": []any{}}}}})
		case "/trpc/cloudDev.updateSessionStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "cds-1", "status": "awaiting_approval"}}}})
		case "/trpc/cloudDev.deleteSession":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/cloudDev.sendMessage":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"message": map[string]any{"id": "msg-1"}, "session": map[string]any{"id": "cds-1"}}}}})
		case "/trpc/cloudDev.broadcastMessage":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"delivered": 1, "skipped": 0}}}})
		case "/trpc/cloudDev.previewBroadcastRecipients":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"force":true`) {
				t.Fatalf("expected cloudDev.previewBroadcastRecipients payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"targeted": 1, "sessionIds": []any{"cds-1"}}}}})
		case "/trpc/cloudDev.acceptPlan":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "cds-1", "status": "active"}}}})
		case "/trpc/cloudDev.setAutoAcceptPlan":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "cds-1", "autoAcceptPlan": true}}}})
		case "/trpc/cloudDev.getMessages":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"cds-1"`) || !strings.Contains(string(body), `"limit":50`) {
				t.Fatalf("expected cloudDev.getMessages payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"id": "msg-1", "content": "hello"},
			}}}})
		case "/trpc/cloudDev.getLogs":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"cds-1"`) || !strings.Contains(string(body), `"limit":25`) {
				t.Fatalf("expected cloudDev.getLogs payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"id": "log-1", "message": "created"},
			}}}})
		case "/trpc/cloudDev.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"totalSessions": 1, "enabledProviders": 1}}}})
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
		{name: "clouddev providers", method: http.MethodGet, path: "/api/clouddev/providers", contains: `"jules"`, procedure: `"procedure":"cloudDev.listProviders"`},
		{name: "clouddev create session", method: http.MethodPost, path: "/api/clouddev/sessions/create", body: `{"provider":"jules","projectName":"borg","task":"ship","autoAcceptPlan":false}`, contains: `"status":"pending"`, procedure: `"procedure":"cloudDev.createSession"`},
		{name: "clouddev list sessions", method: http.MethodGet, path: "/api/clouddev/sessions?provider=jules&status=active", contains: `"status":"active"`, procedure: `"procedure":"cloudDev.listSessions"`},
		{name: "clouddev get session", method: http.MethodGet, path: "/api/clouddev/sessions/get?sessionId=cds-1", contains: `"id":"cds-1"`, procedure: `"procedure":"cloudDev.getSession"`},
		{name: "clouddev update status", method: http.MethodPost, path: "/api/clouddev/sessions/status", body: `{"sessionId":"cds-1","status":"awaiting_approval"}`, contains: `"awaiting_approval"`, procedure: `"procedure":"cloudDev.updateSessionStatus"`},
		{name: "clouddev delete session", method: http.MethodPost, path: "/api/clouddev/sessions/delete", body: `{"sessionId":"cds-1"}`, contains: `"success":true`, procedure: `"procedure":"cloudDev.deleteSession"`},
		{name: "clouddev send message", method: http.MethodPost, path: "/api/clouddev/messages/send", body: `{"sessionId":"cds-1","content":"hello","force":false}`, contains: `"msg-1"`, procedure: `"procedure":"cloudDev.sendMessage"`},
		{name: "clouddev broadcast", method: http.MethodPost, path: "/api/clouddev/messages/broadcast", body: `{"content":"hello all","force":false}`, contains: `"delivered":1`, procedure: `"procedure":"cloudDev.broadcastMessage"`},
		{name: "clouddev preview recipients", method: http.MethodPost, path: "/api/clouddev/messages/preview-recipients", body: `{"force":true}`, contains: `"targeted":1`, procedure: `"procedure":"cloudDev.previewBroadcastRecipients"`},
		{name: "clouddev accept plan", method: http.MethodPost, path: "/api/clouddev/plan/accept", body: `{"sessionId":"cds-1"}`, contains: `"status":"active"`, procedure: `"procedure":"cloudDev.acceptPlan"`},
		{name: "clouddev auto accept", method: http.MethodPost, path: "/api/clouddev/plan/auto-accept", body: `{"sessionId":"cds-1","enabled":true}`, contains: `"autoAcceptPlan":true`, procedure: `"procedure":"cloudDev.setAutoAcceptPlan"`},
		{name: "clouddev get messages", method: http.MethodGet, path: "/api/clouddev/messages/get?sessionId=cds-1&limit=50", contains: `"hello"`, procedure: `"procedure":"cloudDev.getMessages"`},
		{name: "clouddev get logs", method: http.MethodGet, path: "/api/clouddev/logs?sessionId=cds-1&limit=25", contains: `"created"`, procedure: `"procedure":"cloudDev.getLogs"`},
		{name: "clouddev stats", method: http.MethodGet, path: "/api/clouddev/stats", contains: `"totalSessions":1`, procedure: `"procedure":"cloudDev.stats"`},
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

func TestConfigRouterBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/config.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"key": "theme", "value": "dark"},
			}}}})
		case "/trpc/config.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"key":"theme"`) {
				t.Fatalf("expected config.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "dark"}}})
		case "/trpc/config.upsert":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"theme"`) || !strings.Contains(string(body), `"value":"light"`) {
				t.Fatalf("expected config.upsert payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/config.delete":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"key":"theme"`) {
				t.Fatalf("expected config.delete payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/config.update":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"key":"theme"`) || !strings.Contains(string(body), `"value":"light"`) {
				t.Fatalf("expected config.update payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/config.getMcpTimeout":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": 15000}}})
		case "/trpc/config.setMcpTimeout":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"timeout":20000`) {
				t.Fatalf("expected config.setMcpTimeout payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getMcpMaxAttempts":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": 4}}})
		case "/trpc/config.setMcpMaxAttempts":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"maxAttempts":5`) {
				t.Fatalf("expected config.setMcpMaxAttempts payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getMcpMaxTotalTimeout":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": 30000}}})
		case "/trpc/config.setMcpMaxTotalTimeout":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"timeout":45000`) {
				t.Fatalf("expected config.setMcpMaxTotalTimeout payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getMcpResetTimeoutOnProgress":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/config.setMcpResetTimeoutOnProgress":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"enabled":false`) {
				t.Fatalf("expected config.setMcpResetTimeoutOnProgress payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getSessionLifetime":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": 3600000}}})
		case "/trpc/config.setSessionLifetime":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"lifetime":7200000`) {
				t.Fatalf("expected config.setSessionLifetime payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getSignupDisabled":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": false}}})
		case "/trpc/config.setSignupDisabled":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"disabled":true`) {
				t.Fatalf("expected config.setSignupDisabled payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getSsoSignupDisabled":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/config.setSsoSignupDisabled":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"disabled":false`) {
				t.Fatalf("expected config.setSsoSignupDisabled payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getBasicAuthDisabled":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": false}}})
		case "/trpc/config.setBasicAuthDisabled":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"disabled":true`) {
				t.Fatalf("expected config.setBasicAuthDisabled payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/config.getAuthProviders":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{"github", "google"}}}})
		case "/trpc/config.getAlwaysVisibleTools":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{"list_all_tools", "search_tools"}}}})
		case "/trpc/config.setAlwaysVisibleTools":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"tools":["list_all_tools","search_tools"]`) {
				t.Fatalf("expected config.setAlwaysVisibleTools payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "tools": []any{"list_all_tools", "search_tools"}}}}})
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
		{name: "config list", method: http.MethodGet, path: "/api/config/list", contains: `"theme"`, procedure: `"procedure":"config.list"`},
		{name: "config get", method: http.MethodGet, path: "/api/config/get?key=theme", contains: `"data":"dark"`, procedure: `"procedure":"config.get"`},
		{name: "config upsert", method: http.MethodPost, path: "/api/config/upsert", body: `{"id":"theme","value":"light"}`, contains: `"data":true`, procedure: `"procedure":"config.upsert"`},
		{name: "config delete", method: http.MethodPost, path: "/api/config/delete", body: `{"key":"theme"}`, contains: `"data":true`, procedure: `"procedure":"config.delete"`},
		{name: "config update", method: http.MethodPost, path: "/api/config/update", body: `{"key":"theme","value":"light"}`, contains: `"data":true`, procedure: `"procedure":"config.update"`},
		{name: "config get mcp timeout", method: http.MethodGet, path: "/api/config/mcp-timeout", contains: `"data":15000`, procedure: `"procedure":"config.getMcpTimeout"`},
		{name: "config set mcp timeout", method: http.MethodPost, path: "/api/config/mcp-timeout/set", body: `{"timeout":20000}`, contains: `"success":true`, procedure: `"procedure":"config.setMcpTimeout"`},
		{name: "config get mcp max attempts", method: http.MethodGet, path: "/api/config/mcp-max-attempts", contains: `"data":4`, procedure: `"procedure":"config.getMcpMaxAttempts"`},
		{name: "config set mcp max attempts", method: http.MethodPost, path: "/api/config/mcp-max-attempts/set", body: `{"maxAttempts":5}`, contains: `"success":true`, procedure: `"procedure":"config.setMcpMaxAttempts"`},
		{name: "config get mcp max total timeout", method: http.MethodGet, path: "/api/config/mcp-max-total-timeout", contains: `"data":30000`, procedure: `"procedure":"config.getMcpMaxTotalTimeout"`},
		{name: "config set mcp max total timeout", method: http.MethodPost, path: "/api/config/mcp-max-total-timeout/set", body: `{"timeout":45000}`, contains: `"success":true`, procedure: `"procedure":"config.setMcpMaxTotalTimeout"`},
		{name: "config get mcp reset on progress", method: http.MethodGet, path: "/api/config/mcp-reset-timeout-on-progress", contains: `"data":true`, procedure: `"procedure":"config.getMcpResetTimeoutOnProgress"`},
		{name: "config set mcp reset on progress", method: http.MethodPost, path: "/api/config/mcp-reset-timeout-on-progress/set", body: `{"enabled":false}`, contains: `"success":true`, procedure: `"procedure":"config.setMcpResetTimeoutOnProgress"`},
		{name: "config get session lifetime", method: http.MethodGet, path: "/api/config/session-lifetime", contains: `"data":3600000`, procedure: `"procedure":"config.getSessionLifetime"`},
		{name: "config set session lifetime", method: http.MethodPost, path: "/api/config/session-lifetime/set", body: `{"lifetime":7200000}`, contains: `"success":true`, procedure: `"procedure":"config.setSessionLifetime"`},
		{name: "config get signup disabled", method: http.MethodGet, path: "/api/config/signup-disabled", contains: `"data":false`, procedure: `"procedure":"config.getSignupDisabled"`},
		{name: "config set signup disabled", method: http.MethodPost, path: "/api/config/signup-disabled/set", body: `{"disabled":true}`, contains: `"success":true`, procedure: `"procedure":"config.setSignupDisabled"`},
		{name: "config get sso signup disabled", method: http.MethodGet, path: "/api/config/sso-signup-disabled", contains: `"data":true`, procedure: `"procedure":"config.getSsoSignupDisabled"`},
		{name: "config set sso signup disabled", method: http.MethodPost, path: "/api/config/sso-signup-disabled/set", body: `{"disabled":false}`, contains: `"success":true`, procedure: `"procedure":"config.setSsoSignupDisabled"`},
		{name: "config get basic auth disabled", method: http.MethodGet, path: "/api/config/basic-auth-disabled", contains: `"data":false`, procedure: `"procedure":"config.getBasicAuthDisabled"`},
		{name: "config set basic auth disabled", method: http.MethodPost, path: "/api/config/basic-auth-disabled/set", body: `{"disabled":true}`, contains: `"success":true`, procedure: `"procedure":"config.setBasicAuthDisabled"`},
		{name: "config get auth providers", method: http.MethodGet, path: "/api/config/auth-providers", contains: `"github"`, procedure: `"procedure":"config.getAuthProviders"`},
		{name: "config get always visible tools", method: http.MethodGet, path: "/api/config/always-visible-tools", contains: `"list_all_tools"`, procedure: `"procedure":"config.getAlwaysVisibleTools"`},
		{name: "config set always visible tools", method: http.MethodPost, path: "/api/config/always-visible-tools/set", body: `{"tools":["list_all_tools","search_tools"]}`, contains: `"success":true`, procedure: `"procedure":"config.setAlwaysVisibleTools"`},
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

func TestCouncilHistoryBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.history.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true, "recordCount": 4}}}})
		case "/trpc/council.history.getConfig":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true, "retentionDays": 30}}}})
		case "/trpc/council.history.updateConfig":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"retentionDays":14`) {
				t.Fatalf("expected council.history.updateConfig payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true, "retentionDays": 14}}}})
		case "/trpc/council.history.toggle":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": false}}}})
		case "/trpc/council.history.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"averageConsensus": 0.9}}}})
		case "/trpc/council.history.list":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"sess-1"`) || !strings.Contains(string(body), `"approved":true`) || !strings.Contains(string(body), `"minConsensus":0.5`) {
				t.Fatalf("expected council.history.list payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{
				"records": []any{map[string]any{"id": "deb-1"}},
				"meta":    map[string]any{"count": 1, "totalRecords": 4},
			}}}})
		case "/trpc/council.history.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"deb-1"`) {
				t.Fatalf("expected council.history.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "deb-1", "approved": true}}}})
		case "/trpc/council.history.delete":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"deleted": true, "id": "deb-1"}}}})
		case "/trpc/council.history.supervisorHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"planner"`) {
				t.Fatalf("expected council.history.supervisorHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"decision": "approve"}}}}})
		case "/trpc/council.history.clear":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"cleared": 4}}}})
		case "/trpc/council.history.initialize":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"initialized": true, "recordCount": 4}}}})
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
		{name: "council history status", method: http.MethodGet, path: "/api/council/history/status", contains: `"recordCount":4`, procedure: `"procedure":"council.history.status"`},
		{name: "council history get config", method: http.MethodGet, path: "/api/council/history/config", contains: `"retentionDays":30`, procedure: `"procedure":"council.history.getConfig"`},
		{name: "council history update config", method: http.MethodPost, path: "/api/council/history/config", body: `{"retentionDays":14}`, contains: `"retentionDays":14`, procedure: `"procedure":"council.history.updateConfig"`},
		{name: "council history toggle", method: http.MethodPost, path: "/api/council/history/toggle", body: `{"enabled":false}`, contains: `"enabled":false`, procedure: `"procedure":"council.history.toggle"`},
		{name: "council history stats", method: http.MethodGet, path: "/api/council/history/stats", contains: `"averageConsensus":0.9`, procedure: `"procedure":"council.history.stats"`},
		{name: "council history list", method: http.MethodGet, path: "/api/council/history/list?sessionId=sess-1&approved=true&minConsensus=0.5&limit=10&offset=0&sortBy=timestamp&sortOrder=desc", contains: `"deb-1"`, procedure: `"procedure":"council.history.list"`},
		{name: "council history get", method: http.MethodGet, path: "/api/council/history/get?id=deb-1", contains: `"approved":true`, procedure: `"procedure":"council.history.get"`},
		{name: "council history delete", method: http.MethodPost, path: "/api/council/history/delete", body: `{"id":"deb-1"}`, contains: `"deleted":true`, procedure: `"procedure":"council.history.delete"`},
		{name: "council history supervisor", method: http.MethodGet, path: "/api/council/history/supervisor?name=planner", contains: `"approve"`, procedure: `"procedure":"council.history.supervisorHistory"`},
		{name: "council history clear", method: http.MethodPost, path: "/api/council/history/clear", contains: `"cleared":4`, procedure: `"procedure":"council.history.clear"`},
		{name: "council history initialize", method: http.MethodPost, path: "/api/council/history/initialize", contains: `"initialized":true`, procedure: `"procedure":"council.history.initialize"`},
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

func TestCouncilBaseBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true, "supervisorCount": 2}}}})
		case "/trpc/council.updateConfig":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"debateRounds":3`) {
				t.Fatalf("expected council.updateConfig payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"debateRounds": 3}}}})
		case "/trpc/council.addSupervisors":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"planner"`) {
				t.Fatalf("expected council.addSupervisors payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"added": []any{"planner"}, "failed": []any{}}}}})
		case "/trpc/council.clearSupervisors":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/council.debate":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"description":"Ship feature"`) {
				t.Fatalf("expected council.debate payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"decision": "approve"}}}})
		case "/trpc/council.toggle":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": false}}}})
		case "/trpc/council.addMock":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"added": "MockSupervisor-1"}}}})
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
		{name: "council base status", method: http.MethodGet, path: "/api/council/status", contains: `"supervisorCount":2`, procedure: `"procedure":"council.status"`},
		{name: "council base update config", method: http.MethodPost, path: "/api/council/config/update", body: `{"debateRounds":3}`, contains: `"debateRounds":3`, procedure: `"procedure":"council.updateConfig"`},
		{name: "council base add supervisors", method: http.MethodPost, path: "/api/council/supervisors/add", body: `{"supervisors":[{"name":"planner","provider":"openai"}]}`, contains: `"planner"`, procedure: `"procedure":"council.addSupervisors"`},
		{name: "council base clear supervisors", method: http.MethodPost, path: "/api/council/supervisors/clear", contains: `"success":true`, procedure: `"procedure":"council.clearSupervisors"`},
		{name: "council base debate", method: http.MethodPost, path: "/api/council/debate", body: `{"id":"task-1","description":"Ship feature","context":"ctx","files":["README.md"]}`, contains: `"approve"`, procedure: `"procedure":"council.debate"`},
		{name: "council base toggle", method: http.MethodPost, path: "/api/council/toggle", contains: `"enabled":false`, procedure: `"procedure":"council.toggle"`},
		{name: "council base add mock", method: http.MethodPost, path: "/api/council/mock/add", contains: `"MockSupervisor-1"`, procedure: `"procedure":"council.addMock"`},
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

func TestCouncilSmartPilotBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.smartPilot.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true, "activePlans": []any{map[string]any{"sessionId": "sess-1"}}}}}})
		case "/trpc/council.smartPilot.getConfig":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true, "autoApproveThreshold": 0.8}}}})
		case "/trpc/council.smartPilot.updateConfig":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"enabled":true`) {
				t.Fatalf("expected council.smartPilot.updateConfig payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"enabled": true}}}})
		case "/trpc/council.smartPilot.trigger":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"sess-1"`) {
				t.Fatalf("expected council.smartPilot.trigger payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/council.smartPilot.resetCount":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"sess-1"`) {
				t.Fatalf("expected council.smartPilot.resetCount payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/council.smartPilot.resetAllCounts":
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
		{name: "smartpilot status", method: http.MethodGet, path: "/api/council/smart-pilot/status", contains: `"sessionId":"sess-1"`, procedure: `"procedure":"council.smartPilot.status"`},
		{name: "smartpilot get config", method: http.MethodGet, path: "/api/council/smart-pilot/config", contains: `"autoApproveThreshold":0.8`, procedure: `"procedure":"council.smartPilot.getConfig"`},
		{name: "smartpilot update config", method: http.MethodPost, path: "/api/council/smart-pilot/config", body: `{"enabled":true}`, contains: `"enabled":true`, procedure: `"procedure":"council.smartPilot.updateConfig"`},
		{name: "smartpilot trigger", method: http.MethodPost, path: "/api/council/smart-pilot/trigger", body: `{"sessionId":"sess-1","task":{"id":"task-1"}}`, contains: `"success":true`, procedure: `"procedure":"council.smartPilot.trigger"`},
		{name: "smartpilot reset count", method: http.MethodPost, path: "/api/council/smart-pilot/reset-count", body: `{"sessionId":"sess-1"}`, contains: `"success":true`, procedure: `"procedure":"council.smartPilot.resetCount"`},
		{name: "smartpilot reset all", method: http.MethodPost, path: "/api/council/smart-pilot/reset-all", contains: `"success":true`, procedure: `"procedure":"council.smartPilot.resetAllCounts"`},
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

func TestCouncilHooksBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.hooks.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"hooks": []any{map[string]any{"id": "hook-1", "phase": "pre-debate"}}}}}})
		case "/trpc/council.hooks.register":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"phase":"pre-debate"`) {
				t.Fatalf("expected council.hooks.register payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "hookId": "hook-1"}}}})
		case "/trpc/council.hooks.unregister":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"hook-1"`) {
				t.Fatalf("expected council.hooks.unregister payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/council.hooks.clear":
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
		{name: "hooks list", method: http.MethodGet, path: "/api/council/hooks", contains: `"id":"hook-1"`, procedure: `"procedure":"council.hooks.list"`},
		{name: "hooks register", method: http.MethodPost, path: "/api/council/hooks/register", body: `{"phase":"pre-debate","webhookUrl":"https://example.com/hook","priority":5}`, contains: `"hookId":"hook-1"`, procedure: `"procedure":"council.hooks.register"`},
		{name: "hooks unregister", method: http.MethodPost, path: "/api/council/hooks/unregister", body: `{"id":"hook-1"}`, contains: `"success":true`, procedure: `"procedure":"council.hooks.unregister"`},
		{name: "hooks clear", method: http.MethodPost, path: "/api/council/hooks/clear", contains: `"success":true`, procedure: `"procedure":"council.hooks.clear"`},
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

func TestCouncilIDEBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.ide.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "ready": true, "capabilities": []any{"council", "smart-pilot"}}}}})
		case "/trpc/council.ide.submitTask":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"description":"Fix the failing test"`) {
				t.Fatalf("expected council.ide.submitTask payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "taskId": "ide-1", "sessionId": "sess-1"}}}})
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
		{name: "ide status", method: http.MethodGet, path: "/api/council/ide/status", contains: `"ready":true`, procedure: `"procedure":"council.ide.status"`},
		{name: "ide submit task", method: http.MethodPost, path: "/api/council/ide/submit-task", body: `{"description":"Fix the failing test","fileContext":{"path":"src/app.ts","content":"console.log('hi')"}}`, contains: `"taskId":"ide-1"`, procedure: `"procedure":"council.ide.submitTask"`},
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

func TestCouncilEvolutionBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.evolution.start":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "message": "Continuous learning started"}}}})
		case "/trpc/council.evolution.stop":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "message": "Continuous learning stopped"}}}})
		case "/trpc/council.evolution.optimize":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/council.evolution.evolve":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"description":"Improve routing heuristics"`) {
				t.Fatalf("expected council.evolution.evolve payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "sessionId": "evolve-1"}}}})
		case "/trpc/council.evolution.test":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "passed": true}}}})
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
		{name: "evolution start", method: http.MethodPost, path: "/api/council/evolution/start", contains: `"Continuous learning started"`, procedure: `"procedure":"council.evolution.start"`},
		{name: "evolution stop", method: http.MethodPost, path: "/api/council/evolution/stop", contains: `"Continuous learning stopped"`, procedure: `"procedure":"council.evolution.stop"`},
		{name: "evolution optimize", method: http.MethodPost, path: "/api/council/evolution/optimize", contains: `"success":true`, procedure: `"procedure":"council.evolution.optimize"`},
		{name: "evolution evolve", method: http.MethodPost, path: "/api/council/evolution/evolve", body: `{"description":"Improve routing heuristics"}`, contains: `"sessionId":"evolve-1"`, procedure: `"procedure":"council.evolution.evolve"`},
		{name: "evolution test", method: http.MethodGet, path: "/api/council/evolution/test", contains: `"passed":true`, procedure: `"procedure":"council.evolution.test"`},
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

func TestCouncilFineTuneBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.fineTune.createDataset":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"dataset-1"`) {
				t.Fatalf("expected council.fineTune.createDataset payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "dataset-1", "name": "dataset-1"}}}})
		case "/trpc/council.fineTune.listDatasets":
			body, _ := io.ReadAll(r.Body)
			if len(body) > 0 && !strings.Contains(string(body), `"taskType":"code"`) {
				t.Fatalf("expected council.fineTune.listDatasets payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "dataset-1"}}}}})
		case "/trpc/council.fineTune.getDataset":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"dataset-1"`) {
				t.Fatalf("expected council.fineTune.getDataset payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "dataset-1"}}}})
		case "/trpc/council.fineTune.createJob":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"datasetId":"dataset-1"`) {
				t.Fatalf("expected council.fineTune.createJob payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "job-1"}}}})
		case "/trpc/council.fineTune.listJobs":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "job-1"}}}}})
		case "/trpc/council.fineTune.startJob":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"job-1"`) {
				t.Fatalf("expected council.fineTune.startJob payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "job-1", "status": "running"}}}})
		case "/trpc/council.fineTune.registerModel":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"name":"model-1"`) {
				t.Fatalf("expected council.fineTune.registerModel payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "model-1"}}}})
		case "/trpc/council.fineTune.listModels":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "model-1"}}}}})
		case "/trpc/council.fineTune.deployModel":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"model-1"`) {
				t.Fatalf("expected council.fineTune.deployModel payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "model-1", "deploymentStatus": "active"}}}})
		case "/trpc/council.fineTune.chat":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"model-1"`) {
				t.Fatalf("expected council.fineTune.chat payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"response": "hello from model"}}}})
		case "/trpc/council.fineTune.stats":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"datasets": 1, "jobs": 1, "models": 1}}}})
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
		{name: "finetune create dataset", method: http.MethodPost, path: "/api/council/fine-tune/datasets", body: `{"name":"dataset-1","format":"alpaca"}`, contains: `"dataset-1"`, procedure: `"procedure":"council.fineTune.createDataset"`},
		{name: "finetune list datasets", method: http.MethodGet, path: "/api/council/fine-tune/datasets?taskType=code", contains: `"dataset-1"`, procedure: `"procedure":"council.fineTune.listDatasets"`},
		{name: "finetune get dataset", method: http.MethodGet, path: "/api/council/fine-tune/datasets/get?id=dataset-1", contains: `"dataset-1"`, procedure: `"procedure":"council.fineTune.getDataset"`},
		{name: "finetune create job", method: http.MethodPost, path: "/api/council/fine-tune/jobs", body: `{"baseModel":"gpt-4.1","datasetId":"dataset-1"}`, contains: `"job-1"`, procedure: `"procedure":"council.fineTune.createJob"`},
		{name: "finetune list jobs", method: http.MethodGet, path: "/api/council/fine-tune/jobs", contains: `"job-1"`, procedure: `"procedure":"council.fineTune.listJobs"`},
		{name: "finetune start job", method: http.MethodPost, path: "/api/council/fine-tune/jobs/start", body: `{"id":"job-1"}`, contains: `"running"`, procedure: `"procedure":"council.fineTune.startJob"`},
		{name: "finetune register model", method: http.MethodPost, path: "/api/council/fine-tune/models", body: `{"name":"model-1","provider":"openai","providerModelId":"ft:model-1"}`, contains: `"model-1"`, procedure: `"procedure":"council.fineTune.registerModel"`},
		{name: "finetune list models", method: http.MethodGet, path: "/api/council/fine-tune/models", contains: `"model-1"`, procedure: `"procedure":"council.fineTune.listModels"`},
		{name: "finetune deploy model", method: http.MethodPost, path: "/api/council/fine-tune/models/deploy", body: `{"id":"model-1"}`, contains: `"active"`, procedure: `"procedure":"council.fineTune.deployModel"`},
		{name: "finetune chat", method: http.MethodPost, path: "/api/council/fine-tune/chat", body: `{"id":"model-1","messages":[{"role":"user","content":"hello"}]}`, contains: `"hello from model"`, procedure: `"procedure":"council.fineTune.chat"`},
		{name: "finetune stats", method: http.MethodGet, path: "/api/council/fine-tune/stats", contains: `"datasets":1`, procedure: `"procedure":"council.fineTune.stats"`},
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

func TestCouncilRotationBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/council.rotation.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "rotation-1"}}}}})
		case "/trpc/council.rotation.get":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"roomId":"rotation-1"`) {
				t.Fatalf("expected council.rotation.get payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "mode": "plan"}}}})
		case "/trpc/council.rotation.create":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"title":"Autopilot trio"`) {
				t.Fatalf("expected council.rotation.create payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "mode": "plan"}}}})
		case "/trpc/council.rotation.addParticipant":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"id":"qwen"`) {
				t.Fatalf("expected council.rotation.addParticipant payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "participantOrder": []any{"claude", "gpt", "qwen"}}}}})
		case "/trpc/council.rotation.postMessage":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"content":"Plan first"`) {
				t.Fatalf("expected council.rotation.postMessage payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "msg-1", "content": "Plan first"}}}})
		case "/trpc/council.rotation.setAgreement":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"agrees":true`) {
				t.Fatalf("expected council.rotation.setAgreement payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "status": "active"}}}})
		case "/trpc/council.rotation.advanceTurn":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"summary":"Planning complete"`) {
				t.Fatalf("expected council.rotation.advanceTurn payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "currentCycleNumber": 1}}}})
		case "/trpc/council.rotation.configureSupervisor":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"completionCriteria":"Wait for tests"`) {
				t.Fatalf("expected council.rotation.configureSupervisor payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "supervisor": map[string]any{"status": "active"}}}}})
		case "/trpc/council.rotation.runSupervisorCheck":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"roomId":"rotation-1"`) {
				t.Fatalf("expected council.rotation.runSupervisorCheck payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "supervisor": map[string]any{"status": "satisfied"}}}}})
		case "/trpc/council.rotation.updateSharedContext":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sharedContext":"Shared task context"`) {
				t.Fatalf("expected council.rotation.updateSharedContext payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "sharedContext": "Shared task context"}}}})
		case "/trpc/council.rotation.pause":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "status": "paused"}}}})
		case "/trpc/council.rotation.resume":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "status": "active"}}}})
		case "/trpc/council.rotation.startExecution":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"checkpoint":"Ready to code"`) {
				t.Fatalf("expected council.rotation.startExecution payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "mode": "execute"}}}})
		case "/trpc/council.rotation.complete":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"summary":"Done"`) {
				t.Fatalf("expected council.rotation.complete payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"id": "rotation-1", "status": "completed"}}}})
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
		{name: "rotation list", method: http.MethodGet, path: "/api/council/rotation", contains: `"rotation-1"`, procedure: `"procedure":"council.rotation.list"`},
		{name: "rotation get", method: http.MethodGet, path: "/api/council/rotation/get?roomId=rotation-1", contains: `"mode":"plan"`, procedure: `"procedure":"council.rotation.get"`},
		{name: "rotation create", method: http.MethodPost, path: "/api/council/rotation/create", body: `{"title":"Autopilot trio","objective":"Debate then code","participants":[{"id":"claude","name":"Claude","provider":"anthropic","model":"claude-sonnet-4.6"},{"id":"gpt","name":"GPT","provider":"openai","model":"gpt-5.4"}]}`, contains: `"rotation-1"`, procedure: `"procedure":"council.rotation.create"`},
		{name: "rotation add participant", method: http.MethodPost, path: "/api/council/rotation/add-participant", body: `{"roomId":"rotation-1","participant":{"id":"qwen","name":"Qwen","provider":"local","model":"qwen2.5-coder"}}`, contains: `"qwen"`, procedure: `"procedure":"council.rotation.addParticipant"`},
		{name: "rotation post message", method: http.MethodPost, path: "/api/council/rotation/post-message", body: `{"roomId":"rotation-1","participantId":"claude","content":"Plan first"}`, contains: `"Plan first"`, procedure: `"procedure":"council.rotation.postMessage"`},
		{name: "rotation set agreement", method: http.MethodPost, path: "/api/council/rotation/set-agreement", body: `{"roomId":"rotation-1","participantId":"claude","agrees":true}`, contains: `"status":"active"`, procedure: `"procedure":"council.rotation.setAgreement"`},
		{name: "rotation advance turn", method: http.MethodPost, path: "/api/council/rotation/advance-turn", body: `{"roomId":"rotation-1","summary":"Planning complete"}`, contains: `"currentCycleNumber":1`, procedure: `"procedure":"council.rotation.advanceTurn"`},
		{name: "rotation configure supervisor", method: http.MethodPost, path: "/api/council/rotation/configure-supervisor", body: `{"roomId":"rotation-1","supervisor":{"name":"Local Qwen supervisor","provider":"local","model":"qwen2.5-coder","completionCriteria":"Wait for tests","evaluationMode":"after_turn","completionAction":"complete"}}`, contains: `"status":"active"`, procedure: `"procedure":"council.rotation.configureSupervisor"`},
		{name: "rotation run supervisor check", method: http.MethodPost, path: "/api/council/rotation/run-supervisor-check", body: `{"roomId":"rotation-1"}`, contains: `"status":"satisfied"`, procedure: `"procedure":"council.rotation.runSupervisorCheck"`},
		{name: "rotation update context", method: http.MethodPost, path: "/api/council/rotation/update-shared-context", body: `{"roomId":"rotation-1","sharedContext":"Shared task context"}`, contains: `"Shared task context"`, procedure: `"procedure":"council.rotation.updateSharedContext"`},
		{name: "rotation pause", method: http.MethodPost, path: "/api/council/rotation/pause", body: `{"roomId":"rotation-1"}`, contains: `"status":"paused"`, procedure: `"procedure":"council.rotation.pause"`},
		{name: "rotation resume", method: http.MethodPost, path: "/api/council/rotation/resume", body: `{"roomId":"rotation-1"}`, contains: `"status":"active"`, procedure: `"procedure":"council.rotation.resume"`},
		{name: "rotation start execution", method: http.MethodPost, path: "/api/council/rotation/start-execution", body: `{"roomId":"rotation-1","checkpoint":"Ready to code"}`, contains: `"mode":"execute"`, procedure: `"procedure":"council.rotation.startExecution"`},
		{name: "rotation complete", method: http.MethodPost, path: "/api/council/rotation/complete", body: `{"roomId":"rotation-1","summary":"Done"}`, contains: `"status":"completed"`, procedure: `"procedure":"council.rotation.complete"`},
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

func TestSwarmBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/swarm.startSwarm":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"masterPrompt":"Implement feature"`) {
				t.Fatalf("expected swarm.startSwarm payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"missionId": "mission-1", "taskCount": 3}}}})
		case "/trpc/swarm.resumeMission":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"missionId":"mission-1"`) {
				t.Fatalf("expected swarm.resumeMission payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/swarm.approveTask":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"taskId":"task-1"`) {
				t.Fatalf("expected swarm.approveTask payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/swarm.decomposeTask":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"taskId":"task-1"`) {
				t.Fatalf("expected swarm.decomposeTask payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "subMissionId": "sub-1"}}}})
		case "/trpc/swarm.updateTaskPriority":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"priority":5`) {
				t.Fatalf("expected swarm.updateTaskPriority payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/swarm.executeDebate":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"topic":"Best implementation path"`) {
				t.Fatalf("expected swarm.executeDebate payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"winner": "claude", "roundsCompleted": 3}}}})
		case "/trpc/swarm.seekConsensus":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"prompt":"Agree on plan"`) {
				t.Fatalf("expected swarm.seekConsensus payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"agreed": true, "agreementPercentage": 100}}}})
		case "/trpc/swarm.getMissionHistory":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "mission-1"}}}}})
		case "/trpc/swarm.getMissionRiskSummary":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"missionCount": 1, "averageRisk": 10}}}})
		case "/trpc/swarm.getMissionRiskRows":
			body, _ := io.ReadAll(r.Body)
			if len(body) > 0 && !strings.Contains(string(body), `"statusFilter":"active"`) {
				t.Fatalf("expected swarm.getMissionRiskRows payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"missionRiskScore": 10}}}}})
		case "/trpc/swarm.getMissionRiskFacets":
			body, _ := io.ReadAll(r.Body)
			if len(body) > 0 && !strings.Contains(string(body), `"minRisk":10`) {
				t.Fatalf("expected swarm.getMissionRiskFacets payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"bands": map[string]any{"low": 1}}}}})
		case "/trpc/swarm.getMeshCapabilities":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"node-1": []any{"debate", "consensus"}}}}})
		case "/trpc/swarm.sendDirectMessage":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"targetNodeId":"node-1"`) {
				t.Fatalf("expected swarm.sendDirectMessage payload, got %s", string(body))
			}
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
		{name: "swarm start", method: http.MethodPost, path: "/api/swarm/start", body: `{"masterPrompt":"Implement feature","maxConcurrency":3}`, contains: `"missionId":"mission-1"`, procedure: `"procedure":"swarm.startSwarm"`},
		{name: "swarm resume", method: http.MethodPost, path: "/api/swarm/resume", body: `{"missionId":"mission-1"}`, contains: `"success":true`, procedure: `"procedure":"swarm.resumeMission"`},
		{name: "swarm approve task", method: http.MethodPost, path: "/api/swarm/approve-task", body: `{"missionId":"mission-1","taskId":"task-1","approved":true}`, contains: `"success":true`, procedure: `"procedure":"swarm.approveTask"`},
		{name: "swarm decompose task", method: http.MethodPost, path: "/api/swarm/decompose-task", body: `{"missionId":"mission-1","taskId":"task-1"}`, contains: `"subMissionId":"sub-1"`, procedure: `"procedure":"swarm.decomposeTask"`},
		{name: "swarm update priority", method: http.MethodPost, path: "/api/swarm/update-task-priority", body: `{"missionId":"mission-1","taskId":"task-1","priority":5}`, contains: `"success":true`, procedure: `"procedure":"swarm.updateTaskPriority"`},
		{name: "swarm debate", method: http.MethodPost, path: "/api/swarm/debate", body: `{"topic":"Best implementation path","proponentModel":"claude","opponentModel":"gpt","judgeModel":"gemini"}`, contains: `"winner":"claude"`, procedure: `"procedure":"swarm.executeDebate"`},
		{name: "swarm consensus", method: http.MethodPost, path: "/api/swarm/consensus", body: `{"prompt":"Agree on plan","models":["claude","gpt","gemini"]}`, contains: `"agreed":true`, procedure: `"procedure":"swarm.seekConsensus"`},
		{name: "swarm missions", method: http.MethodGet, path: "/api/swarm/missions", contains: `"mission-1"`, procedure: `"procedure":"swarm.getMissionHistory"`},
		{name: "swarm risk summary", method: http.MethodGet, path: "/api/swarm/risk/summary", contains: `"averageRisk":10`, procedure: `"procedure":"swarm.getMissionRiskSummary"`},
		{name: "swarm risk rows", method: http.MethodGet, path: "/api/swarm/risk/rows?statusFilter=active&limit=10", contains: `"missionRiskScore":10`, procedure: `"procedure":"swarm.getMissionRiskRows"`},
		{name: "swarm risk facets", method: http.MethodGet, path: "/api/swarm/risk/facets?minRisk=10", contains: `"low":1`, procedure: `"procedure":"swarm.getMissionRiskFacets"`},
		{name: "swarm mesh capabilities", method: http.MethodGet, path: "/api/swarm/mesh-capabilities", contains: `"debate"`, procedure: `"procedure":"swarm.getMeshCapabilities"`},
		{name: "swarm direct message", method: http.MethodPost, path: "/api/swarm/direct-message", body: `{"targetNodeId":"node-1","payload":{"hello":"world"}}`, contains: `"success":true`, procedure: `"procedure":"swarm.sendDirectMessage"`},
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

func TestBillingBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/billing.getStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"usage": map[string]any{"currentMonth": 12.5}}}}})
		case "/trpc/billing.getProviderQuotas":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"provider": "openai", "remaining": 100}}}}})
		case "/trpc/billing.getCostHistory":
			body, _ := io.ReadAll(r.Body)
			if len(body) > 0 && !strings.Contains(string(body), `"days":7`) {
				t.Fatalf("expected billing.getCostHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"history": []any{map[string]any{"date": "2026-03-31", "cost": 12.5}}}}}})
		case "/trpc/billing.getModelPricing":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"models": []any{map[string]any{"id": "gpt-5.4"}}}}}})
		case "/trpc/billing.getFallbackChain":
			body, _ := io.ReadAll(r.Body)
			if len(body) > 0 && !strings.Contains(string(body), `"taskType":"coding"`) {
				t.Fatalf("expected billing.getFallbackChain payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"chain": []any{map[string]any{"provider": "openai"}}}}}})
		case "/trpc/billing.getTaskRoutingRules":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"defaultStrategy": "best"}}}})
		case "/trpc/billing.setRoutingStrategy":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"strategy":"round-robin"`) {
				t.Fatalf("expected billing.setRoutingStrategy payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"ok": true, "strategy": "round-robin"}}}})
		case "/trpc/billing.setTaskRoutingRule":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"taskType":"coding"`) {
				t.Fatalf("expected billing.setTaskRoutingRule payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"ok": true, "taskType": "coding"}}}})
		case "/trpc/billing.getDepletedModels":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{"gpt-4.1"}}}})
		case "/trpc/billing.getFallbackHistory":
			body, _ := io.ReadAll(r.Body)
			if len(body) > 0 && !strings.Contains(string(body), `"limit":10`) {
				t.Fatalf("expected billing.getFallbackHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"selectedProvider": "openai"}}}}})
		case "/trpc/billing.clearFallbackHistory":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"ok": true}}}})
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
		{name: "billing status", method: http.MethodGet, path: "/api/billing/status", contains: `"currentMonth":12.5`, procedure: `"procedure":"billing.getStatus"`},
		{name: "billing quotas", method: http.MethodGet, path: "/api/billing/provider-quotas", contains: `"remaining":100`, procedure: `"procedure":"billing.getProviderQuotas"`},
		{name: "billing cost history", method: http.MethodGet, path: "/api/billing/cost-history?days=7", contains: `"date":"2026-03-31"`, procedure: `"procedure":"billing.getCostHistory"`},
		{name: "billing model pricing", method: http.MethodGet, path: "/api/billing/model-pricing", contains: `"gpt-5.4"`, procedure: `"procedure":"billing.getModelPricing"`},
		{name: "billing fallback chain", method: http.MethodGet, path: "/api/billing/fallback-chain?taskType=coding", contains: `"provider":"openai"`, procedure: `"procedure":"billing.getFallbackChain"`},
		{name: "billing task routing rules", method: http.MethodGet, path: "/api/billing/task-routing-rules", contains: `"defaultStrategy":"best"`, procedure: `"procedure":"billing.getTaskRoutingRules"`},
		{name: "billing set routing strategy", method: http.MethodPost, path: "/api/billing/routing-strategy", body: `{"strategy":"round-robin"}`, contains: `"strategy":"round-robin"`, procedure: `"procedure":"billing.setRoutingStrategy"`},
		{name: "billing set task routing rule", method: http.MethodPost, path: "/api/billing/task-routing-rule", body: `{"taskType":"coding","strategy":"best"}`, contains: `"taskType":"coding"`, procedure: `"procedure":"billing.setTaskRoutingRule"`},
		{name: "billing depleted models", method: http.MethodGet, path: "/api/billing/depleted-models", contains: `"gpt-4.1"`, procedure: `"procedure":"billing.getDepletedModels"`},
		{name: "billing fallback history", method: http.MethodGet, path: "/api/billing/fallback-history?limit=10", contains: `"selectedProvider":"openai"`, procedure: `"procedure":"billing.getFallbackHistory"`},
		{name: "billing clear fallback history", method: http.MethodPost, path: "/api/billing/fallback-history/clear", contains: `"ok":true`, procedure: `"procedure":"billing.clearFallbackHistory"`},
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

func TestBrowserBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/browser.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"available": true, "pageCount": 1}}}})
		case "/trpc/browser.closePage":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"pageId":"page-1"`) {
				t.Fatalf("expected browser.closePage payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/browser.closeAll":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/browser.searchHistory":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"hypercode"`) {
				t.Fatalf("expected browser.searchHistory payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"items": []any{map[string]any{"title": "HyperCode"}}}}}})
		case "/trpc/browser.scrapePage":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"title": "HyperCode Docs", "content": "hello"}}}})
		case "/trpc/browser.screenshot":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"message": "Screenshot captured."}}}})
		case "/trpc/browser.debug":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"action":"command"`) {
				t.Fatalf("expected browser.debug payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"raw": "{\"ok\":true}"}}}})
		case "/trpc/browser.proxyFetch":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"url":"https://example.com"`) {
				t.Fatalf("expected browser.proxyFetch payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"data": map[string]any{"status": 200}}}}})
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
		{name: "browser status", method: http.MethodGet, path: "/api/browser/status", contains: `"pageCount":1`, procedure: `"procedure":"browser.status"`},
		{name: "browser close page", method: http.MethodPost, path: "/api/browser/close-page", body: `{"pageId":"page-1"}`, contains: `"success":true`, procedure: `"procedure":"browser.closePage"`},
		{name: "browser close all", method: http.MethodPost, path: "/api/browser/close-all", contains: `"success":true`, procedure: `"procedure":"browser.closeAll"`},
		{name: "browser search history", method: http.MethodGet, path: "/api/browser/search-history?query=hypercode&maxResults=5", contains: `"HyperCode"`, procedure: `"procedure":"browser.searchHistory"`},
		{name: "browser scrape", method: http.MethodGet, path: "/api/browser/scrape", contains: `"HyperCode Docs"`, procedure: `"procedure":"browser.scrapePage"`},
		{name: "browser screenshot", method: http.MethodPost, path: "/api/browser/screenshot", contains: `"Screenshot captured."`, procedure: `"procedure":"browser.screenshot"`},
		{name: "browser debug", method: http.MethodPost, path: "/api/browser/debug", body: `{"action":"command","method":"Page.reload"}`, contains: `"{\"ok\":true}"`, procedure: `"procedure":"browser.debug"`},
		{name: "browser proxy fetch", method: http.MethodPost, path: "/api/browser/proxy-fetch", body: `{"url":"https://example.com","method":"GET","headers":{}}`, contains: `"status":200`, procedure: `"procedure":"browser.proxyFetch"`},
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

func TestSquadBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/squad.list":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"branch": "feature/alpha", "goal": "Ship alpha"},
			}}}})
		case "/trpc/squad.spawn":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"branch":"feature/alpha"`) || !strings.Contains(string(body), `"goal":"Ship alpha"`) {
				t.Fatalf("expected squad.spawn payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"branch": "feature/alpha", "status": "spawned"}}}})
		case "/trpc/squad.kill":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"branch":"feature/alpha"`) {
				t.Fatalf("expected squad.kill payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/squad.chat":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"branch":"feature/alpha"`) || !strings.Contains(string(body), `"message":"Status?"`) {
				t.Fatalf("expected squad.chat payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": "On it"}}})
		case "/trpc/squad.toggleIndexer":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"enabled":true`) {
				t.Fatalf("expected squad.toggleIndexer payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": true}}})
		case "/trpc/squad.getIndexerStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"running": true, "indexing": false}}}})
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
		{name: "squad list", method: http.MethodGet, path: "/api/squad", contains: `"feature/alpha"`, procedure: `"procedure":"squad.list"`},
		{name: "squad spawn", method: http.MethodPost, path: "/api/squad/spawn", body: `{"branch":"feature/alpha","goal":"Ship alpha"}`, contains: `"status":"spawned"`, procedure: `"procedure":"squad.spawn"`},
		{name: "squad kill", method: http.MethodPost, path: "/api/squad/kill", body: `{"branch":"feature/alpha"}`, contains: `"data":true`, procedure: `"procedure":"squad.kill"`},
		{name: "squad chat", method: http.MethodPost, path: "/api/squad/chat", body: `{"branch":"feature/alpha","message":"Status?"}`, contains: `"On it"`, procedure: `"procedure":"squad.chat"`},
		{name: "squad toggle indexer", method: http.MethodPost, path: "/api/squad/indexer/toggle", body: `{"enabled":true}`, contains: `"data":true`, procedure: `"procedure":"squad.toggleIndexer"`},
		{name: "squad indexer status", method: http.MethodGet, path: "/api/squad/indexer/status", contains: `"running":true`, procedure: `"procedure":"squad.getIndexerStatus"`},
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

func TestSupervisorBridgeRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		switch r.URL.Path {
		case "/trpc/supervisor.decompose":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"goal":"Ship the supervisor lane"`) {
				t.Fatalf("expected supervisor.decompose payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"steps": []any{"plan", "build", "verify"}}}}})
		case "/trpc/supervisor.supervise":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"goal":"Ship the supervisor lane"`) || !strings.Contains(string(body), `"maxSteps":5`) {
				t.Fatalf("expected supervisor.supervise payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "taskId": "sup-1"}}}})
		case "/trpc/supervisor.status":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"isActive": true, "queueDepth": 1}}}})
		case "/trpc/supervisor.listTasks":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":10`) || !strings.Contains(string(body), `"status":"active"`) {
				t.Fatalf("expected supervisor.listTasks payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{
				map[string]any{"id": "sup-1", "status": "active"},
			}}}})
		case "/trpc/supervisor.cancel":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"taskId":"sup-1"`) {
				t.Fatalf("expected supervisor.cancel payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "taskId": "sup-1"}}}})
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
		{name: "supervisor decompose", method: http.MethodPost, path: "/api/supervisor/decompose", body: `{"goal":"Ship the supervisor lane"}`, contains: `"plan"`, procedure: `"procedure":"supervisor.decompose"`},
		{name: "supervisor supervise", method: http.MethodPost, path: "/api/supervisor/supervise", body: `{"goal":"Ship the supervisor lane","maxSteps":5}`, contains: `"taskId":"sup-1"`, procedure: `"procedure":"supervisor.supervise"`},
		{name: "supervisor status", method: http.MethodGet, path: "/api/supervisor/status", contains: `"queueDepth":1`, procedure: `"procedure":"supervisor.status"`},
		{name: "supervisor tasks", method: http.MethodGet, path: "/api/supervisor/tasks?limit=10&status=active", contains: `"status":"active"`, procedure: `"procedure":"supervisor.listTasks"`},
		{name: "supervisor cancel", method: http.MethodPost, path: "/api/supervisor/cancel", body: `{"taskId":"sup-1"}`, contains: `"success":true`, procedure: `"procedure":"supervisor.cancel"`},
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
	statusByProvider := make(map[string]providers.Status, len(payload.Data))
	for _, status := range payload.Data {
		statusByProvider[status.Provider] = status
	}
	openAIStatus, ok := statusByProvider["openai"]
	if !ok {
		t.Fatalf("expected openai provider in %+v", payload.Data)
	}
	if openAIStatus.AuthMethod != "api_key" || !openAIStatus.Configured || !openAIStatus.Authenticated || openAIStatus.EnvVar != "OPENAI_API_KEY" {
		t.Fatalf("expected configured openai provider, got %+v", openAIStatus)
	}
	googleOAuthStatus, ok := statusByProvider["google-oauth"]
	if !ok {
		t.Fatalf("expected google-oauth provider in %+v", payload.Data)
	}
	if googleOAuthStatus.AuthMethod != "oauth" || googleOAuthStatus.EnvVar != "GOOGLE_OAUTH_ACCESS_TOKEN" {
		t.Fatalf("expected google-oauth provider details, got %+v", googleOAuthStatus)
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

	var payload struct {
		Success bool                     `json:"success"`
		Data    []providers.CatalogEntry `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}

	catalogByProvider := make(map[string]providers.CatalogEntry, len(payload.Data))
	for _, entry := range payload.Data {
		catalogByProvider[entry.Provider] = entry
	}

	openAIEntry, ok := catalogByProvider["openai"]
	if !ok {
		t.Fatalf("expected openai catalog entry in %+v", payload.Data)
	}
	if openAIEntry.DefaultModel != "gpt-4o" || !openAIEntry.Configured || !openAIEntry.Authenticated {
		t.Fatalf("expected configured openai catalog entry, got %+v", openAIEntry)
	}

	googleOAuthEntry, ok := catalogByProvider["google-oauth"]
	if !ok {
		t.Fatalf("expected google-oauth catalog entry in %+v", payload.Data)
	}
	if googleOAuthEntry.AuthMethod != "oauth" || googleOAuthEntry.DefaultModel != "google-oauth/gemini" {
		t.Fatalf("expected google-oauth catalog details, got %+v", googleOAuthEntry)
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

	var payload struct {
		Success bool              `json:"success"`
		Data    providers.Summary `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if payload.Data.ProviderCount != 9 {
		t.Fatalf("expected 9 provider catalog entries, got %+v", payload.Data)
	}
	if payload.Data.ConfiguredCount != 2 || payload.Data.AuthenticatedCount != 2 {
		t.Fatalf("expected 2 configured/authenticated providers, got %+v", payload.Data)
	}
	if payload.Data.ExecutableCount != 6 {
		t.Fatalf("expected 6 executable providers, got %+v", payload.Data)
	}
	if len(payload.Data.ByAuthMethod) == 0 || len(payload.Data.ByPreferredTask) == 0 {
		t.Fatalf("expected provider summary buckets, got %+v", payload.Data)
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

	var payload struct {
		Success bool                     `json:"success"`
		Data    providers.RoutingSummary `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if payload.Data.DefaultStrategy != "best" {
		t.Fatalf("expected best default routing strategy, got %+v", payload.Data)
	}
	if len(payload.Data.Tasks) != 6 {
		t.Fatalf("expected 6 routing task summaries, got %+v", payload.Data.Tasks)
	}

	tasksByType := make(map[string]providers.RoutingTaskSummary, len(payload.Data.Tasks))
	for _, task := range payload.Data.Tasks {
		tasksByType[task.TaskType] = task
	}

	codingTask, ok := tasksByType["coding"]
	if !ok {
		t.Fatalf("expected coding task in %+v", payload.Data.Tasks)
	}
	if codingTask.Strategy != "cheapest" || len(codingTask.Candidates) == 0 || codingTask.Candidates[0].Provider != "google" || !codingTask.Candidates[0].Configured {
		t.Fatalf("expected google to lead coding routing, got %+v", codingTask)
	}

	planningTask, ok := tasksByType["planning"]
	if !ok {
		t.Fatalf("expected planning task in %+v", payload.Data.Tasks)
	}
	if planningTask.Strategy != "best" || len(planningTask.Candidates) == 0 || planningTask.Candidates[0].Provider != "anthropic" || !planningTask.Candidates[0].Configured {
		t.Fatalf("expected anthropic to lead planning routing, got %+v", planningTask)
	}
	if len(payload.Data.Limitations) == 0 {
		t.Fatalf("expected routing limitations, got %+v", payload.Data)
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
		case "/trpc/session.logs":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read logs request body: %v", err)
			}
			if !strings.Contains(string(body), `"id":"sess_bridge_1"`) || !strings.Contains(string(body), `"limit":25`) {
				t.Fatalf("expected session logs request payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": []map[string]any{
							{"stream": "stdout", "message": "bridge ok"},
						},
					},
				},
			})
		case "/trpc/session.executeShell":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read executeShell request body: %v", err)
			}
			if !strings.Contains(string(body), `"id":"sess_bridge_1"`) || !strings.Contains(string(body), `"command":"pwd"`) {
				t.Fatalf("expected executeShell payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"command":   "pwd",
							"cwd":       "C:\\workspace\\borg",
							"output":    "C:\\workspace\\borg",
							"exitCode":  0,
							"succeeded": true,
						},
					},
				},
			})
		case "/trpc/session.attachInfo":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read attachInfo request body: %v", err)
			}
			if !strings.Contains(string(body), `"id":"sess_bridge_1"`) {
				t.Fatalf("expected attachInfo payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"attachReadiness":       "ready",
							"attachReadinessReason": "running-with-pid",
							"pid":                   4321,
							"status":                "running",
						},
					},
				},
			})
		case "/trpc/session.health":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read health request body: %v", err)
			}
			if !strings.Contains(string(body), `"id":"sess_bridge_1"`) {
				t.Fatalf("expected health payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"status":      "healthy",
							"isReachable": true,
						},
					},
				},
			})
		case "/trpc/session.getState":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"isAutoDriveActive": true,
							"activeGoal":        "ship go parity",
						},
					},
				},
			})
		case "/trpc/session.updateState":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read updateState request body: %v", err)
			}
			if !strings.Contains(string(body), `"activeGoal":"ship go parity"`) || !strings.Contains(string(body), `"lastObjective":"bridge session ops"`) {
				t.Fatalf("expected updateState payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"success":            true,
							"toolAdvertisements": []string{"Use session logs"},
						},
					},
				},
			})
		case "/trpc/session.clear":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"success": true,
						},
					},
				},
			})
		case "/trpc/session.heartbeat":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"alive": true,
						},
					},
				},
			})
		case "/trpc/session.restore":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"restoredCount": 1,
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

	logsRequest := httptest.NewRequest(http.MethodGet, "/api/sessions/supervisor/logs?id=sess_bridge_1&limit=25", nil)
	logsRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(logsRecorder, logsRequest)
	if logsRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from logs bridge, got %d", logsRecorder.Code)
	}
	if !strings.Contains(logsRecorder.Body.String(), "\"bridge ok\"") || !strings.Contains(logsRecorder.Body.String(), "\"procedure\":\"session.logs\"") {
		t.Fatalf("expected logs bridge payload, got %s", logsRecorder.Body.String())
	}

	executeRequest := httptest.NewRequest(http.MethodPost, "/api/sessions/supervisor/execute-shell", strings.NewReader(`{"id":"sess_bridge_1","command":"pwd"}`))
	executeRequest.Header.Set("content-type", "application/json")
	executeRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(executeRecorder, executeRequest)
	if executeRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from execute-shell bridge, got %d", executeRecorder.Code)
	}
	if !strings.Contains(executeRecorder.Body.String(), "\"procedure\":\"session.executeShell\"") || !strings.Contains(executeRecorder.Body.String(), "\"succeeded\":true") {
		t.Fatalf("expected execute-shell bridge payload, got %s", executeRecorder.Body.String())
	}

	attachInfoRequest := httptest.NewRequest(http.MethodGet, "/api/sessions/supervisor/attach-info?id=sess_bridge_1", nil)
	attachInfoRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(attachInfoRecorder, attachInfoRequest)
	if attachInfoRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from attach-info bridge, got %d", attachInfoRecorder.Code)
	}
	if !strings.Contains(attachInfoRecorder.Body.String(), "\"attachReadiness\":\"ready\"") || !strings.Contains(attachInfoRecorder.Body.String(), "\"procedure\":\"session.attachInfo\"") {
		t.Fatalf("expected attach-info bridge payload, got %s", attachInfoRecorder.Body.String())
	}

	healthRequest := httptest.NewRequest(http.MethodGet, "/api/sessions/supervisor/health?id=sess_bridge_1", nil)
	healthRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(healthRecorder, healthRequest)
	if healthRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from health bridge, got %d", healthRecorder.Code)
	}
	if !strings.Contains(healthRecorder.Body.String(), "\"status\":\"healthy\"") || !strings.Contains(healthRecorder.Body.String(), "\"procedure\":\"session.health\"") {
		t.Fatalf("expected health bridge payload, got %s", healthRecorder.Body.String())
	}

	stateRequest := httptest.NewRequest(http.MethodGet, "/api/sessions/supervisor/state", nil)
	stateRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(stateRecorder, stateRequest)
	if stateRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from state bridge, got %d", stateRecorder.Code)
	}
	if !strings.Contains(stateRecorder.Body.String(), "\"activeGoal\":\"ship go parity\"") || !strings.Contains(stateRecorder.Body.String(), "\"procedure\":\"session.getState\"") {
		t.Fatalf("expected state bridge payload, got %s", stateRecorder.Body.String())
	}

	updateStateRequest := httptest.NewRequest(http.MethodPost, "/api/sessions/supervisor/update-state", strings.NewReader(`{"activeGoal":"ship go parity","lastObjective":"bridge session ops"}`))
	updateStateRequest.Header.Set("content-type", "application/json")
	updateStateRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(updateStateRecorder, updateStateRequest)
	if updateStateRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from update-state bridge, got %d", updateStateRecorder.Code)
	}
	if !strings.Contains(updateStateRecorder.Body.String(), "\"toolAdvertisements\"") || !strings.Contains(updateStateRecorder.Body.String(), "\"procedure\":\"session.updateState\"") {
		t.Fatalf("expected update-state bridge payload, got %s", updateStateRecorder.Body.String())
	}

	clearRequest := httptest.NewRequest(http.MethodPost, "/api/sessions/supervisor/clear", nil)
	clearRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(clearRecorder, clearRequest)
	if clearRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from clear bridge, got %d", clearRecorder.Code)
	}
	if !strings.Contains(clearRecorder.Body.String(), "\"procedure\":\"session.clear\"") {
		t.Fatalf("expected clear bridge payload, got %s", clearRecorder.Body.String())
	}

	heartbeatRequest := httptest.NewRequest(http.MethodPost, "/api/sessions/supervisor/heartbeat", nil)
	heartbeatRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(heartbeatRecorder, heartbeatRequest)
	if heartbeatRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from heartbeat bridge, got %d", heartbeatRecorder.Code)
	}
	if !strings.Contains(heartbeatRecorder.Body.String(), "\"procedure\":\"session.heartbeat\"") || !strings.Contains(heartbeatRecorder.Body.String(), "\"alive\":true") {
		t.Fatalf("expected heartbeat bridge payload, got %s", heartbeatRecorder.Body.String())
	}

	restoreRequest := httptest.NewRequest(http.MethodPost, "/api/sessions/supervisor/restore", nil)
	restoreRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(restoreRecorder, restoreRequest)
	if restoreRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 from restore bridge, got %d", restoreRecorder.Code)
	}
	if !strings.Contains(restoreRecorder.Body.String(), "\"procedure\":\"session.restore\"") || !strings.Contains(restoreRecorder.Body.String(), "\"restoredCount\":1") {
		t.Fatalf("expected restore bridge payload, got %s", restoreRecorder.Body.String())
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
			if !strings.Contains(string(body), `"profile":"repo-coding"`) || (!strings.Contains(string(body), `"query":"search"`) && !strings.Contains(string(body), `"query":"find tool ship"`)) {
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
			if !strings.Contains(bodyText, `"name":"search_tools"`) && !strings.Contains(bodyText, `"name":"list_all_tools"`) && !strings.Contains(bodyText, `"name":"auto_call_tool"`) {
				t.Fatalf("expected supported tool name in bridged callTool body, got %s", bodyText)
			}
			contentText := "done"
			if strings.Contains(bodyText, `"name":"list_all_tools"`) {
				if strings.Contains(bodyText, `"query":"find tool ship"`) && !strings.Contains(bodyText, `"limit":6`) {
					t.Fatalf("expected list_all_tools advertisement limit in payload, got %s", bodyText)
				}
				contentText = "list_all_tools"
			} else if strings.Contains(bodyText, `"name":"auto_call_tool"`) {
				if !strings.Contains(bodyText, `"objective":"find the right tool"`) || !strings.Contains(bodyText, `"context":"repo: borg"`) {
					t.Fatalf("expected auto_call_tool payload, got %s", bodyText)
				}
				contentText = "auto_call_tool"
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
		case "/trpc/mcp.setLifecycleModes":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read setLifecycleModes body: %v", err)
			}
			if !strings.Contains(string(body), `"lazySessionMode":true`) || !strings.Contains(string(body), `"singleActiveServerMode":false`) {
				t.Fatalf("expected lifecycle mode payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"ok": true,
							"lifecycle": map[string]any{
								"lazySessionMode":        true,
								"singleActiveServerMode": false,
							},
						},
					},
				},
			})
		case "/trpc/mcp.addServer":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read addServer body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"runtime-core"`) || !strings.Contains(string(body), `"command":"node"`) {
				t.Fatalf("expected addServer payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{
							"success": true,
							"name":    "runtime-core",
						},
					},
				},
			})
		case "/trpc/mcp.removeServer":
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed to read removeServer body: %v", err)
			}
			if !strings.Contains(string(body), `"name":"runtime-core"`) {
				t.Fatalf("expected removeServer payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"data": map[string]any{
						"json": map[string]any{"success": true},
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
		{name: "auto call tool", method: http.MethodPost, path: "/api/mcp/tools/auto-call", body: `{"objective":"find the right tool","context":"repo: borg"}`, contains: "\"auto_call_tool\"", procedure: "\"procedure\":\"mcp.callTool\""},
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
		{name: "set lifecycle modes", method: http.MethodPost, path: "/api/mcp/lifecycle-modes", body: `{"lazySessionMode":true,"singleActiveServerMode":false}`, contains: "\"lazySessionMode\":true", procedure: "\"procedure\":\"mcp.setLifecycleModes\""},
		{name: "add runtime server", method: http.MethodPost, path: "/api/mcp/runtime-servers/add", body: `{"name":"runtime-core","command":"node","args":["server.js"],"env":{"MODE":"test"}}`, contains: "\"name\":\"runtime-core\"", procedure: "\"procedure\":\"mcp.addServer\""},
		{name: "remove runtime server", method: http.MethodPost, path: "/api/mcp/runtime-servers/remove", body: `{"name":"runtime-core"}`, contains: "\"success\":true", procedure: "\"procedure\":\"mcp.removeServer\""},
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

func TestMCPAutoCallToolNormalizesAliasInputs(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		if r.URL.Path != "/trpc/mcp.callTool" {
			t.Fatalf("unexpected upstream path %s", r.URL.Path)
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("failed to read callTool body: %v", err)
		}
		bodyText := string(body)
		if !strings.Contains(bodyText, `"name":"auto_call_tool"`) {
			t.Fatalf("expected auto_call_tool name, got %s", bodyText)
		}
		if !strings.Contains(bodyText, `"objective":"find the right tool"`) {
			t.Fatalf("expected alias query to normalize into objective, got %s", bodyText)
		}
		if !strings.Contains(bodyText, `"context":"path: src/app.ts; cwd: C:/repo"`) {
			t.Fatalf("expected synthesized context from path/cwd, got %s", bodyText)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"result": map[string]any{
				"data": map[string]any{
					"json": map[string]any{
						"ok": true,
						"result": map[string]any{
							"content": []map[string]any{{"type": "text", "text": "auto_call_tool"}},
						},
					},
				},
			},
		})
	}))
	defer upstream.Close()

	t.Setenv("BORG_TRPC_UPSTREAM", upstream.URL+"/trpc")

	cfg := config.Default()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodPost, "/api/mcp/tools/auto-call", strings.NewReader(`{"query":"find the right tool","path":"src/app.ts","cwd":"C:/repo"}`))
	request.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"auto_call_tool"`) {
		t.Fatalf("expected auto_call_tool response, got %s", recorder.Body.String())
	}
}

func TestMCPReadRoutesFallBackToLocalSummary(t *testing.T) {
	workspaceRoot := t.TempDir()
	toolsDir := filepath.Join(workspaceRoot, "submodules", "hypercode", "tools")
	if err := os.MkdirAll(toolsDir, 0o755); err != nil {
		t.Fatalf("failed to create hypercode tools dir: %v", err)
	}
	toolSource := `package tools

var SearchTools = struct{
	Name string
}{
	Name: "search_tools",
}

var AutoCallTool = struct{
	Name string
}{
	Name: "auto_call_tool",
}
`
	if err := os.WriteFile(filepath.Join(toolsDir, "registry.go"), []byte(toolSource), 0o644); err != nil {
		t.Fatalf("failed to write hypercode tool source: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{tools: []controlplane.Tool{
		{Type: "go", Name: "Go", Command: "go", Available: true},
	}})

	cases := []struct {
		name     string
		path     string
		contains []string
	}{
		{
			name: "status",
			path: "/api/mcp/status",
			contains: []string{
				`"fallback":"go-local-mcp"`,
				`"procedure":"mcp.getStatus"`,
				`"sourceBackedHarnessCount":1`,
			},
		},
		{
			name: "runtime servers",
			path: "/api/mcp/servers/runtime",
			contains: []string{
				`"fallback":"go-local-mcp"`,
				`"name":"hypercode"`,
				`"toolInventoryStatus":"source-backed"`,
			},
		},
		{
			name: "tools",
			path: "/api/mcp/tools",
			contains: []string{
				`"fallback":"go-local-mcp"`,
				`"name":"search_tools"`,
				`"server":"hypercode"`,
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tc.path, nil)
			recorder := httptest.NewRecorder()
			server.Handler().ServeHTTP(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}
			for _, needle := range tc.contains {
				if !strings.Contains(recorder.Body.String(), needle) {
					t.Fatalf("expected response to contain %s, got %s", needle, recorder.Body.String())
				}
			}
		})
	}
}

func TestMCPSearchToolsFallsBackToLocalInventory(t *testing.T) {
	workspaceRoot := t.TempDir()
	toolsDir := filepath.Join(workspaceRoot, "submodules", "hypercode", "tools")
	if err := os.MkdirAll(toolsDir, 0o755); err != nil {
		t.Fatalf("failed to create hypercode tools dir: %v", err)
	}
	toolSource := `package tools

var SearchTools = struct{
	Name string
}{
	Name: "search_tools",
}
`
	if err := os.WriteFile(filepath.Join(toolsDir, "search.go"), []byte(toolSource), 0o644); err != nil {
		t.Fatalf("failed to write hypercode tool source: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{tools: []controlplane.Tool{
		{Type: "go", Name: "Go", Command: "go", Available: true},
	}})

	request := httptest.NewRequest(http.MethodGet, "/api/mcp/tools/search?query=search", nil)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-local-mcp"`) {
		t.Fatalf("expected go-local-mcp fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"procedure":"mcp.searchTools"`) {
		t.Fatalf("expected searchTools procedure metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"name":"search_tools"`) {
		t.Fatalf("expected local source-backed search result, got %s", recorder.Body.String())
	}
}

func TestMCPRegistrySnapshotFallsBackToMasterIndex(t *testing.T) {
	workspaceRoot := t.TempDir()
	indexContent := `{
  // comment
  "categories": {
    "mcpServers": [
      {
        "id": "mcp-1",
        "name": "Core MCP",
        "url": "https://example.com/mcp",
        "description": "Core MCP server",
        "tags": ["mcp", "tools"]
      }
    ],
    "other": [
      {
        "id": "other-1",
        "name": "Not MCP",
        "url": "https://example.com/other",
        "description": "Ignore me"
      }
    ]
  }
}`
	if err := os.WriteFile(filepath.Join(workspaceRoot, "BORG_MASTER_INDEX.jsonc"), []byte(indexContent), 0o644); err != nil {
		t.Fatalf("failed to write master index fixture: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodGet, "/api/mcp/servers/registry-snapshot", nil)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-master-index"`) {
		t.Fatalf("expected go-master-index fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"name":"Core MCP"`) {
		t.Fatalf("expected MCP-like registry entry, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), `"name":"Not MCP"`) {
		t.Fatalf("expected non-MCP entry to be filtered, got %s", recorder.Body.String())
	}
}

func TestMCPJsoncEditorFallsBackToLocalFile(t *testing.T) {
	mainConfigDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(mainConfigDir, "mcp.jsonc"), []byte("// Borg MCP configuration\n{\n  \"mcpServers\": {}\n}\n"), 0o644); err != nil {
		t.Fatalf("failed to write local mcp jsonc: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.ConfigDir = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodGet, "/api/mcp/config/jsonc", nil)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-local-jsonc"`) {
		t.Fatalf("expected go-local-jsonc fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"path":"`) || !strings.Contains(recorder.Body.String(), `"content":"// Borg MCP configuration`) {
		t.Fatalf("expected local editor payload, got %s", recorder.Body.String())
	}
}

func TestMCPJsoncEditorSaveFallsBackToLocalWrite(t *testing.T) {
	mainConfigDir := t.TempDir()
	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.ConfigDir = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodPost, "/api/mcp/config/jsonc", strings.NewReader(`{"content":"// comment\n{\"mcpServers\":{\"core\":{\"command\":\"node\",\"_meta\":{\"toolCount\":1}}},\"settings\":{\"x\":1}}"}`))
	request.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-local-jsonc"`) {
		t.Fatalf("expected go-local-jsonc fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"ok":true`) {
		t.Fatalf("expected ok response, got %s", recorder.Body.String())
	}

	jsoncContent, err := os.ReadFile(filepath.Join(mainConfigDir, "mcp.jsonc"))
	if err != nil {
		t.Fatalf("expected local mcp.jsonc to be written: %v", err)
	}
	if !strings.Contains(string(jsoncContent), `"settings"`) || !strings.Contains(string(jsoncContent), `"_meta"`) {
		t.Fatalf("expected jsonc file to preserve settings and _meta, got %s", string(jsoncContent))
	}

	jsonContent, err := os.ReadFile(filepath.Join(mainConfigDir, "mcp.json"))
	if err != nil {
		t.Fatalf("expected compatibility mcp.json to be written: %v", err)
	}
	if strings.Contains(string(jsonContent), `"_meta"`) || strings.Contains(string(jsonContent), `"settings"`) {
		t.Fatalf("expected compatibility json to strip _meta and settings, got %s", string(jsonContent))
	}
}

func TestMCPConfiguredServersFallBackToLocalJsonc(t *testing.T) {
	mainConfigDir := t.TempDir()
	jsoncContent := `// Borg MCP configuration
{
  "mcpServers": {
    "core": {
      "command": "node",
      "args": ["server.js"],
      "description": "Core server",
      "_meta": {
        "toolCount": 1
      }
    }
  }
}
`
	if err := os.WriteFile(filepath.Join(mainConfigDir, "mcp.jsonc"), []byte(jsoncContent), 0o644); err != nil {
		t.Fatalf("failed to write local mcp jsonc: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	listRequest := httptest.NewRequest(http.MethodGet, "/api/mcp/servers/configured", nil)
	listRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(listRecorder, listRequest)

	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected fallback list status 200, got %d with body %s", listRecorder.Code, listRecorder.Body.String())
	}
	if !strings.Contains(listRecorder.Body.String(), `"fallback":"go-local-jsonc"`) {
		t.Fatalf("expected go-local-jsonc fallback metadata, got %s", listRecorder.Body.String())
	}
	if !strings.Contains(listRecorder.Body.String(), `"name":"core"`) || !strings.Contains(listRecorder.Body.String(), `"command":"node"`) {
		t.Fatalf("expected configured server from local jsonc, got %s", listRecorder.Body.String())
	}

	expectedUUID := syntheticServerUUID("core")
	getRequest := httptest.NewRequest(http.MethodGet, "/api/mcp/servers/get?uuid="+expectedUUID, nil)
	getRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(getRecorder, getRequest)

	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected fallback get status 200, got %d with body %s", getRecorder.Code, getRecorder.Body.String())
	}
	if !strings.Contains(getRecorder.Body.String(), `"uuid":"`+expectedUUID+`"`) {
		t.Fatalf("expected synthetic uuid %s, got %s", expectedUUID, getRecorder.Body.String())
	}
	if !strings.Contains(getRecorder.Body.String(), `"name":"core"`) {
		t.Fatalf("expected configured server get payload, got %s", getRecorder.Body.String())
	}
}

func TestMCPSyncTargetsAndExportFallBackToLocalJsonc(t *testing.T) {
	mainConfigDir := t.TempDir()
	jsoncContent := `// Borg MCP configuration
{
  "mcpServers": {
    "core": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
`
	if err := os.WriteFile(filepath.Join(mainConfigDir, "mcp.jsonc"), []byte(jsoncContent), 0o644); err != nil {
		t.Fatalf("failed to write local mcp jsonc: %v", err)
	}

	appData := t.TempDir()
	t.Setenv("APPDATA", appData)
	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	syncRequest := httptest.NewRequest(http.MethodGet, "/api/mcp/servers/sync-targets", nil)
	syncRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(syncRecorder, syncRequest)

	if syncRecorder.Code != http.StatusOK {
		t.Fatalf("expected sync-targets fallback status 200, got %d with body %s", syncRecorder.Code, syncRecorder.Body.String())
	}
	if !strings.Contains(syncRecorder.Body.String(), `"fallback":"go-local-jsonc"`) {
		t.Fatalf("expected go-local-jsonc fallback metadata, got %s", syncRecorder.Body.String())
	}
	if !strings.Contains(syncRecorder.Body.String(), `"client":"claude-desktop"`) {
		t.Fatalf("expected claude-desktop sync target, got %s", syncRecorder.Body.String())
	}

	exportRequest := httptest.NewRequest(http.MethodGet, "/api/mcp/servers/export-client-config?client=claude-desktop", nil)
	exportRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(exportRecorder, exportRequest)

	if exportRecorder.Code != http.StatusOK {
		t.Fatalf("expected export fallback status 200, got %d with body %s", exportRecorder.Code, exportRecorder.Body.String())
	}
	if !strings.Contains(exportRecorder.Body.String(), `"procedure":"mcpServers.exportClientConfig"`) {
		t.Fatalf("expected export procedure metadata, got %s", exportRecorder.Body.String())
	}
	if !strings.Contains(exportRecorder.Body.String(), `"client":"claude-desktop"`) || !strings.Contains(exportRecorder.Body.String(), `"core"`) || !strings.Contains(exportRecorder.Body.String(), `"command":"node"`) {
		t.Fatalf("expected local client config preview, got %s", exportRecorder.Body.String())
	}
}

func TestMCPToolPreferencesFallBackToLocalJsonc(t *testing.T) {
	mainConfigDir := t.TempDir()
	jsoncContent := `// Borg MCP configuration
{
  "mcpServers": {},
  "settings": {
    "toolSelection": {
      "importantTools": ["search_tools"],
      "alwaysLoadedTools": ["search_tools"],
      "autoLoadMinConfidence": 0.9,
      "maxLoadedTools": 12,
      "maxHydratedSchemas": 6,
      "idleEvictionThresholdMs": 120000
    }
  }
}
`
	if err := os.WriteFile(filepath.Join(mainConfigDir, "mcp.jsonc"), []byte(jsoncContent), 0o644); err != nil {
		t.Fatalf("failed to write local mcp jsonc: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	getRequest := httptest.NewRequest(http.MethodGet, "/api/mcp/preferences", nil)
	getRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(getRecorder, getRequest)

	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected get fallback status 200, got %d with body %s", getRecorder.Code, getRecorder.Body.String())
	}
	if !strings.Contains(getRecorder.Body.String(), `"fallback":"go-local-jsonc"`) {
		t.Fatalf("expected go-local-jsonc fallback metadata, got %s", getRecorder.Body.String())
	}
	if !strings.Contains(getRecorder.Body.String(), `"importantTools":["search_tools"]`) || !strings.Contains(getRecorder.Body.String(), `"maxLoadedTools":12`) {
		t.Fatalf("expected local tool preferences payload, got %s", getRecorder.Body.String())
	}

	postRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/preferences", strings.NewReader(`{"importantTools":["search_tools","auto_call_tool"],"maxLoadedTools":20}`))
	postRequest.Header.Set("content-type", "application/json")
	postRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(postRecorder, postRequest)

	if postRecorder.Code != http.StatusOK {
		t.Fatalf("expected post fallback status 200, got %d with body %s", postRecorder.Code, postRecorder.Body.String())
	}
	if !strings.Contains(postRecorder.Body.String(), `"ok":true`) {
		t.Fatalf("expected updated tool preferences response, got %s", postRecorder.Body.String())
	}

	jsoncWritten, err := os.ReadFile(filepath.Join(mainConfigDir, "mcp.jsonc"))
	if err != nil {
		t.Fatalf("expected updated jsonc preferences file: %v", err)
	}
	if strings.Contains(postRecorder.Body.String(), `"fallback":"go-local-jsonc"`) && (!strings.Contains(string(jsoncWritten), `"auto_call_tool"`) || !strings.Contains(string(jsoncWritten), `"maxLoadedTools": 20`)) {
		t.Fatalf("expected persisted updated preferences, got %s", string(jsoncWritten))
	}
}

func TestMCPConfiguredServerMutationsFallBackToLocalJsonc(t *testing.T) {
	mainConfigDir := t.TempDir()
	initialConfig := `// Borg MCP configuration
{
  "mcpServers": {
    "core": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
`
	if err := os.WriteFile(filepath.Join(mainConfigDir, "mcp.jsonc"), []byte(initialConfig), 0o644); err != nil {
		t.Fatalf("failed to seed local mcp jsonc: %v", err)
	}

	appData := t.TempDir()
	t.Setenv("APPDATA", appData)
	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	createRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/create", strings.NewReader(`{"name":"alpha","type":"STDIO","command":"python","args":["srv.py"]}`))
	createRequest.Header.Set("content-type", "application/json")
	createRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(createRecorder, createRequest)
	if createRecorder.Code != http.StatusOK || !strings.Contains(createRecorder.Body.String(), `"fallback":"go-local-jsonc"`) || !strings.Contains(createRecorder.Body.String(), `"name":"alpha"`) {
		t.Fatalf("expected create fallback response, got %d %s", createRecorder.Code, createRecorder.Body.String())
	}

	alphaUUID := syntheticServerUUID("alpha")
	updateRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/update", strings.NewReader(`{"uuid":"`+alphaUUID+`","name":"alpha-renamed","command":"python3"}`))
	updateRequest.Header.Set("content-type", "application/json")
	updateRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(updateRecorder, updateRequest)
	if updateRecorder.Code != http.StatusOK || !strings.Contains(updateRecorder.Body.String(), `"name":"alpha-renamed"`) {
		t.Fatalf("expected update fallback response, got %d %s", updateRecorder.Code, updateRecorder.Body.String())
	}

	bulkRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/bulk-import", strings.NewReader(`[{"name":"beta","type":"STDIO","command":"node","args":["beta.js"]}]`))
	bulkRequest.Header.Set("content-type", "application/json")
	bulkRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(bulkRecorder, bulkRequest)
	if bulkRecorder.Code != http.StatusOK || !strings.Contains(bulkRecorder.Body.String(), `"name":"beta"`) {
		t.Fatalf("expected bulk import fallback response, got %d %s", bulkRecorder.Code, bulkRecorder.Body.String())
	}

	syncRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/sync-client-config", strings.NewReader(`{"client":"claude-desktop"}`))
	syncRequest.Header.Set("content-type", "application/json")
	syncRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(syncRecorder, syncRequest)
	if syncRecorder.Code != http.StatusOK || !strings.Contains(syncRecorder.Body.String(), `"written":true`) {
		t.Fatalf("expected sync-client-config fallback response, got %d %s", syncRecorder.Code, syncRecorder.Body.String())
	}

	deleteRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/delete", strings.NewReader(`{"uuid":"`+syntheticServerUUID("beta")+`"}`))
	deleteRequest.Header.Set("content-type", "application/json")
	deleteRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(deleteRecorder, deleteRequest)
	if deleteRecorder.Code != http.StatusOK || !strings.Contains(deleteRecorder.Body.String(), `"ok":true`) {
		t.Fatalf("expected delete fallback response, got %d %s", deleteRecorder.Code, deleteRecorder.Body.String())
	}

	jsoncWritten, err := os.ReadFile(filepath.Join(mainConfigDir, "mcp.jsonc"))
	if err != nil {
		t.Fatalf("expected jsonc file to exist: %v", err)
	}
	if !strings.Contains(string(jsoncWritten), `"alpha-renamed"`) || strings.Contains(string(jsoncWritten), `"beta"`) {
		t.Fatalf("expected persisted create/update/delete state, got %s", string(jsoncWritten))
	}
}

func TestMCPConfiguredServerMetadataMutationsFallBackToLocalJsonc(t *testing.T) {
	mainConfigDir := t.TempDir()
	jsoncContent := `// Borg MCP configuration
{
  "mcpServers": {
    "core": {
      "command": "node",
      "args": ["server.js"],
      "_meta": {
        "status": "ready",
        "toolCount": 2,
        "tools": [{"name":"search"}]
      }
    }
  }
}
`
	if err := os.WriteFile(filepath.Join(mainConfigDir, "mcp.jsonc"), []byte(jsoncContent), 0o644); err != nil {
		t.Fatalf("failed to seed local mcp jsonc: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")
	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.ConfigDir = t.TempDir()
	cfg.MainConfigDir = mainConfigDir
	server := New(cfg, stubDetector{})

	uuid := syntheticServerUUID("core")
	reloadRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/reload-metadata", strings.NewReader(`{"uuid":"`+uuid+`","mode":"binary"}`))
	reloadRequest.Header.Set("content-type", "application/json")
	reloadRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(reloadRecorder, reloadRequest)
	if reloadRecorder.Code != http.StatusOK || !strings.Contains(reloadRecorder.Body.String(), `"reloadDecision":"go-local-placeholder"`) || !strings.Contains(reloadRecorder.Body.String(), `"fallback":"go-local-jsonc"`) {
		t.Fatalf("expected reload metadata fallback response, got %d %s", reloadRecorder.Code, reloadRecorder.Body.String())
	}

	clearRequest := httptest.NewRequest(http.MethodPost, "/api/mcp/servers/clear-metadata-cache", strings.NewReader(`{"uuid":"`+uuid+`"}`))
	clearRequest.Header.Set("content-type", "application/json")
	clearRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(clearRecorder, clearRequest)
	if clearRecorder.Code != http.StatusOK || !strings.Contains(clearRecorder.Body.String(), `"toolCount":0`) || !strings.Contains(clearRecorder.Body.String(), `"ok":true`) {
		t.Fatalf("expected clear metadata fallback response, got %d %s", clearRecorder.Code, clearRecorder.Body.String())
	}

	written, err := os.ReadFile(filepath.Join(mainConfigDir, "mcp.jsonc"))
	if err != nil {
		t.Fatalf("expected updated jsonc file: %v", err)
	}
	if !strings.Contains(string(written), `"status": "pending"`) || !strings.Contains(string(written), `"toolCount": 0`) || !strings.Contains(string(written), `Cache cleared at`) {
		t.Fatalf("expected cleared metadata cache state, got %s", string(written))
	}
}

func TestSkillsFallBackToLocalSkillRegistry(t *testing.T) {
	workspaceRoot := t.TempDir()
	skillDir := filepath.Join(workspaceRoot, ".borg", "skills", "debug")
	if err := os.MkdirAll(skillDir, 0o755); err != nil {
		t.Fatalf("failed to create skill dir: %v", err)
	}
	initialSkill := "---\nname: debug\ndescription: Debug help\n---\n\n# Debug\n\nSkill content\n"
	if err := os.WriteFile(filepath.Join(skillDir, "SKILL.md"), []byte(initialSkill), 0o644); err != nil {
		t.Fatalf("failed to seed skill: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")
	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.ConfigDir = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	listRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(listRecorder, httptest.NewRequest(http.MethodGet, "/api/skills", nil))
	if listRecorder.Code != http.StatusOK || !strings.Contains(listRecorder.Body.String(), `"fallback":"go-local-skills"`) || !strings.Contains(listRecorder.Body.String(), `"name":"debug"`) {
		t.Fatalf("expected local skills list fallback, got %d %s", listRecorder.Code, listRecorder.Body.String())
	}

	summaryRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(summaryRecorder, httptest.NewRequest(http.MethodGet, "/api/skills/summary?query=deb", nil))
	if summaryRecorder.Code != http.StatusOK || !strings.Contains(summaryRecorder.Body.String(), `"folder":"debug"`) {
		t.Fatalf("expected local skills summary fallback, got %d %s", summaryRecorder.Code, summaryRecorder.Body.String())
	}

	readRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(readRecorder, httptest.NewRequest(http.MethodGet, "/api/skills/read?name=debug", nil))
	if readRecorder.Code != http.StatusOK || !strings.Contains(readRecorder.Body.String(), `Skill content`) {
		t.Fatalf("expected local skills read fallback, got %d %s", readRecorder.Code, readRecorder.Body.String())
	}

	createRequest := httptest.NewRequest(http.MethodPost, "/api/skills/create", strings.NewReader(`{"id":"trace","name":"trace","description":"Trace help"}`))
	createRequest.Header.Set("content-type", "application/json")
	createRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(createRecorder, createRequest)
	if createRecorder.Code != http.StatusOK || !strings.Contains(createRecorder.Body.String(), `Created skill 'trace'`) {
		t.Fatalf("expected local skills create fallback, got %d %s", createRecorder.Code, createRecorder.Body.String())
	}

	saveRequest := httptest.NewRequest(http.MethodPost, "/api/skills/save", strings.NewReader(`{"id":"trace","content":"Updated content"}`))
	saveRequest.Header.Set("content-type", "application/json")
	saveRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(saveRecorder, saveRequest)
	if saveRecorder.Code != http.StatusOK || !strings.Contains(saveRecorder.Body.String(), `"Saved skill 'trace'."`) {
		t.Fatalf("expected local skills save fallback, got %d %s", saveRecorder.Code, saveRecorder.Body.String())
	}

	writtenSkill, err := os.ReadFile(filepath.Join(workspaceRoot, ".borg", "skills", "trace", "SKILL.md"))
	if err != nil {
		t.Fatalf("expected created skill file: %v", err)
	}
	if string(writtenSkill) != "Updated content" {
		t.Fatalf("expected saved skill content, got %s", string(writtenSkill))
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

func TestImportedSessionScanFallsBackToGoScanner(t *testing.T) {
	workspaceRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(workspaceRoot, ".claude"), 0o755); err != nil {
		t.Fatalf("failed to create claude root: %v", err)
	}
	if err := os.WriteFile(filepath.Join(workspaceRoot, ".claude", "session.jsonl"), []byte("{\"model\":\"claude\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to seed claude session: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodPost, "/api/sessions/imported/scan", strings.NewReader(`{"force":true}`))
	request.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-sessionimport"`) {
		t.Fatalf("expected go-sessionimport fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"discoveredCount":`) {
		t.Fatalf("expected discoveredCount in fallback summary, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"claude-code"`) {
		t.Fatalf("expected claude-code tool in fallback summary, got %s", recorder.Body.String())
	}
}

func TestImportedSessionListFallsBackToGoScanner(t *testing.T) {
	workspaceRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(workspaceRoot, ".claude"), 0o755); err != nil {
		t.Fatalf("failed to create claude root: %v", err)
	}
	sessionPath := filepath.Join(workspaceRoot, ".claude", "session.jsonl")
	if err := os.WriteFile(sessionPath, []byte("{\"model\":\"claude\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to seed claude session: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodGet, "/api/sessions/imported/list?limit=5", nil)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-sessionimport"`) {
		t.Fatalf("expected go-sessionimport fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"sourceTool":"`) {
		t.Fatalf("expected at least one fallback sourceTool entry, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"parsedMemories":[]`) {
		t.Fatalf("expected empty parsed memories in fallback entry, got %s", recorder.Body.String())
	}
}

func TestImportedSessionGetFallsBackToGoScanner(t *testing.T) {
	workspaceRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(workspaceRoot, ".claude"), 0o755); err != nil {
		t.Fatalf("failed to create claude root: %v", err)
	}
	if err := os.WriteFile(filepath.Join(workspaceRoot, ".claude", "session.jsonl"), []byte("{\"model\":\"claude\"}\n"), 0o644); err != nil {
		t.Fatalf("failed to seed claude session: %v", err)
	}

	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = workspaceRoot
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	candidates, err := server.scanValidatedImportSources()
	if err != nil {
		t.Fatalf("failed to scan validated import sources: %v", err)
	}
	records := server.importedSessionFallbackRecords(candidates)
	if len(records) == 0 {
		t.Fatalf("expected at least one fallback imported session record")
	}

	request := httptest.NewRequest(http.MethodGet, "/api/sessions/imported/get?id="+records[0].ID, nil)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-sessionimport"`) {
		t.Fatalf("expected go-sessionimport fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"id":"`+records[0].ID+`"`) {
		t.Fatalf("expected fallback imported session id %s, got %s", records[0].ID, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"sourceTool":"`+records[0].SourceTool+`"`) {
		t.Fatalf("expected sourceTool %s in fallback entry, got %s", records[0].SourceTool, recorder.Body.String())
	}
}

func TestImportedInstructionDocsFallsBackToEmptyList(t *testing.T) {
	t.Setenv("BORG_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})

	request := httptest.NewRequest(http.MethodGet, "/api/sessions/imported/instruction-docs", nil)
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"fallback":"go-sessionimport"`) {
		t.Fatalf("expected go-sessionimport fallback metadata, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"data":[]`) {
		t.Fatalf("expected empty instruction doc fallback list, got %s", recorder.Body.String())
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
		case "/trpc/memory.saveContext":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"source":"docs"`) || !strings.Contains(string(body), `"url":"https://example.com"`) {
				t.Fatalf("expected memory.saveContext payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "id": "ctx-2"}}}})
		case "/trpc/memory.addFact":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"content":"remember this"`) {
				t.Fatalf("expected memory.addFact payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true}}}})
		case "/trpc/memory.recordObservation":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"content":"Observation"`) {
				t.Fatalf("expected memory.recordObservation payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "memory": map[string]any{"id": "obs-1"}}}}})
		case "/trpc/memory.captureUserPrompt":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"content":"Need help"`) {
				t.Fatalf("expected memory.captureUserPrompt payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "memory": map[string]any{"id": "prompt-1"}}}}})
		case "/trpc/memory.getRecentObservations":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":5`) {
				t.Fatalf("expected memory.getRecentObservations payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "obs-1", "content": "Observation"}}}}})
		case "/trpc/memory.searchObservations":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"signal"`) {
				t.Fatalf("expected memory.searchObservations payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "obs-2", "content": "signal"}}}}})
		case "/trpc/memory.getRecentUserPrompts":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"limit":4`) {
				t.Fatalf("expected memory.getRecentUserPrompts payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "prompt-1", "content": "Need help"}}}}})
		case "/trpc/memory.searchUserPrompts":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"query":"help"`) {
				t.Fatalf("expected memory.searchUserPrompts payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "prompt-2", "content": "help"}}}}})
		case "/trpc/memory.searchMemoryPivot":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"pivotMemoryId":"mem-1"`) {
				t.Fatalf("expected memory.searchMemoryPivot payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "pivot-1", "score": 0.9}}}}})
		case "/trpc/memory.getMemoryTimelineWindow":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"centerMemoryId":"mem-1"`) {
				t.Fatalf("expected memory.getMemoryTimelineWindow payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"id": "timeline-1"}}}}})
		case "/trpc/memory.getCrossSessionMemoryLinks":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"memoryId":"mem-1"`) {
				t.Fatalf("expected memory.getCrossSessionMemoryLinks payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []map[string]any{{"sessionId": "sess-2", "memoryId": "mem-9"}}}}})
		case "/trpc/memory.captureSessionSummary":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"sessionId":"sess-1"`) {
				t.Fatalf("expected memory.captureSessionSummary payload, got %s", string(body))
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"success": true, "memory": map[string]any{"id": "summary-1"}}}}})
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
		case "/trpc/memory.getSectionedMemoryStatus":
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": map[string]any{"available": true, "sections": []any{}}}}})
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
		{name: "memory save context", method: http.MethodPost, path: "/api/memory/context/save", body: `{"source":"docs","url":"https://example.com","content":"hello world"}`, contains: "\"id\":\"ctx-2\"", procedure: "\"procedure\":\"memory.saveContext\""},
		{name: "memory get context", method: http.MethodGet, path: "/api/memory/context/get?id=ctx-1", contains: "\"content\":\"hello\"", procedure: "\"procedure\":\"memory.getContext\""},
		{name: "memory delete context", method: http.MethodPost, path: "/api/memory/context/delete", body: `{"id":"ctx-1"}`, contains: "\"success\":true", procedure: "\"procedure\":\"memory.deleteContext\""},
		{name: "memory agent stats", method: http.MethodGet, path: "/api/memory/agent-stats", contains: "\"total\":6", procedure: "\"procedure\":\"memory.getAgentStats\""},
		{name: "memory agent search", method: http.MethodGet, path: "/api/memory/agent-search?query=memory&type=working&limit=5", contains: "\"memory result\"", procedure: "\"procedure\":\"memory.searchAgentMemory\""},
		{name: "memory add fact", method: http.MethodPost, path: "/api/memory/facts/add", body: `{"content":"remember this","type":"working"}`, contains: "\"success\":true", procedure: "\"procedure\":\"memory.addFact\""},
		{name: "memory record observation", method: http.MethodPost, path: "/api/memory/observations/record", body: `{"content":"Observation","type":"fact","namespace":"ops"}`, contains: "\"obs-1\"", procedure: "\"procedure\":\"memory.recordObservation\""},
		{name: "memory recent observations", method: http.MethodGet, path: "/api/memory/observations/recent?limit=5&namespace=ops&type=fact", contains: "\"Observation\"", procedure: "\"procedure\":\"memory.getRecentObservations\""},
		{name: "memory search observations", method: http.MethodGet, path: "/api/memory/observations/search?query=signal&limit=5&namespace=ops&type=fact", contains: "\"signal\"", procedure: "\"procedure\":\"memory.searchObservations\""},
		{name: "memory capture prompt", method: http.MethodPost, path: "/api/memory/user-prompts/capture", body: `{"content":"Need help","role":"user"}`, contains: "\"prompt-1\"", procedure: "\"procedure\":\"memory.captureUserPrompt\""},
		{name: "memory recent prompts", method: http.MethodGet, path: "/api/memory/user-prompts/recent?limit=4&role=user", contains: "\"Need help\"", procedure: "\"procedure\":\"memory.getRecentUserPrompts\""},
		{name: "memory search prompts", method: http.MethodGet, path: "/api/memory/user-prompts/search?query=help&limit=4&role=user", contains: "\"help\"", procedure: "\"procedure\":\"memory.searchUserPrompts\""},
		{name: "memory pivot search", method: http.MethodPost, path: "/api/memory/pivot/search", body: `{"pivotMemoryId":"mem-1","limit":5}`, contains: "\"pivot-1\"", procedure: "\"procedure\":\"memory.searchMemoryPivot\""},
		{name: "memory timeline window", method: http.MethodPost, path: "/api/memory/timeline/window", body: `{"centerMemoryId":"mem-1","before":2,"after":2}`, contains: "\"timeline-1\"", procedure: "\"procedure\":\"memory.getMemoryTimelineWindow\""},
		{name: "memory cross session links", method: http.MethodPost, path: "/api/memory/cross-session-links", body: `{"memoryId":"mem-1","limit":5}`, contains: "\"sess-2\"", procedure: "\"procedure\":\"memory.getCrossSessionMemoryLinks\""},
		{name: "memory session bootstrap", method: http.MethodGet, path: "/api/memory/session-bootstrap?activeGoal=ship%20parity", contains: "\"activeGoal\":\"ship parity\"", procedure: "\"procedure\":\"memory.getSessionBootstrap\""},
		{name: "memory tool context", method: http.MethodGet, path: "/api/memory/tool-context?toolName=search_tools", contains: "\"toolName\":\"search_tools\"", procedure: "\"procedure\":\"memory.getToolContext\""},
		{name: "capture session summary", method: http.MethodPost, path: "/api/memory/session-summaries/capture", body: `{"sessionId":"sess-1","status":"stopped"}`, contains: "\"summary-1\"", procedure: "\"procedure\":\"memory.captureSessionSummary\""},
		{name: "recent session summaries", method: http.MethodGet, path: "/api/memory/session-summaries/recent?limit=5", contains: "\"sessionId\":\"sess-1\"", procedure: "\"procedure\":\"memory.getRecentSessionSummaries\""},
		{name: "search session summaries", method: http.MethodGet, path: "/api/memory/session-summaries/search?query=recent&limit=5", contains: "\"summary\":\"recent\"", procedure: "\"procedure\":\"memory.searchSessionSummaries\""},
		{name: "memory sectioned status", method: http.MethodGet, path: "/api/memory/sectioned-status", contains: "\"available\":true", procedure: "\"procedure\":\"memory.getSectionedMemoryStatus\""},
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
			_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"data": map[string]any{"json": []any{map[string]any{"id": "skill-1", "name": "debug", "description": "Debug help", "content": "Use rg", "path": "skills/debug/SKILL.md"}}}}})
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
		{name: "skills summary", method: http.MethodGet, path: "/api/skills/summary?query=deb", contains: `"folder":"debug"`, procedure: `"procedure":"skills.list"`},
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
	if payload.Data[0].LastModifiedAt == "" {
		t.Fatalf("expected last modified timestamp, got %+v", payload.Data[0])
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
	homeChatGPTRoot := filepath.Join(homeDir, "ChatGPT")
	if err := os.MkdirAll(homeChatGPTRoot, 0o755); err != nil {
		t.Fatalf("failed to create home ChatGPT root: %v", err)
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
	if len(payload.Data) != 26 {
		t.Fatalf("expected 26 import roots after expanded discovery coverage, got %+v", payload.Data)
	}

	rootsByKey := make(map[string]sessionimport.RootStatus, len(payload.Data))
	for _, root := range payload.Data {
		rootsByKey[root.SourceTool+"\n"+root.RootPath] = root
	}

	claudeStatus, ok := rootsByKey["claude-code\n"+claudeRoot]
	if !ok {
		t.Fatalf("expected claude-code workspace root %s in %+v", claudeRoot, payload.Data)
	}
	if !claudeStatus.Exists {
		t.Fatalf("expected claude root to exist, got %+v", claudeStatus)
	}

	homeChatGPTStatus, ok := rootsByKey["openai\n"+homeChatGPTRoot]
	if !ok {
		t.Fatalf("expected openai home ChatGPT root %s in %+v", homeChatGPTRoot, payload.Data)
	}
	if !homeChatGPTStatus.Exists {
		t.Fatalf("expected home ChatGPT root to exist, got %+v", homeChatGPTStatus)
	}

	copilotRoot := filepath.Join(tempDir, ".copilot", "session-state")
	copilotStatus, ok := rootsByKey["copilot-cli\n"+copilotRoot]
	if !ok {
		t.Fatalf("expected copilot-cli root %s in %+v", copilotRoot, payload.Data)
	}
	if copilotStatus.Exists {
		t.Fatalf("expected copilot root to be absent in this fixture, got %+v", copilotStatus)
	}

	documentsOpenAIRoot := filepath.Join(homeDir, "Documents", "OpenAI")
	documentsOpenAIStatus, ok := rootsByKey["openai\n"+documentsOpenAIRoot]
	if !ok {
		t.Fatalf("expected documents OpenAI root %s in %+v", documentsOpenAIRoot, payload.Data)
	}
	if documentsOpenAIStatus.Exists {
		t.Fatalf("expected documents OpenAI root to be absent in this fixture, got %+v", documentsOpenAIStatus)
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

	var payload struct {
		Success bool                           `json:"success"`
		Data    sessionimport.ValidationResult `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if !payload.Success {
		t.Fatalf("expected success payload, got %s", recorder.Body.String())
	}
	if !payload.Data.Valid {
		t.Fatalf("expected validated import candidate, got %+v", payload.Data)
	}
	if payload.Data.SourceTool != "claude-code" {
		t.Fatalf("expected claude-code source tool, got %+v", payload.Data)
	}
	if payload.Data.SourceType != "session" {
		t.Fatalf("expected session source type, got %+v", payload.Data)
	}
	if payload.Data.Format != "jsonl" {
		t.Fatalf("expected jsonl format, got %+v", payload.Data)
	}
	if payload.Data.SourcePath != targetPath {
		t.Fatalf("expected source path %s, got %s", targetPath, payload.Data.SourcePath)
	}
	if payload.Data.EstimatedSize <= 0 {
		t.Fatalf("expected positive estimated size, got %+v", payload.Data)
	}
	if len(payload.Data.DetectedModels) != 0 {
		t.Fatalf("expected no detected model hints for simple fixture, got %+v", payload.Data)
	}
	if len(payload.Data.Errors) != 0 {
		t.Fatalf("expected no validation errors, got %+v", payload.Data)
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

	t.Run("candidates", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/import/candidates", nil)
		recorder := httptest.NewRecorder()
		server.Handler().ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200 for candidates, got %d", recorder.Code)
		}

		var payload struct {
			Success bool                             `json:"success"`
			Data    []sessionimport.ValidationResult `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
			t.Fatalf("expected JSON payload, got decode error: %v", err)
		}
		if !payload.Success {
			t.Fatalf("expected success payload, got %s", recorder.Body.String())
		}
		if len(payload.Data) != 1 {
			t.Fatalf("expected one validated import candidate, got %+v", payload.Data)
		}
		if !payload.Data[0].Valid || payload.Data[0].SourceTool != "claude-code" || payload.Data[0].Format != "jsonl" {
			t.Fatalf("expected validated claude-code jsonl candidate, got %+v", payload.Data[0])
		}
		if len(payload.Data[0].DetectedModels) != 1 || payload.Data[0].DetectedModels[0] != "gpt-5" {
			t.Fatalf("expected gpt-5 model hint, got %+v", payload.Data[0])
		}
	})

	t.Run("manifest", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/import/manifest", nil)
		recorder := httptest.NewRecorder()
		server.Handler().ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200 for manifest, got %d", recorder.Code)
		}

		var payload struct {
			Success bool                   `json:"success"`
			Data    sessionimport.Manifest `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
			t.Fatalf("expected JSON payload, got decode error: %v", err)
		}
		if !payload.Success {
			t.Fatalf("expected success payload, got %s", recorder.Body.String())
		}
		if payload.Data.Count != 1 || len(payload.Data.Candidates) != 1 {
			t.Fatalf("expected single-candidate manifest, got %+v", payload.Data)
		}
		if payload.Data.GeneratedAt == "" {
			t.Fatalf("expected manifest generated timestamp, got %+v", payload.Data)
		}
		if payload.Data.Candidates[0].SourcePath != targetPath {
			t.Fatalf("expected manifest source path %s, got %+v", targetPath, payload.Data.Candidates[0])
		}
	})

	t.Run("summary", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/import/summary", nil)
		recorder := httptest.NewRecorder()
		server.Handler().ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200 for summary, got %d", recorder.Code)
		}

		var payload struct {
			Success bool                  `json:"success"`
			Data    sessionimport.Summary `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
			t.Fatalf("expected JSON payload, got decode error: %v", err)
		}
		if !payload.Success {
			t.Fatalf("expected success payload, got %s", recorder.Body.String())
		}
		if payload.Data.Count != 1 || payload.Data.ValidCount != 1 || payload.Data.InvalidCount != 0 {
			t.Fatalf("expected single valid summary bucket, got %+v", payload.Data)
		}
		if payload.Data.TotalEstimatedSize <= 0 {
			t.Fatalf("expected positive estimated size, got %+v", payload.Data)
		}
		if len(payload.Data.BySourceTool) != 1 || payload.Data.BySourceTool[0].Key != "claude-code" {
			t.Fatalf("expected claude-code source-tool summary, got %+v", payload.Data.BySourceTool)
		}
		if len(payload.Data.ByModelHint) != 1 || payload.Data.ByModelHint[0].Key != "gpt-5" {
			t.Fatalf("expected gpt-5 model-hint summary, got %+v", payload.Data.ByModelHint)
		}
	})
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
	if payload.Data.ImportRoots.Count != 26 {
		t.Fatalf("expected 26 import roots after expanded discovery coverage, got %d", payload.Data.ImportRoots.Count)
	}
	if payload.Data.ImportRoots.ExistingCount != 1 {
		t.Fatalf("expected 1 existing import root, got %d", payload.Data.ImportRoots.ExistingCount)
	}
	if payload.Data.ImportSources.Count != 1 {
		t.Fatalf("expected 1 import source candidate, got %d", payload.Data.ImportSources.Count)
	}
	if payload.Data.ImportSources.ValidCount != 1 {
		t.Fatalf("expected 1 valid import source, got %d", payload.Data.ImportSources.ValidCount)
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
	if len(payload.Data.ImportSources.Candidates) != 1 {
		t.Fatalf("expected a single import source candidate payload, got %+v", payload.Data.ImportSources.Candidates)
	}
	candidate := payload.Data.ImportSources.Candidates[0]
	if candidate.SourceTool != "claude-code" || candidate.SessionFormat != "jsonl" || candidate.SourcePath != claudePath {
		t.Fatalf("expected claude-code jsonl import candidate at %s, got %+v", claudePath, candidate)
	}
}
