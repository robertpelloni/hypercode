package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/borghq/borg-go/internal/buildinfo"
	"github.com/borghq/borg-go/internal/config"
	"github.com/borghq/borg-go/internal/controlplane"
	"github.com/borghq/borg-go/internal/harnesses"
	"github.com/borghq/borg-go/internal/interop"
	"github.com/borghq/borg-go/internal/memorystore"
	"github.com/borghq/borg-go/internal/providers"
	"github.com/borghq/borg-go/internal/sessionimport"
)

type Server struct {
	cfg       config.Config
	detector  controlplane.ToolProvider
	startedAt time.Time
	mux       *http.ServeMux
}

type Session struct {
	ID             string   `json:"id"`
	CLIType        string   `json:"cliType"`
	Status         string   `json:"status"`
	Task           string   `json:"task,omitempty"`
	StartedAt      string   `json:"startedAt,omitempty"`
	SourcePath     string   `json:"sourcePath,omitempty"`
	SessionFormat  string   `json:"sessionFormat,omitempty"`
	Valid          bool     `json:"valid"`
	DetectedModels []string `json:"detectedModels,omitempty"`
}

type RuntimeStatus struct {
	Service              string                       `json:"service"`
	Version              string                       `json:"version"`
	BaseURL              string                       `json:"baseUrl"`
	UptimeSec            int                          `json:"uptimeSec"`
	Locks                []interop.ControlPlaneStatus `json:"locks"`
	LockSummary          LockRuntimeSummary           `json:"lockSummary"`
	Config               ConfigRuntimeSummary         `json:"config"`
	CLI                  CLIRuntimeSummary            `json:"cli"`
	Providers            ProviderRuntimeSummary       `json:"providers"`
	Memory               MemoryRuntimeSummary         `json:"memory"`
	Sessions             SessionRuntimeSummary        `json:"sessions"`
	ImportedInstructions ImportedInstructionsSummary  `json:"importedInstructions"`
	ImportRoots          ImportRootsSummary           `json:"importRoots"`
	ImportSources        ImportSourcesSummary         `json:"importSources"`
}

type ProviderRuntimeSummary struct {
	ProviderCount           int                `json:"providerCount"`
	ConfiguredCount         int                `json:"configuredCount"`
	AuthenticatedCount      int                `json:"authenticatedCount"`
	ExecutableCount         int                `json:"executableCount"`
	RoutingPreviewAvailable bool               `json:"routingPreviewAvailable"`
	ByAuthMethod            []SummaryBucket    `json:"byAuthMethod,omitempty"`
	ByPreferredTask         []SummaryBucket    `json:"byPreferredTask,omitempty"`
	Statuses                []providers.Status `json:"statuses"`
}

type LockRuntimeSummary struct {
	VisibleCount int `json:"visibleCount"`
	RunningCount int `json:"runningCount"`
}

type ConfigRuntimeSummary struct {
	WorkspaceRootAvailable      bool `json:"workspaceRootAvailable"`
	ConfigDirAvailable          bool `json:"configDirAvailable"`
	MainConfigDirAvailable      bool `json:"mainConfigDirAvailable"`
	RepoConfigAvailable         bool `json:"repoConfigAvailable"`
	MCPConfigAvailable          bool `json:"mcpConfigAvailable"`
	HypercodeSubmoduleAvailable bool `json:"hypercodeSubmoduleAvailable"`
}

type MemoryRuntimeSummary struct {
	Available                  bool                        `json:"available"`
	StorePath                  string                      `json:"storePath"`
	TotalEntries               int                         `json:"totalEntries"`
	SectionCount               int                         `json:"sectionCount"`
	DefaultSectionCount        int                         `json:"defaultSectionCount"`
	PopulatedSectionCount      int                         `json:"populatedSectionCount"`
	PresentDefaultSectionCount int                         `json:"presentDefaultSectionCount"`
	MissingSections            []string                    `json:"missingSections,omitempty"`
	Sections                   []memorystore.SectionStatus `json:"sections,omitempty"`
	LastUpdatedAt              string                      `json:"lastUpdatedAt,omitempty"`
}

type SessionRuntimeSummary struct {
	DiscoveredCount           int             `json:"discoveredCount"`
	ValidCount                int             `json:"validCount"`
	SupervisorBridgeAvailable bool            `json:"supervisorBridgeAvailable"`
	SupervisorBridgeBase      string          `json:"supervisorBridgeBase,omitempty"`
	ByCLIType                 []SummaryBucket `json:"byCliType,omitempty"`
	ByFormat                  []SummaryBucket `json:"byFormat,omitempty"`
	ByTask                    []SummaryBucket `json:"byTask,omitempty"`
	ByModelHint               []SummaryBucket `json:"byModelHint,omitempty"`
}

type SessionSummary struct {
	Count       int             `json:"count"`
	ValidCount  int             `json:"validCount"`
	ByCLIType   []SummaryBucket `json:"byCliType"`
	ByFormat    []SummaryBucket `json:"byFormat"`
	ByTask      []SummaryBucket `json:"byTask"`
	ByModelHint []SummaryBucket `json:"byModelHint"`
}

type CLIRuntimeSummary struct {
	ToolCount                   int    `json:"toolCount"`
	AvailableToolCount          int    `json:"availableToolCount"`
	HarnessCount                int    `json:"harnessCount"`
	InstalledHarnessCount       int    `json:"installedHarnessCount"`
	SourceBackedHarnessCount    int    `json:"sourceBackedHarnessCount"`
	MetadataOnlyHarnessCount    int    `json:"metadataOnlyHarnessCount"`
	OperatorDefinedHarnessCount int    `json:"operatorDefinedHarnessCount"`
	SourceBackedToolCount       int    `json:"sourceBackedToolCount"`
	PrimaryHarness              string `json:"primaryHarness,omitempty"`
}

type CLISummary struct {
	ToolCount                   int                    `json:"toolCount"`
	AvailableToolCount          int                    `json:"availableToolCount"`
	HarnessCount                int                    `json:"harnessCount"`
	InstalledHarnessCount       int                    `json:"installedHarnessCount"`
	SourceBackedHarnessCount    int                    `json:"sourceBackedHarnessCount"`
	MetadataOnlyHarnessCount    int                    `json:"metadataOnlyHarnessCount"`
	OperatorDefinedHarnessCount int                    `json:"operatorDefinedHarnessCount"`
	SourceBackedToolCount       int                    `json:"sourceBackedToolCount"`
	PrimaryHarness              string                 `json:"primaryHarness,omitempty"`
	AvailableTools              []controlplane.Tool    `json:"availableTools"`
	InstalledHarnesses          []harnesses.Definition `json:"installedHarnesses"`
}

type ImportedInstructionsSummary struct {
	Path       string `json:"path"`
	Available  bool   `json:"available"`
	ModifiedAt string `json:"modifiedAt,omitempty"`
	Size       int64  `json:"size,omitempty"`
}

type ImportRootsSummary struct {
	Count         int                        `json:"count"`
	ExistingCount int                        `json:"existingCount"`
	Roots         []sessionimport.RootStatus `json:"roots"`
}

type ImportSourcesSummary struct {
	Count              int                       `json:"count"`
	ValidCount         int                       `json:"validCount"`
	InvalidCount       int                       `json:"invalidCount"`
	TotalEstimatedSize int64                     `json:"totalEstimatedSize"`
	Candidates         []sessionimport.Candidate `json:"candidates"`
	BySourceTool       []SummaryBucket           `json:"bySourceTool,omitempty"`
	BySourceType       []SummaryBucket           `json:"bySourceType,omitempty"`
	ByFormat           []SummaryBucket           `json:"byFormat,omitempty"`
	ByModelHint        []SummaryBucket           `json:"byModelHint,omitempty"`
	ByError            []SummaryBucket           `json:"byError,omitempty"`
}

type APIIndex struct {
	Service string      `json:"service"`
	BaseURL string      `json:"baseUrl"`
	Routes  []RouteInfo `json:"routes"`
}

type RouteInfo struct {
	Path        string `json:"path"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

type SummaryBucket struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

func New(cfg config.Config, detector controlplane.ToolProvider) *Server {
	server := &Server{
		cfg:       cfg,
		detector:  detector,
		startedAt: time.Now().UTC(),
		mux:       http.NewServeMux(),
	}

	server.registerRoutes()
	return server
}

func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) ListenAndServe(ctx context.Context) error {
	httpServer := &http.Server{
		Addr:              s.cfg.Host + ":" + jsonNumber(s.cfg.Port),
		Handler:           s.mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- httpServer.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/version", s.handleVersion)
	s.mux.HandleFunc("/api/index", s.handleAPIIndex)
	s.mux.HandleFunc("/api/health/server", s.handleHealth)
	s.mux.HandleFunc("/api/config/status", s.handleConfigStatus)
	s.mux.HandleFunc("/api/providers/status", s.handleProviderStatus)
	s.mux.HandleFunc("/api/providers/catalog", s.handleProviderCatalog)
	s.mux.HandleFunc("/api/providers/summary", s.handleProviderSummary)
	s.mux.HandleFunc("/api/providers/routing-summary", s.handleRoutingSummary)
	s.mux.HandleFunc("/api/sessions", s.handleSessions)
	s.mux.HandleFunc("/api/sessions/summary", s.handleSessionSummary)
	s.mux.HandleFunc("/api/sessions/supervisor/catalog", s.handleSupervisorSessionCatalog)
	s.mux.HandleFunc("/api/sessions/supervisor/list", s.handleSupervisorSessionList)
	s.mux.HandleFunc("/api/sessions/supervisor/get", s.handleSupervisorSessionGet)
	s.mux.HandleFunc("/api/sessions/supervisor/create", s.handleSupervisorSessionCreate)
	s.mux.HandleFunc("/api/sessions/supervisor/start", s.handleSupervisorSessionStart)
	s.mux.HandleFunc("/api/sessions/supervisor/stop", s.handleSupervisorSessionStop)
	s.mux.HandleFunc("/api/sessions/supervisor/restart", s.handleSupervisorSessionRestart)
	s.mux.HandleFunc("/api/mcp/status", s.handleMCPStatus)
	s.mux.HandleFunc("/api/mcp/servers/runtime", s.handleMCPRuntimeServers)
	s.mux.HandleFunc("/api/mcp/servers/configured", s.handleMCPConfiguredServers)
	s.mux.HandleFunc("/api/mcp/servers/registry-snapshot", s.handleMCPRegistrySnapshot)
	s.mux.HandleFunc("/api/mcp/tools", s.handleMCPTools)
	s.mux.HandleFunc("/api/mcp/tools/search", s.handleMCPSearchTools)
	s.mux.HandleFunc("/api/mcp/tools/call", s.handleMCPCallTool)
	s.mux.HandleFunc("/api/mcp/tools/schema", s.handleMCPToolSchema)
	s.mux.HandleFunc("/api/mcp/preferences", s.handleMCPToolPreferences)
	s.mux.HandleFunc("/api/mcp/working-set", s.handleMCPWorkingSet)
	s.mux.HandleFunc("/api/mcp/working-set/load", s.handleMCPLoadTool)
	s.mux.HandleFunc("/api/mcp/working-set/unload", s.handleMCPUnloadTool)
	s.mux.HandleFunc("/api/cli/tools", s.handleCLITools)
	s.mux.HandleFunc("/api/cli/harnesses", s.handleHarnesses)
	s.mux.HandleFunc("/api/cli/summary", s.handleCLISummary)
	s.mux.HandleFunc("/api/memory/borg-memory/status", s.handleMemoryStatus)
	s.mux.HandleFunc("/api/import/sources", s.handleImportSources)
	s.mux.HandleFunc("/api/import/roots", s.handleImportRoots)
	s.mux.HandleFunc("/api/import/validate", s.handleImportValidate)
	s.mux.HandleFunc("/api/import/candidates", s.handleImportCandidates)
	s.mux.HandleFunc("/api/import/manifest", s.handleImportManifest)
	s.mux.HandleFunc("/api/import/summary", s.handleImportSummary)
	s.mux.HandleFunc("/api/runtime/locks", s.handleRuntimeLocks)
	s.mux.HandleFunc("/api/runtime/status", s.handleRuntimeStatus)
	s.mux.HandleFunc("/api/runtime/imported-instructions", s.handleImportedInstructions)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"service":   "borg-go",
		"version":   buildinfo.Version,
		"uptimeSec": int(time.Since(s.startedAt).Seconds()),
		"baseUrl":   s.cfg.BaseURL(),
	})
}

func (s *Server) handleVersion(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"version": buildinfo.Version,
	})
}

func (s *Server) handleAPIIndex(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": APIIndex{
			Service: "borg-go",
			BaseURL: s.cfg.BaseURL(),
			Routes: []RouteInfo{
				{Path: "/health", Category: "meta", Description: "Basic service health check."},
				{Path: "/version", Category: "meta", Description: "Build version for the Go sidecar."},
				{Path: "/api/index", Category: "meta", Description: "Self-describing index of the Go sidecar API surface."},
				{Path: "/api/health/server", Category: "meta", Description: "Health check alias for API consumers."},
				{Path: "/api/config/status", Category: "config", Description: "Path and config visibility snapshot for the sidecar and main workspace."},
				{Path: "/api/providers/status", Category: "providers", Description: "Provider credential presence and auth-method hints."},
				{Path: "/api/providers/catalog", Category: "providers", Description: "Provider catalog metadata including default models and preferred tasks."},
				{Path: "/api/providers/summary", Category: "providers", Description: "Compact provider counts and auth/preferred-task buckets."},
				{Path: "/api/providers/routing-summary", Category: "providers", Description: "Read-only preview of intended task routing order."},
				{Path: "/api/sessions", Category: "sessions", Description: "Discovered session artifacts exposed as read-only sessions."},
				{Path: "/api/sessions/summary", Category: "sessions", Description: "Compact summary of discovered sessions by tool, format, task, and model hint."},
				{Path: "/api/sessions/supervisor/catalog", Category: "sessions", Description: "Bridge to the TypeScript session harness catalog."},
				{Path: "/api/sessions/supervisor/list", Category: "sessions", Description: "Bridge to the TypeScript supervised session list."},
				{Path: "/api/sessions/supervisor/get", Category: "sessions", Description: "Bridge to a specific TypeScript supervised session snapshot."},
				{Path: "/api/sessions/supervisor/create", Category: "sessions", Description: "Create a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/start", Category: "sessions", Description: "Start a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/stop", Category: "sessions", Description: "Stop a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/restart", Category: "sessions", Description: "Restart a supervised session through the TypeScript control plane."},
				{Path: "/api/mcp/status", Category: "mcp", Description: "Bridge to TypeScript MCP runtime status and pool state."},
				{Path: "/api/mcp/servers/runtime", Category: "mcp", Description: "Bridge to TypeScript runtime MCP server visibility."},
				{Path: "/api/mcp/servers/configured", Category: "mcp", Description: "Bridge to configured MCP server records managed by the TypeScript control plane."},
				{Path: "/api/mcp/servers/registry-snapshot", Category: "mcp", Description: "Bridge to the TypeScript MCP registry snapshot."},
				{Path: "/api/mcp/tools", Category: "mcp", Description: "Bridge to aggregated MCP tools from the TypeScript control plane."},
				{Path: "/api/mcp/tools/search", Category: "mcp", Description: "Bridge to TypeScript MCP tool search with optional profile hinting."},
				{Path: "/api/mcp/tools/call", Category: "mcp", Description: "Execute an MCP tool through the TypeScript control plane."},
				{Path: "/api/mcp/tools/schema", Category: "mcp", Description: "Hydrate and return a specific MCP tool schema through the TypeScript control plane."},
				{Path: "/api/mcp/preferences", Category: "mcp", Description: "Get or update MCP tool-selection preferences via the TypeScript control plane."},
				{Path: "/api/mcp/working-set", Category: "mcp", Description: "Bridge to the TypeScript MCP working-set snapshot."},
				{Path: "/api/mcp/working-set/load", Category: "mcp", Description: "Load an MCP tool into the TypeScript working set."},
				{Path: "/api/mcp/working-set/unload", Category: "mcp", Description: "Unload an MCP tool from the TypeScript working set."},
				{Path: "/api/cli/tools", Category: "cli", Description: "Detected local CLI tools and versions."},
				{Path: "/api/cli/harnesses", Category: "cli", Description: "Harness registry metadata and install visibility."},
				{Path: "/api/cli/summary", Category: "cli", Description: "Compact CLI and harness readiness summary."},
				{Path: "/api/memory/borg-memory/status", Category: "memory", Description: "Read-only sectioned-memory status snapshot."},
				{Path: "/api/import/roots", Category: "imports", Description: "Explicit import discovery roots and whether they exist."},
				{Path: "/api/import/sources", Category: "imports", Description: "Discovered import artifacts from explicit roots."},
				{Path: "/api/import/validate", Category: "imports", Description: "Validation summary for a single import artifact path."},
				{Path: "/api/import/candidates", Category: "imports", Description: "Validated import candidates with metadata."},
				{Path: "/api/import/manifest", Category: "imports", Description: "Structured manifest of validated import candidates."},
				{Path: "/api/import/summary", Category: "imports", Description: "Aggregate summary of validated import candidates."},
				{Path: "/api/runtime/locks", Category: "runtime", Description: "Visibility into main Borg and sidecar lock files."},
				{Path: "/api/runtime/status", Category: "runtime", Description: "Top-level runtime summary across CLI, imports, providers, memory, and sessions."},
				{Path: "/api/runtime/imported-instructions", Category: "runtime", Description: "Read-only bridge to imported instructions generated by the main fork."},
			},
		},
	})
}

func (s *Server) handleConfigStatus(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    config.Snapshot(s.cfg),
	})
}

func (s *Server) handleProviderStatus(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    providers.Snapshot(),
	})
}

func (s *Server) handleProviderCatalog(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    providers.Catalog(providers.Snapshot()),
	})
}

func (s *Server) handleProviderSummary(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    providers.BuildSummary(providers.Snapshot()),
	})
}

func (s *Server) handleRoutingSummary(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    providers.BuildRoutingSummary(providers.Snapshot()),
	})
}

func (s *Server) handleSessions(w http.ResponseWriter, _ *http.Request) {
	sessions, err := s.discoveredSessions()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    sessions,
	})
}

func (s *Server) handleSessionSummary(w http.ResponseWriter, _ *http.Request) {
	sessions, err := s.discoveredSessions()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    summarizeSessions(sessions),
	})
}

func (s *Server) handleSupervisorSessionCatalog(w http.ResponseWriter, r *http.Request) {
	s.handleSessionBridgeCall(w, r, http.MethodGet, "session.catalog", nil)
}

func (s *Server) handleSupervisorSessionList(w http.ResponseWriter, r *http.Request) {
	s.handleSessionBridgeCall(w, r, http.MethodGet, "session.list", nil)
}

func (s *Server) handleSupervisorSessionGet(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("id"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing id query parameter",
		})
		return
	}
	s.handleSessionBridgeCall(w, r, http.MethodGet, "session.get", map[string]any{"id": sessionID})
}

func (s *Server) handleSupervisorSessionCreate(w http.ResponseWriter, r *http.Request) {
	s.handleSessionBridgeBodyCall(w, r, "session.create")
}

func (s *Server) handleSupervisorSessionStart(w http.ResponseWriter, r *http.Request) {
	s.handleSessionBridgeBodyCall(w, r, "session.start")
}

func (s *Server) handleSupervisorSessionStop(w http.ResponseWriter, r *http.Request) {
	s.handleSessionBridgeBodyCall(w, r, "session.stop")
}

func (s *Server) handleSupervisorSessionRestart(w http.ResponseWriter, r *http.Request) {
	s.handleSessionBridgeBodyCall(w, r, "session.restart")
}

func (s *Server) handleMCPStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.getStatus", nil)
}

func (s *Server) handleMCPRuntimeServers(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.listServers", nil)
}

func (s *Server) handleMCPConfiguredServers(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcpServers.list", nil)
}

func (s *Server) handleMCPRegistrySnapshot(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcpServers.registrySnapshot", nil)
}

func (s *Server) handleMCPTools(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.listTools", nil)
}

func (s *Server) handleMCPSearchTools(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	profile := strings.TrimSpace(r.URL.Query().Get("profile"))
	payload := map[string]any{
		"query": query,
	}
	if profile != "" {
		payload["profile"] = profile
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.searchTools", payload)
}

func (s *Server) handleMCPCallTool(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.callTool")
}

func (s *Server) handleMCPToolSchema(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.getToolSchema")
}

func (s *Server) handleMCPToolPreferences(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.getToolPreferences", nil)
	case http.MethodPost:
		s.handleTRPCBridgeBodyCall(w, r, "mcp.setToolPreferences")
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
	}
}

func (s *Server) handleMCPWorkingSet(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.getWorkingSet", nil)
}

func (s *Server) handleMCPLoadTool(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.loadTool")
}

func (s *Server) handleMCPUnloadTool(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.unloadTool")
}

func (s *Server) handleSessionBridgeBodyCall(w http.ResponseWriter, r *http.Request, procedure string) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodPost, procedure, payload)
}

func (s *Server) handleSessionBridgeCall(w http.ResponseWriter, r *http.Request, method string, procedure string, payload any) {
	s.handleTRPCBridgeCall(w, r, method, procedure, payload)
}

func (s *Server) handleTRPCBridgeBodyCall(w http.ResponseWriter, r *http.Request, procedure string) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodPost, procedure, payload)
}

func (s *Server) handleTRPCBridgeCall(w http.ResponseWriter, r *http.Request, method string, procedure string, payload any) {
	if r.Method != method {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	result, err := interop.CallTRPCProcedure(r.Context(), s.cfg.MainLockPath(), procedure, payload)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var data any
	if err := json.Unmarshal(result.Data, &data); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"success": false,
			"error":   "invalid upstream JSON payload",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    data,
		"bridge": map[string]any{
			"upstreamBase": result.BaseURL,
			"procedure":    procedure,
		},
	})
}

func (s *Server) handleCLITools(w http.ResponseWriter, r *http.Request) {
	tools, err := s.detector.DetectAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusGatewayTimeout, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    tools,
	})
}

func (s *Server) handleHarnesses(w http.ResponseWriter, r *http.Request) {
	tools, err := s.detector.DetectAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusGatewayTimeout, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    harnesses.List(s.cfg.WorkspaceRoot, tools),
	})
}

func (s *Server) handleCLISummary(w http.ResponseWriter, r *http.Request) {
	tools, err := s.detector.DetectAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusGatewayTimeout, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	summary := summarizeCLI(s.cfg.WorkspaceRoot, tools)

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    summary,
	})
}

func (s *Server) handleImportSources(w http.ResponseWriter, _ *http.Request) {
	candidates, err := s.scanImportSources()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    candidates,
	})
}

func (s *Server) handleImportRoots(w http.ResponseWriter, _ *http.Request) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = s.cfg.MainConfigDir
	}

	scanner := sessionimport.NewScanner(s.cfg.WorkspaceRoot, homeDir, 50)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    scanner.Roots(),
	})
}

func (s *Server) handleImportValidate(w http.ResponseWriter, r *http.Request) {
	targetPath := strings.TrimSpace(r.URL.Query().Get("path"))
	if targetPath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing path query parameter",
		})
		return
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	result := sessionimport.ValidateCandidate(sessionimport.Candidate{
		SourceTool:     detectImportSourceTool(targetPath),
		SourcePath:     targetPath,
		SessionFormat:  sessionimport.DetectFormatFromPath(targetPath),
		LastModifiedAt: info.ModTime().UTC().Format(time.RFC3339),
		EstimatedSize:  info.Size(),
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    result,
	})
}

func (s *Server) handleImportCandidates(w http.ResponseWriter, _ *http.Request) {
	candidates, err := s.scanValidatedImportSources()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    candidates,
	})
}

func (s *Server) handleImportManifest(w http.ResponseWriter, _ *http.Request) {
	candidates, err := s.scanValidatedImportSources()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    sessionimport.BuildManifest(candidates),
	})
}

func (s *Server) handleImportSummary(w http.ResponseWriter, _ *http.Request) {
	candidates, err := s.scanValidatedImportSources()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    sessionimport.BuildSummary(candidates),
	})
}

func (s *Server) handleMemoryStatus(w http.ResponseWriter, _ *http.Request) {
	status, err := memorystore.ReadStatus(s.cfg.WorkspaceRoot)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    status,
	})
}

func (s *Server) handleRuntimeStatus(w http.ResponseWriter, r *http.Request) {
	candidates, err := s.scanImportSources()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	tools, err := s.detector.DetectAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusGatewayTimeout, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	cliSummary := summarizeCLI(s.cfg.WorkspaceRoot, tools)
	rootStatuses := s.importRoots()
	existingRoots := 0
	for _, root := range rootStatuses {
		if root.Exists {
			existingRoots++
		}
	}

	instructions := interop.ReadImportedInstructions(s.cfg.ImportedInstructionsPath())
	configStatus := config.Snapshot(s.cfg)
	providerStatuses := providers.Snapshot()
	providerSummary := providers.BuildSummary(providerStatuses)
	configuredProviders := 0
	authenticatedProviders := 0
	for _, provider := range providerStatuses {
		if provider.Configured {
			configuredProviders++
		}
		if provider.Authenticated {
			authenticatedProviders++
		}
	}

	memoryStatus, err := memorystore.ReadStatus(s.cfg.WorkspaceRoot)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	discoveredSessions, err := s.discoveredSessions()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	validSessions := 0
	for _, session := range discoveredSessions {
		if session.Valid {
			validSessions++
		}
	}

	sessionSummary := summarizeSessions(discoveredSessions)
	supervisorBridgeAvailable := false
	supervisorBridgeBase := ""
	bridgeCtx, cancelBridge := context.WithTimeout(r.Context(), 2*time.Second)
	bridgeResult, bridgeErr := interop.CallTRPCProcedure(bridgeCtx, s.cfg.MainLockPath(), "session.catalog", nil)
	cancelBridge()
	if bridgeErr == nil {
		supervisorBridgeAvailable = true
		supervisorBridgeBase = bridgeResult.BaseURL
	}

	validatedCandidates, err := s.scanValidatedImportSources()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	importSummary := sessionimport.BuildSummary(validatedCandidates)

	lockStatuses := interop.DiscoverControlPlanes(s.cfg.MainLockPath(), s.cfg.LockPath())
	runningLocks := 0
	for _, status := range lockStatuses {
		if status.Running {
			runningLocks++
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": RuntimeStatus{
			Service:   "borg-go",
			Version:   buildinfo.Version,
			BaseURL:   s.cfg.BaseURL(),
			UptimeSec: int(time.Since(s.startedAt).Seconds()),
			Locks:     lockStatuses,
			LockSummary: LockRuntimeSummary{
				VisibleCount: len(lockStatuses),
				RunningCount: runningLocks,
			},
			Config: ConfigRuntimeSummary{
				WorkspaceRootAvailable:      configStatus.WorkspaceRoot.Exists,
				ConfigDirAvailable:          configStatus.ConfigDir.Exists,
				MainConfigDirAvailable:      configStatus.MainConfigDir.Exists,
				RepoConfigAvailable:         configStatus.BorgConfigFile.Exists,
				MCPConfigAvailable:          configStatus.MCPConfigFile.Exists,
				HypercodeSubmoduleAvailable: configStatus.HypercodeSubmodule.Exists,
			},
			CLI: CLIRuntimeSummary{
				ToolCount:                   cliSummary.ToolCount,
				AvailableToolCount:          cliSummary.AvailableToolCount,
				HarnessCount:                cliSummary.HarnessCount,
				InstalledHarnessCount:       cliSummary.InstalledHarnessCount,
				SourceBackedHarnessCount:    cliSummary.SourceBackedHarnessCount,
				MetadataOnlyHarnessCount:    cliSummary.MetadataOnlyHarnessCount,
				OperatorDefinedHarnessCount: cliSummary.OperatorDefinedHarnessCount,
				SourceBackedToolCount:       cliSummary.SourceBackedToolCount,
				PrimaryHarness:              cliSummary.PrimaryHarness,
			},
			Providers: ProviderRuntimeSummary{
				ProviderCount:           providerSummary.ProviderCount,
				ConfiguredCount:         configuredProviders,
				AuthenticatedCount:      authenticatedProviders,
				ExecutableCount:         providerSummary.ExecutableCount,
				RoutingPreviewAvailable: true,
				ByAuthMethod:            toHTTPBuckets(providerSummary.ByAuthMethod),
				ByPreferredTask:         toHTTPBuckets(providerSummary.ByPreferredTask),
				Statuses:                providerStatuses,
			},
			Memory: MemoryRuntimeSummary{
				Available:                  memoryStatus.Exists,
				StorePath:                  memoryStatus.StorePath,
				TotalEntries:               memoryStatus.TotalEntries,
				SectionCount:               memoryStatus.SectionCount,
				DefaultSectionCount:        memoryStatus.DefaultSectionCount,
				PopulatedSectionCount:      memoryStatus.PopulatedSectionCount,
				PresentDefaultSectionCount: memoryStatus.PresentDefaultSectionCount,
				MissingSections:            memoryStatus.MissingSections,
				Sections:                   memoryStatus.Sections,
				LastUpdatedAt:              memoryStatus.LastUpdatedAt,
			},
			Sessions: SessionRuntimeSummary{
				DiscoveredCount:           len(discoveredSessions),
				ValidCount:                validSessions,
				SupervisorBridgeAvailable: supervisorBridgeAvailable,
				SupervisorBridgeBase:      supervisorBridgeBase,
				ByCLIType:                 sessionSummary.ByCLIType,
				ByFormat:                  sessionSummary.ByFormat,
				ByTask:                    sessionSummary.ByTask,
				ByModelHint:               sessionSummary.ByModelHint,
			},
			ImportedInstructions: ImportedInstructionsSummary{
				Path:       instructions.Path,
				Available:  instructions.Available,
				ModifiedAt: instructions.ModifiedAt,
				Size:       instructions.Size,
			},
			ImportRoots: ImportRootsSummary{
				Count:         len(rootStatuses),
				ExistingCount: existingRoots,
				Roots:         rootStatuses,
			},
			ImportSources: ImportSourcesSummary{
				Count:              len(candidates),
				ValidCount:         importSummary.ValidCount,
				InvalidCount:       importSummary.InvalidCount,
				TotalEstimatedSize: importSummary.TotalEstimatedSize,
				Candidates:         candidates,
				BySourceTool:       toImportBuckets(importSummary.BySourceTool),
				BySourceType:       toImportBuckets(importSummary.BySourceType),
				ByFormat:           toImportBuckets(importSummary.ByFormat),
				ByModelHint:        toImportBuckets(importSummary.ByModelHint),
				ByError:            toImportBuckets(importSummary.ByError),
			},
		},
	})
}

func summarizeCLI(workspaceRoot string, tools []controlplane.Tool) CLISummary {
	availableTools := make([]controlplane.Tool, 0, len(tools))
	for _, tool := range tools {
		if tool.Available {
			availableTools = append(availableTools, tool)
		}
	}

	harnessDefinitions := harnesses.List(workspaceRoot, tools)
	harnessSummary := harnesses.Summarize(harnessDefinitions)
	installedHarnesses := make([]harnesses.Definition, 0, len(harnessDefinitions))
	primaryHarness := ""
	for _, harness := range harnessDefinitions {
		if harness.Primary {
			primaryHarness = harness.ID
		}
		if harness.Installed {
			installedHarnesses = append(installedHarnesses, harness)
		}
	}

	return CLISummary{
		ToolCount:                   len(tools),
		AvailableToolCount:          len(availableTools),
		HarnessCount:                len(harnessDefinitions),
		InstalledHarnessCount:       len(installedHarnesses),
		SourceBackedHarnessCount:    harnessSummary.SourceBackedHarnessCount,
		MetadataOnlyHarnessCount:    harnessSummary.MetadataOnlyHarnessCount,
		OperatorDefinedHarnessCount: harnessSummary.OperatorDefinedHarnessCount,
		SourceBackedToolCount:       harnessSummary.SourceBackedToolCount,
		PrimaryHarness:              primaryHarness,
		AvailableTools:              availableTools,
		InstalledHarnesses:          installedHarnesses,
	}
}

func (s *Server) handleRuntimeLocks(w http.ResponseWriter, _ *http.Request) {
	statuses := interop.DiscoverControlPlanes(s.cfg.MainLockPath(), s.cfg.LockPath())
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    statuses,
	})
}

func (s *Server) handleImportedInstructions(w http.ResponseWriter, _ *http.Request) {
	document := interop.ReadImportedInstructions(s.cfg.ImportedInstructionsPath())
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    document,
	})
}

func (s *Server) scanImportSources() ([]sessionimport.Candidate, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = s.cfg.MainConfigDir
	}

	scanner := sessionimport.NewScanner(s.cfg.WorkspaceRoot, homeDir, 50)
	return scanner.Scan()
}

func (s *Server) scanValidatedImportSources() ([]sessionimport.ValidationResult, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = s.cfg.MainConfigDir
	}

	scanner := sessionimport.NewScanner(s.cfg.WorkspaceRoot, homeDir, 50)
	return scanner.ScanValidated()
}

func (s *Server) importRoots() []sessionimport.RootStatus {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = s.cfg.MainConfigDir
	}

	scanner := sessionimport.NewScanner(s.cfg.WorkspaceRoot, homeDir, 50)
	return scanner.Roots()
}

func (s *Server) discoveredSessions() ([]Session, error) {
	candidates, err := s.scanValidatedImportSources()
	if err != nil {
		return nil, err
	}

	sessions := make([]Session, 0, len(candidates))
	for index, candidate := range candidates {
		sessions = append(sessions, Session{
			ID:             "discovered_" + fmtInt(index+1),
			CLIType:        candidate.SourceTool,
			Status:         "discovered",
			Task:           candidate.SourceType,
			StartedAt:      candidate.LastModifiedAt,
			SourcePath:     candidate.SourcePath,
			SessionFormat:  candidate.Format,
			Valid:          candidate.Valid,
			DetectedModels: candidate.DetectedModels,
		})
	}
	return sessions, nil
}

func summarizeSessions(sessions []Session) SessionSummary {
	byCLIType := make(map[string]int)
	byFormat := make(map[string]int)
	byTask := make(map[string]int)
	byModelHint := make(map[string]int)
	validCount := 0

	for _, session := range sessions {
		byCLIType[session.CLIType]++
		byFormat[session.SessionFormat]++
		byTask[session.Task]++
		if session.Valid {
			validCount++
		}
		for _, model := range session.DetectedModels {
			byModelHint[model]++
		}
	}

	return SessionSummary{
		Count:       len(sessions),
		ValidCount:  validCount,
		ByCLIType:   summaryBucketsFromMap(byCLIType),
		ByFormat:    summaryBucketsFromMap(byFormat),
		ByTask:      summaryBucketsFromMap(byTask),
		ByModelHint: summaryBucketsFromMap(byModelHint),
	}
}

func summaryBucketsFromMap(values map[string]int) []SummaryBucket {
	buckets := make([]SummaryBucket, 0, len(values))
	for key, count := range values {
		if key == "" {
			key = "unknown"
		}
		buckets = append(buckets, SummaryBucket{Key: key, Count: count})
	}
	for i := 0; i < len(buckets); i++ {
		for j := i + 1; j < len(buckets); j++ {
			if buckets[j].Count > buckets[i].Count || (buckets[j].Count == buckets[i].Count && buckets[j].Key < buckets[i].Key) {
				buckets[i], buckets[j] = buckets[j], buckets[i]
			}
		}
	}
	return buckets
}

func toHTTPBuckets(values []providers.SummaryBucket) []SummaryBucket {
	buckets := make([]SummaryBucket, 0, len(values))
	for _, value := range values {
		buckets = append(buckets, SummaryBucket{
			Key:   value.Key,
			Count: value.Count,
		})
	}
	return buckets
}

func toImportBuckets(values []sessionimport.SummaryBucket) []SummaryBucket {
	buckets := make([]SummaryBucket, 0, len(values))
	for _, value := range values {
		buckets = append(buckets, SummaryBucket{
			Key:   value.Key,
			Count: value.Count,
		})
	}
	return buckets
}

func detectImportSourceTool(targetPath string) string {
	lowerPath := strings.ToLower(targetPath)
	switch {
	case strings.Contains(lowerPath, ".claude"):
		return "claude-code"
	case strings.Contains(lowerPath, ".copilot"):
		return "copilot-cli"
	case strings.Contains(lowerPath, "chatgpt"), strings.Contains(lowerPath, ".openai"), strings.Contains(lowerPath, "openai"):
		return "openai"
	default:
		return "unknown"
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func jsonNumber(value int) string {
	return string(rune('0' + 0))[:0] + fmtInt(value)
}

func fmtInt(value int) string {
	if value == 0 {
		return "0"
	}

	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}

	buf := [20]byte{}
	index := len(buf)
	for value > 0 {
		index--
		buf[index] = byte('0' + (value % 10))
		value /= 10
	}

	return sign + string(buf[index:])
}
