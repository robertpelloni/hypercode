package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/borghq/borg-go/internal/buildinfo"
	"github.com/borghq/borg-go/internal/config"
	"github.com/borghq/borg-go/internal/controlplane"
	"github.com/borghq/borg-go/internal/harnesses"
	"github.com/borghq/borg-go/internal/interop"
	"github.com/borghq/borg-go/internal/memorystore"
	"github.com/borghq/borg-go/internal/mesh"
	"github.com/borghq/borg-go/internal/providers"
	"github.com/borghq/borg-go/internal/sessionimport"
)

type Server struct {
	cfg       config.Config
	detector  controlplane.ToolProvider
	mesh      *mesh.Service
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
		mesh:      mesh.New(cfg),
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
	s.mux.HandleFunc("/api/sessions/imported/list", s.handleImportedSessionList)
	s.mux.HandleFunc("/api/sessions/imported/get", s.handleImportedSessionGet)
	s.mux.HandleFunc("/api/sessions/imported/scan", s.handleImportedSessionScan)
	s.mux.HandleFunc("/api/sessions/imported/instruction-docs", s.handleImportedSessionInstructionDocs)
	s.mux.HandleFunc("/api/mcp/status", s.handleMCPStatus)
	s.mux.HandleFunc("/api/mcp/servers/runtime", s.handleMCPRuntimeServers)
	s.mux.HandleFunc("/api/mcp/servers/configured", s.handleMCPConfiguredServers)
	s.mux.HandleFunc("/api/mcp/servers/get", s.handleMCPConfiguredServerGet)
	s.mux.HandleFunc("/api/mcp/servers/create", s.handleMCPConfiguredServerCreate)
	s.mux.HandleFunc("/api/mcp/servers/update", s.handleMCPConfiguredServerUpdate)
	s.mux.HandleFunc("/api/mcp/servers/delete", s.handleMCPConfiguredServerDelete)
	s.mux.HandleFunc("/api/mcp/servers/bulk-import", s.handleMCPConfiguredServerBulkImport)
	s.mux.HandleFunc("/api/mcp/servers/reload-metadata", s.handleMCPConfiguredServerReloadMetadata)
	s.mux.HandleFunc("/api/mcp/servers/clear-metadata-cache", s.handleMCPConfiguredServerClearMetadataCache)
	s.mux.HandleFunc("/api/mcp/servers/registry-snapshot", s.handleMCPRegistrySnapshot)
	s.mux.HandleFunc("/api/mcp/servers/sync-targets", s.handleMCPSyncTargets)
	s.mux.HandleFunc("/api/mcp/servers/export-client-config", s.handleMCPExportClientConfig)
	s.mux.HandleFunc("/api/mcp/servers/sync-client-config", s.handleMCPSyncClientConfig)
	s.mux.HandleFunc("/api/mcp/tools", s.handleMCPTools)
	s.mux.HandleFunc("/api/mcp/tools/search", s.handleMCPSearchTools)
	s.mux.HandleFunc("/api/mcp/tools/call", s.handleMCPCallTool)
	s.mux.HandleFunc("/api/mcp/tools/schema", s.handleMCPToolSchema)
	s.mux.HandleFunc("/api/mcp/preferences", s.handleMCPToolPreferences)
	s.mux.HandleFunc("/api/mcp/traffic", s.handleMCPTraffic)
	s.mux.HandleFunc("/api/mcp/tool-selection-telemetry", s.handleMCPToolSelectionTelemetry)
	s.mux.HandleFunc("/api/mcp/tool-selection-telemetry/clear", s.handleMCPClearToolSelectionTelemetry)
	s.mux.HandleFunc("/api/mcp/server-test", s.handleMCPServerTest)
	s.mux.HandleFunc("/api/mcp/config/jsonc", s.handleMCPJsoncConfig)
	s.mux.HandleFunc("/api/mcp/working-set", s.handleMCPWorkingSet)
	s.mux.HandleFunc("/api/mcp/working-set/evictions", s.handleMCPWorkingSetEvictions)
	s.mux.HandleFunc("/api/mcp/working-set/evictions/clear", s.handleMCPClearWorkingSetEvictions)
	s.mux.HandleFunc("/api/mcp/working-set/load", s.handleMCPLoadTool)
	s.mux.HandleFunc("/api/mcp/working-set/unload", s.handleMCPUnloadTool)
	s.mux.HandleFunc("/api/memory/search", s.handleMemorySearch)
	s.mux.HandleFunc("/api/memory/contexts", s.handleMemoryContexts)
	s.mux.HandleFunc("/api/memory/context/get", s.handleMemoryContextGet)
	s.mux.HandleFunc("/api/memory/context/delete", s.handleMemoryContextDelete)
	s.mux.HandleFunc("/api/memory/agent-stats", s.handleMemoryAgentStats)
	s.mux.HandleFunc("/api/memory/agent-search", s.handleMemoryAgentSearch)
	s.mux.HandleFunc("/api/memory/session-bootstrap", s.handleMemorySessionBootstrap)
	s.mux.HandleFunc("/api/memory/tool-context", s.handleMemoryToolContext)
	s.mux.HandleFunc("/api/memory/session-summaries/recent", s.handleMemoryRecentSessionSummaries)
	s.mux.HandleFunc("/api/memory/session-summaries/search", s.handleMemorySearchSessionSummaries)
	s.mux.HandleFunc("/api/memory/interchange-formats", s.handleMemoryInterchangeFormats)
	s.mux.HandleFunc("/api/memory/export", s.handleMemoryExport)
	s.mux.HandleFunc("/api/memory/import", s.handleMemoryImport)
	s.mux.HandleFunc("/api/memory/convert", s.handleMemoryConvert)
	s.mux.HandleFunc("/api/agent-memory/search", s.handleAgentMemorySearch)
	s.mux.HandleFunc("/api/agent-memory/add", s.handleAgentMemoryAdd)
	s.mux.HandleFunc("/api/agent-memory/recent", s.handleAgentMemoryRecent)
	s.mux.HandleFunc("/api/agent-memory/by-type", s.handleAgentMemoryByType)
	s.mux.HandleFunc("/api/agent-memory/by-namespace", s.handleAgentMemoryByNamespace)
	s.mux.HandleFunc("/api/agent-memory/delete", s.handleAgentMemoryDelete)
	s.mux.HandleFunc("/api/agent-memory/clear-session", s.handleAgentMemoryClearSession)
	s.mux.HandleFunc("/api/agent-memory/export", s.handleAgentMemoryExport)
	s.mux.HandleFunc("/api/agent-memory/handoff", s.handleAgentMemoryHandoff)
	s.mux.HandleFunc("/api/agent-memory/pickup", s.handleAgentMemoryPickup)
	s.mux.HandleFunc("/api/agent-memory/stats", s.handleAgentMemoryStats)
	s.mux.HandleFunc("/api/graph", s.handleGraphGet)
	s.mux.HandleFunc("/api/graph/rebuild", s.handleGraphRebuild)
	s.mux.HandleFunc("/api/graph/consumers", s.handleGraphConsumers)
	s.mux.HandleFunc("/api/graph/dependencies", s.handleGraphDependencies)
	s.mux.HandleFunc("/api/graph/symbols", s.handleGraphSymbols)
	s.mux.HandleFunc("/api/context/list", s.handleContextList)
	s.mux.HandleFunc("/api/context/add", s.handleContextAdd)
	s.mux.HandleFunc("/api/context/remove", s.handleContextRemove)
	s.mux.HandleFunc("/api/context/clear", s.handleContextClear)
	s.mux.HandleFunc("/api/context/prompt", s.handleContextPrompt)
	s.mux.HandleFunc("/api/git/modules", s.handleGitModules)
	s.mux.HandleFunc("/api/git/log", s.handleGitLog)
	s.mux.HandleFunc("/api/git/status", s.handleGitStatus)
	s.mux.HandleFunc("/api/git/revert", s.handleGitRevert)
	s.mux.HandleFunc("/api/tests/status", s.handleTestsStatus)
	s.mux.HandleFunc("/api/tests/start", s.handleTestsStart)
	s.mux.HandleFunc("/api/tests/stop", s.handleTestsStop)
	s.mux.HandleFunc("/api/tests/run", s.handleTestsRun)
	s.mux.HandleFunc("/api/tests/results", s.handleTestsResults)
	s.mux.HandleFunc("/api/metrics/stats", s.handleMetricsStats)
	s.mux.HandleFunc("/api/metrics/track", s.handleMetricsTrack)
	s.mux.HandleFunc("/api/metrics/system-snapshot", s.handleMetricsSystemSnapshot)
	s.mux.HandleFunc("/api/metrics/timeline", s.handleMetricsTimeline)
	s.mux.HandleFunc("/api/metrics/provider-breakdown", s.handleMetricsProviderBreakdown)
	s.mux.HandleFunc("/api/metrics/monitoring", s.handleMetricsMonitoring)
	s.mux.HandleFunc("/api/metrics/routing-history", s.handleMetricsRoutingHistory)
	s.mux.HandleFunc("/api/logs", s.handleLogsList)
	s.mux.HandleFunc("/api/logs/summary", s.handleLogsSummary)
	s.mux.HandleFunc("/api/logs/clear", s.handleLogsClear)
	s.mux.HandleFunc("/api/server-health/check", s.handleServerHealthCheck)
	s.mux.HandleFunc("/api/server-health/reset", s.handleServerHealthReset)
	s.mux.HandleFunc("/api/settings", s.handleSettingsGet)
	s.mux.HandleFunc("/api/settings/update", s.handleSettingsUpdate)
	s.mux.HandleFunc("/api/settings/providers", s.handleSettingsProviders)
	s.mux.HandleFunc("/api/settings/test-connection", s.handleSettingsTestConnection)
	s.mux.HandleFunc("/api/settings/environment", s.handleSettingsEnvironment)
	s.mux.HandleFunc("/api/settings/mcp-servers", s.handleSettingsMCPServers)
	s.mux.HandleFunc("/api/settings/provider-key", s.handleSettingsProviderKey)
	s.mux.HandleFunc("/api/tools", s.handleToolsList)
	s.mux.HandleFunc("/api/tools/by-server", s.handleToolsByServer)
	s.mux.HandleFunc("/api/tools/search", s.handleToolsSearch)
	s.mux.HandleFunc("/api/tools/detect-cli-harnesses", s.handleToolsDetectCLIHarnesses)
	s.mux.HandleFunc("/api/tools/detect-execution-environment", s.handleToolsDetectExecutionEnvironment)
	s.mux.HandleFunc("/api/tools/detect-install-surfaces", s.handleToolsDetectInstallSurfaces)
	s.mux.HandleFunc("/api/tools/get", s.handleToolsGet)
	s.mux.HandleFunc("/api/tools/create", s.handleToolsCreate)
	s.mux.HandleFunc("/api/tools/upsert-batch", s.handleToolsUpsertBatch)
	s.mux.HandleFunc("/api/tools/delete", s.handleToolsDelete)
	s.mux.HandleFunc("/api/tools/always-on", s.handleToolsAlwaysOn)
	s.mux.HandleFunc("/api/tool-sets", s.handleToolSetsList)
	s.mux.HandleFunc("/api/tool-sets/get", s.handleToolSetsGet)
	s.mux.HandleFunc("/api/tool-sets/create", s.handleToolSetsCreate)
	s.mux.HandleFunc("/api/tool-sets/update", s.handleToolSetsUpdate)
	s.mux.HandleFunc("/api/tool-sets/delete", s.handleToolSetsDelete)
	s.mux.HandleFunc("/api/project/context", s.handleProjectContext)
	s.mux.HandleFunc("/api/project/context/update", s.handleProjectContextUpdate)
	s.mux.HandleFunc("/api/project/handoffs", s.handleProjectHandoffs)
	s.mux.HandleFunc("/api/shell/log", s.handleShellLog)
	s.mux.HandleFunc("/api/shell/history/query", s.handleShellQueryHistory)
	s.mux.HandleFunc("/api/shell/history/system", s.handleShellSystemHistory)
	s.mux.HandleFunc("/api/agent/tool", s.handleAgentRunTool)
	s.mux.HandleFunc("/api/agent/chat", s.handleAgentChat)
	s.mux.HandleFunc("/api/commands/execute", s.handleCommandsExecute)
	s.mux.HandleFunc("/api/commands", s.handleCommandsList)
	s.mux.HandleFunc("/api/skills", s.handleSkillsList)
	s.mux.HandleFunc("/api/skills/read", s.handleSkillsRead)
	s.mux.HandleFunc("/api/skills/create", s.handleSkillsCreate)
	s.mux.HandleFunc("/api/skills/save", s.handleSkillsSave)
	s.mux.HandleFunc("/api/skills/assimilate", s.handleSkillsAssimilate)
	s.mux.HandleFunc("/api/workflows", s.handleWorkflowList)
	s.mux.HandleFunc("/api/workflows/graph", s.handleWorkflowGraph)
	s.mux.HandleFunc("/api/workflows/start", s.handleWorkflowStart)
	s.mux.HandleFunc("/api/workflows/executions", s.handleWorkflowExecutions)
	s.mux.HandleFunc("/api/workflows/execution", s.handleWorkflowExecution)
	s.mux.HandleFunc("/api/workflows/history", s.handleWorkflowHistory)
	s.mux.HandleFunc("/api/workflows/resume", s.handleWorkflowResume)
	s.mux.HandleFunc("/api/workflows/pause", s.handleWorkflowPause)
	s.mux.HandleFunc("/api/workflows/approve", s.handleWorkflowApprove)
	s.mux.HandleFunc("/api/workflows/reject", s.handleWorkflowReject)
	s.mux.HandleFunc("/api/workflows/canvases", s.handleWorkflowCanvases)
	s.mux.HandleFunc("/api/workflows/canvas", s.handleWorkflowCanvas)
	s.mux.HandleFunc("/api/workflows/canvas/save", s.handleWorkflowCanvasSave)
	s.mux.HandleFunc("/api/symbols", s.handleSymbolsList)
	s.mux.HandleFunc("/api/symbols/find", s.handleSymbolsFind)
	s.mux.HandleFunc("/api/symbols/pin", s.handleSymbolsPin)
	s.mux.HandleFunc("/api/symbols/unpin", s.handleSymbolsUnpin)
	s.mux.HandleFunc("/api/symbols/priority", s.handleSymbolsUpdatePriority)
	s.mux.HandleFunc("/api/symbols/notes", s.handleSymbolsAddNotes)
	s.mux.HandleFunc("/api/symbols/clear", s.handleSymbolsClear)
	s.mux.HandleFunc("/api/symbols/file", s.handleSymbolsForFile)
	s.mux.HandleFunc("/api/lsp/find-symbol", s.handleLSPFindSymbol)
	s.mux.HandleFunc("/api/lsp/find-references", s.handleLSPFindReferences)
	s.mux.HandleFunc("/api/lsp/symbols", s.handleLSPGetSymbols)
	s.mux.HandleFunc("/api/lsp/search", s.handleLSPSearchSymbols)
	s.mux.HandleFunc("/api/lsp/index", s.handleLSPIndexProject)
	s.mux.HandleFunc("/api/api-keys", s.handleAPIKeysList)
	s.mux.HandleFunc("/api/api-keys/get", s.handleAPIKeysGet)
	s.mux.HandleFunc("/api/api-keys/create", s.handleAPIKeysCreate)
	s.mux.HandleFunc("/api/api-keys/update", s.handleAPIKeysUpdate)
	s.mux.HandleFunc("/api/api-keys/delete", s.handleAPIKeysDelete)
	s.mux.HandleFunc("/api/api-keys/validate", s.handleAPIKeysValidate)
	s.mux.HandleFunc("/api/audit", s.handleAuditList)
	s.mux.HandleFunc("/api/audit/query", s.handleAuditQuery)
	s.mux.HandleFunc("/api/scripts", s.handleSavedScriptsList)
	s.mux.HandleFunc("/api/scripts/get", s.handleSavedScriptsGet)
	s.mux.HandleFunc("/api/scripts/create", s.handleSavedScriptsCreate)
	s.mux.HandleFunc("/api/scripts/update", s.handleSavedScriptsUpdate)
	s.mux.HandleFunc("/api/scripts/delete", s.handleSavedScriptsDelete)
	s.mux.HandleFunc("/api/scripts/execute", s.handleSavedScriptsExecute)
	s.mux.HandleFunc("/api/links-backlog", s.handleLinksBacklogList)
	s.mux.HandleFunc("/api/links-backlog/stats", s.handleLinksBacklogStats)
	s.mux.HandleFunc("/api/links-backlog/get", s.handleLinksBacklogGet)
	s.mux.HandleFunc("/api/links-backlog/sync", s.handleLinksBacklogSync)
	s.mux.HandleFunc("/api/infrastructure", s.handleInfrastructureStatus)
	s.mux.HandleFunc("/api/infrastructure/doctor", s.handleInfrastructureDoctor)
	s.mux.HandleFunc("/api/infrastructure/apply", s.handleInfrastructureApply)
	s.mux.HandleFunc("/api/expert/research", s.handleExpertResearch)
	s.mux.HandleFunc("/api/expert/code", s.handleExpertCode)
	s.mux.HandleFunc("/api/expert/status", s.handleExpertStatus)
	s.mux.HandleFunc("/api/policies", s.handlePoliciesList)
	s.mux.HandleFunc("/api/policies/get", s.handlePoliciesGet)
	s.mux.HandleFunc("/api/policies/create", s.handlePoliciesCreate)
	s.mux.HandleFunc("/api/policies/update", s.handlePoliciesUpdate)
	s.mux.HandleFunc("/api/policies/delete", s.handlePoliciesDelete)
	s.mux.HandleFunc("/api/secrets", s.handleSecretsList)
	s.mux.HandleFunc("/api/secrets/set", s.handleSecretsSet)
	s.mux.HandleFunc("/api/secrets/delete", s.handleSecretsDelete)
	s.mux.HandleFunc("/api/marketplace", s.handleMarketplaceList)
	s.mux.HandleFunc("/api/marketplace/install", s.handleMarketplaceInstall)
	s.mux.HandleFunc("/api/marketplace/publish", s.handleMarketplacePublish)
	s.mux.HandleFunc("/api/catalog", s.handleCatalogList)
	s.mux.HandleFunc("/api/catalog/get", s.handleCatalogGet)
	s.mux.HandleFunc("/api/catalog/runs", s.handleCatalogRuns)
	s.mux.HandleFunc("/api/catalog/ingest", s.handleCatalogIngest)
	s.mux.HandleFunc("/api/catalog/validate", s.handleCatalogValidate)
	s.mux.HandleFunc("/api/catalog/install", s.handleCatalogInstall)
	s.mux.HandleFunc("/api/catalog/validate-batch", s.handleCatalogValidateBatch)
	s.mux.HandleFunc("/api/catalog/stats", s.handleCatalogStats)
	s.mux.HandleFunc("/api/catalog/linked-servers", s.handleCatalogLinkedServers)
	s.mux.HandleFunc("/api/oauth/clients/create", s.handleOAuthClientCreate)
	s.mux.HandleFunc("/api/oauth/clients/get", s.handleOAuthClientGet)
	s.mux.HandleFunc("/api/oauth/sessions/upsert", s.handleOAuthSessionUpsert)
	s.mux.HandleFunc("/api/oauth/sessions/by-server", s.handleOAuthSessionGetByServer)
	s.mux.HandleFunc("/api/oauth/exchange", s.handleOAuthExchange)
	s.mux.HandleFunc("/api/research/conduct", s.handleResearchConduct)
	s.mux.HandleFunc("/api/research/ingest", s.handleResearchIngest)
	s.mux.HandleFunc("/api/research/recursive", s.handleResearchRecursive)
	s.mux.HandleFunc("/api/research/queries", s.handleResearchQueries)
	s.mux.HandleFunc("/api/research/queue", s.handleResearchQueue)
	s.mux.HandleFunc("/api/research/retry-failed", s.handleResearchRetryFailed)
	s.mux.HandleFunc("/api/research/retry-all-failed", s.handleResearchRetryAllFailed)
	s.mux.HandleFunc("/api/research/enqueue", s.handleResearchEnqueuePending)
	s.mux.HandleFunc("/api/pulse/events", s.handlePulseEvents)
	s.mux.HandleFunc("/api/pulse/status", s.handlePulseStatus)
	s.mux.HandleFunc("/api/pulse/providers", s.handlePulseProviders)
	s.mux.HandleFunc("/api/session-export/export", s.handleSessionExport)
	s.mux.HandleFunc("/api/session-export/import", s.handleSessionImport)
	s.mux.HandleFunc("/api/session-export/detect-format", s.handleSessionExportDetectFormat)
	s.mux.HandleFunc("/api/session-export/formats", s.handleSessionExportKnownFormats)
	s.mux.HandleFunc("/api/session-export/history", s.handleSessionExportHistory)
	s.mux.HandleFunc("/api/browser-extension/save-memory", s.handleBrowserExtensionSaveMemory)
	s.mux.HandleFunc("/api/browser-extension/parse-dom", s.handleBrowserExtensionParseDOM)
	s.mux.HandleFunc("/api/browser-extension/memories", s.handleBrowserExtensionListMemories)
	s.mux.HandleFunc("/api/browser-extension/delete-memory", s.handleBrowserExtensionDeleteMemory)
	s.mux.HandleFunc("/api/browser-extension/stats", s.handleBrowserExtensionStats)
	s.mux.HandleFunc("/api/open-webui/status", s.handleOpenWebUIStatus)
	s.mux.HandleFunc("/api/open-webui/embed-url", s.handleOpenWebUIEmbedURL)
	s.mux.HandleFunc("/api/code-mode/status", s.handleCodeModeStatus)
	s.mux.HandleFunc("/api/code-mode/enable", s.handleCodeModeEnable)
	s.mux.HandleFunc("/api/code-mode/disable", s.handleCodeModeDisable)
	s.mux.HandleFunc("/api/code-mode/execute", s.handleCodeModeExecute)
	s.mux.HandleFunc("/api/submodules", s.handleSubmoduleList)
	s.mux.HandleFunc("/api/submodules/update-all", s.handleSubmoduleUpdateAll)
	s.mux.HandleFunc("/api/submodules/install-dependencies", s.handleSubmoduleInstallDependencies)
	s.mux.HandleFunc("/api/submodules/build", s.handleSubmoduleBuild)
	s.mux.HandleFunc("/api/submodules/enable", s.handleSubmoduleEnable)
	s.mux.HandleFunc("/api/submodules/capabilities", s.handleSubmoduleCapabilities)
	s.mux.HandleFunc("/api/suggestions", s.handleSuggestionsList)
	s.mux.HandleFunc("/api/suggestions/resolve", s.handleSuggestionsResolve)
	s.mux.HandleFunc("/api/suggestions/clear", s.handleSuggestionsClear)
	s.mux.HandleFunc("/api/plan/mode", s.handlePlanMode)
	s.mux.HandleFunc("/api/plan/diffs", s.handlePlanDiffs)
	s.mux.HandleFunc("/api/plan/approve-diff", s.handlePlanApproveDiff)
	s.mux.HandleFunc("/api/plan/reject-diff", s.handlePlanRejectDiff)
	s.mux.HandleFunc("/api/plan/apply-all", s.handlePlanApplyAll)
	s.mux.HandleFunc("/api/plan/summary", s.handlePlanSummary)
	s.mux.HandleFunc("/api/plan/checkpoints", s.handlePlanCheckpoints)
	s.mux.HandleFunc("/api/plan/create-checkpoint", s.handlePlanCreateCheckpoint)
	s.mux.HandleFunc("/api/plan/rollback", s.handlePlanRollback)
	s.mux.HandleFunc("/api/plan/clear", s.handlePlanClear)
	s.mux.HandleFunc("/api/knowledge/graph", s.handleKnowledgeGraph)
	s.mux.HandleFunc("/api/knowledge/stats", s.handleKnowledgeStats)
	s.mux.HandleFunc("/api/knowledge/ingest", s.handleKnowledgeIngest)
	s.mux.HandleFunc("/api/knowledge/resources", s.handleKnowledgeResources)
	s.mux.HandleFunc("/api/rag/file", s.handleRAGIngestFile)
	s.mux.HandleFunc("/api/rag/text", s.handleRAGIngestText)
	s.mux.HandleFunc("/api/directory", s.handleUnifiedDirectoryList)
	s.mux.HandleFunc("/api/directory/stats", s.handleUnifiedDirectoryStats)
	s.mux.HandleFunc("/api/tool-chains/aliases", s.handleToolChainAliases)
	s.mux.HandleFunc("/api/tool-chains/aliases/create", s.handleToolChainCreateAlias)
	s.mux.HandleFunc("/api/tool-chains/aliases/remove", s.handleToolChainRemoveAlias)
	s.mux.HandleFunc("/api/tool-chains/aliases/resolve", s.handleToolChainResolveAlias)
	s.mux.HandleFunc("/api/tool-chains", s.handleToolChainsList)
	s.mux.HandleFunc("/api/tool-chains/get", s.handleToolChainsGet)
	s.mux.HandleFunc("/api/tool-chains/create", s.handleToolChainsCreate)
	s.mux.HandleFunc("/api/tool-chains/execute", s.handleToolChainsExecute)
	s.mux.HandleFunc("/api/tool-chains/delete", s.handleToolChainsDelete)
	s.mux.HandleFunc("/api/tool-chains/lazy", s.handleToolChainsLazyStates)
	s.mux.HandleFunc("/api/tool-chains/lazy/register", s.handleToolChainsRegisterLazy)
	s.mux.HandleFunc("/api/tool-chains/lazy/mark-loaded", s.handleToolChainsMarkLoaded)
	s.mux.HandleFunc("/api/browser-controls/scrape", s.handleBrowserControlsScrape)
	s.mux.HandleFunc("/api/browser-controls/history/push", s.handleBrowserControlsPushHistory)
	s.mux.HandleFunc("/api/browser-controls/history/query", s.handleBrowserControlsQueryHistory)
	s.mux.HandleFunc("/api/browser-controls/logs/push", s.handleBrowserControlsPushLogs)
	s.mux.HandleFunc("/api/browser-controls/logs/query", s.handleBrowserControlsQueryLogs)
	s.mux.HandleFunc("/api/browser-controls/stats", s.handleBrowserControlsStats)
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
	s.mux.HandleFunc("/api/startup/status", s.handleStartupStatus)
	s.mux.HandleFunc("/api/mesh/status", s.handleMeshStatus)
	s.mux.HandleFunc("/api/mesh/peers", s.handleMeshPeers)
	s.mux.HandleFunc("/api/mesh/capabilities", s.handleMeshCapabilities)
	s.mux.HandleFunc("/api/mesh/query-capabilities", s.handleMeshQueryCapabilities)
	s.mux.HandleFunc("/api/mesh/find-peer", s.handleMeshFindPeer)
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
				{Path: "/api/sessions/imported/list", Category: "sessions", Description: "Bridge to imported sessions already processed by the TypeScript control plane."},
				{Path: "/api/sessions/imported/get", Category: "sessions", Description: "Bridge to a specific imported session record from the TypeScript control plane."},
				{Path: "/api/sessions/imported/scan", Category: "sessions", Description: "Trigger TypeScript imported-session scanning, import, and memory extraction."},
				{Path: "/api/sessions/imported/instruction-docs", Category: "sessions", Description: "Bridge to imported-session instruction documents generated by the TypeScript control plane."},
				{Path: "/api/mcp/status", Category: "mcp", Description: "Bridge to TypeScript MCP runtime status and pool state."},
				{Path: "/api/mcp/servers/runtime", Category: "mcp", Description: "Bridge to TypeScript runtime MCP server visibility."},
				{Path: "/api/mcp/servers/configured", Category: "mcp", Description: "Bridge to configured MCP server records managed by the TypeScript control plane."},
				{Path: "/api/mcp/servers/get", Category: "mcp", Description: "Bridge to a specific configured MCP server record."},
				{Path: "/api/mcp/servers/create", Category: "mcp", Description: "Create a configured MCP server through the TypeScript control plane."},
				{Path: "/api/mcp/servers/update", Category: "mcp", Description: "Update a configured MCP server through the TypeScript control plane."},
				{Path: "/api/mcp/servers/delete", Category: "mcp", Description: "Delete a configured MCP server through the TypeScript control plane."},
				{Path: "/api/mcp/servers/bulk-import", Category: "mcp", Description: "Bulk import configured MCP servers through the TypeScript control plane."},
				{Path: "/api/mcp/servers/reload-metadata", Category: "mcp", Description: "Refresh cached MCP metadata through the TypeScript control plane."},
				{Path: "/api/mcp/servers/clear-metadata-cache", Category: "mcp", Description: "Clear cached MCP metadata through the TypeScript control plane."},
				{Path: "/api/mcp/servers/registry-snapshot", Category: "mcp", Description: "Bridge to the TypeScript MCP registry snapshot."},
				{Path: "/api/mcp/servers/sync-targets", Category: "mcp", Description: "Bridge to MCP client-config sync targets discovered by the TypeScript control plane."},
				{Path: "/api/mcp/servers/export-client-config", Category: "mcp", Description: "Preview a generated MCP client config through the TypeScript control plane."},
				{Path: "/api/mcp/servers/sync-client-config", Category: "mcp", Description: "Write an MCP client config through the TypeScript control plane."},
				{Path: "/api/mcp/tools", Category: "mcp", Description: "Bridge to aggregated MCP tools from the TypeScript control plane."},
				{Path: "/api/mcp/tools/search", Category: "mcp", Description: "Bridge to TypeScript MCP tool search with optional profile hinting."},
				{Path: "/api/mcp/tools/call", Category: "mcp", Description: "Execute an MCP tool through the TypeScript control plane."},
				{Path: "/api/mcp/tools/schema", Category: "mcp", Description: "Hydrate and return a specific MCP tool schema through the TypeScript control plane."},
				{Path: "/api/mcp/preferences", Category: "mcp", Description: "Get or update MCP tool-selection preferences via the TypeScript control plane."},
				{Path: "/api/mcp/traffic", Category: "mcp", Description: "Bridge to recent TypeScript MCP server traffic events."},
				{Path: "/api/mcp/tool-selection-telemetry", Category: "mcp", Description: "Bridge to TypeScript auto-tool selection telemetry."},
				{Path: "/api/mcp/tool-selection-telemetry/clear", Category: "mcp", Description: "Clear TypeScript auto-tool selection telemetry."},
				{Path: "/api/mcp/server-test", Category: "mcp", Description: "Run a TypeScript MCP server probe through the sidecar."},
				{Path: "/api/mcp/config/jsonc", Category: "mcp", Description: "Read or update the TypeScript MCP JSONC config through the sidecar."},
				{Path: "/api/mcp/working-set", Category: "mcp", Description: "Bridge to the TypeScript MCP working-set snapshot."},
				{Path: "/api/mcp/working-set/evictions", Category: "mcp", Description: "Bridge to TypeScript MCP working-set eviction history."},
				{Path: "/api/mcp/working-set/evictions/clear", Category: "mcp", Description: "Clear TypeScript MCP working-set eviction history."},
				{Path: "/api/mcp/working-set/load", Category: "mcp", Description: "Load an MCP tool into the TypeScript working set."},
				{Path: "/api/mcp/working-set/unload", Category: "mcp", Description: "Unload an MCP tool from the TypeScript working set."},
				{Path: "/api/memory/search", Category: "memory", Description: "Bridge to TypeScript contextual memory search."},
				{Path: "/api/memory/contexts", Category: "memory", Description: "Bridge to TypeScript saved context listing."},
				{Path: "/api/memory/context/get", Category: "memory", Description: "Bridge to a specific saved memory context."},
				{Path: "/api/memory/context/delete", Category: "memory", Description: "Delete a saved memory context through the TypeScript control plane."},
				{Path: "/api/memory/agent-stats", Category: "memory", Description: "Bridge to TypeScript agent-memory statistics."},
				{Path: "/api/memory/agent-search", Category: "memory", Description: "Bridge to TypeScript agent-memory search."},
				{Path: "/api/memory/session-bootstrap", Category: "memory", Description: "Bridge to TypeScript session bootstrap memory context."},
				{Path: "/api/memory/tool-context", Category: "memory", Description: "Bridge to TypeScript tool-context memory lookup."},
				{Path: "/api/memory/session-summaries/recent", Category: "memory", Description: "Bridge to recent session-summary memories from the TypeScript control plane."},
				{Path: "/api/memory/session-summaries/search", Category: "memory", Description: "Bridge to session-summary memory search from the TypeScript control plane."},
				{Path: "/api/memory/interchange-formats", Category: "memory", Description: "Bridge to the TypeScript memory interchange-format list."},
				{Path: "/api/memory/export", Category: "memory", Description: "Bridge to TypeScript memory export."},
				{Path: "/api/memory/import", Category: "memory", Description: "Bridge to TypeScript memory import."},
				{Path: "/api/memory/convert", Category: "memory", Description: "Bridge to TypeScript memory format conversion."},
				{Path: "/api/agent-memory/search", Category: "memory", Description: "Bridge to TypeScript agent-memory search across namespaces and tiers."},
				{Path: "/api/agent-memory/add", Category: "memory", Description: "Add an agent-memory entry through the TypeScript control plane."},
				{Path: "/api/agent-memory/recent", Category: "memory", Description: "Bridge to recent TypeScript agent-memory entries."},
				{Path: "/api/agent-memory/by-type", Category: "memory", Description: "Bridge to TypeScript agent-memory entries for a specific tier."},
				{Path: "/api/agent-memory/by-namespace", Category: "memory", Description: "Bridge to TypeScript agent-memory entries for a specific namespace."},
				{Path: "/api/agent-memory/delete", Category: "memory", Description: "Delete a TypeScript agent-memory entry by id."},
				{Path: "/api/agent-memory/clear-session", Category: "memory", Description: "Clear session-tier agent memory through the TypeScript control plane."},
				{Path: "/api/agent-memory/export", Category: "memory", Description: "Bridge to TypeScript agent-memory export."},
				{Path: "/api/agent-memory/handoff", Category: "memory", Description: "Create an agent-memory handoff artifact through the TypeScript control plane."},
				{Path: "/api/agent-memory/pickup", Category: "memory", Description: "Restore an agent-memory handoff artifact through the TypeScript control plane."},
				{Path: "/api/agent-memory/stats", Category: "memory", Description: "Bridge to TypeScript agent-memory counts by tier."},
				{Path: "/api/graph", Category: "code", Description: "Bridge to the TypeScript repository graph snapshot."},
				{Path: "/api/graph/rebuild", Category: "code", Description: "Rebuild the TypeScript repository graph and return the latest snapshot."},
				{Path: "/api/graph/consumers", Category: "code", Description: "Bridge to repository graph consumers for a given file path."},
				{Path: "/api/graph/dependencies", Category: "code", Description: "Bridge to repository graph dependencies for a given file path."},
				{Path: "/api/graph/symbols", Category: "code", Description: "Bridge to the TypeScript symbols graph snapshot."},
				{Path: "/api/context/list", Category: "code", Description: "Bridge to the current TypeScript context file list."},
				{Path: "/api/context/add", Category: "code", Description: "Add a file to the TypeScript context manager."},
				{Path: "/api/context/remove", Category: "code", Description: "Remove a file from the TypeScript context manager."},
				{Path: "/api/context/clear", Category: "code", Description: "Clear the TypeScript context manager state."},
				{Path: "/api/context/prompt", Category: "code", Description: "Bridge to the TypeScript context prompt output."},
				{Path: "/api/git/modules", Category: "code", Description: "Bridge to parsed git submodule metadata from the TypeScript control plane."},
				{Path: "/api/git/log", Category: "code", Description: "Bridge to git log output from the TypeScript control plane."},
				{Path: "/api/git/status", Category: "code", Description: "Bridge to git status output from the TypeScript control plane."},
				{Path: "/api/git/revert", Category: "code", Description: "Request a git revert through the TypeScript control plane."},
				{Path: "/api/tests/status", Category: "code", Description: "Bridge to TypeScript auto-test service status."},
				{Path: "/api/tests/start", Category: "code", Description: "Start the TypeScript auto-test service."},
				{Path: "/api/tests/stop", Category: "code", Description: "Stop the TypeScript auto-test service."},
				{Path: "/api/tests/run", Category: "code", Description: "Run the relevant TypeScript test file for a given source path."},
				{Path: "/api/tests/results", Category: "code", Description: "Bridge to recent TypeScript auto-test results."},
				{Path: "/api/metrics/stats", Category: "ops", Description: "Bridge to aggregated TypeScript metrics stats for a time window."},
				{Path: "/api/metrics/track", Category: "ops", Description: "Track a custom metric event through the TypeScript control plane."},
				{Path: "/api/metrics/system-snapshot", Category: "ops", Description: "Bridge to the TypeScript real-time system resource snapshot."},
				{Path: "/api/metrics/timeline", Category: "ops", Description: "Bridge to downsampled TypeScript metrics timeline data."},
				{Path: "/api/metrics/provider-breakdown", Category: "ops", Description: "Bridge to TypeScript provider request, latency, and cost breakdowns."},
				{Path: "/api/metrics/monitoring", Category: "ops", Description: "Toggle TypeScript metrics monitoring state."},
				{Path: "/api/metrics/routing-history", Category: "ops", Description: "Bridge to recent TypeScript LLM routing and failover decisions."},
				{Path: "/api/logs", Category: "ops", Description: "Bridge to TypeScript observability log listing with optional filters."},
				{Path: "/api/logs/summary", Category: "ops", Description: "Bridge to the TypeScript observability summary rollup."},
				{Path: "/api/logs/clear", Category: "ops", Description: "Clear TypeScript observability logs."},
				{Path: "/api/server-health/check", Category: "ops", Description: "Bridge to the TypeScript MCP server health state for a specific server UUID."},
				{Path: "/api/server-health/reset", Category: "ops", Description: "Reset the TypeScript MCP server health error state for a specific server UUID."},
				{Path: "/api/settings", Category: "control", Description: "Bridge to the full TypeScript configuration object."},
				{Path: "/api/settings/update", Category: "control", Description: "Update the TypeScript configuration object with a partial config payload."},
				{Path: "/api/settings/providers", Category: "control", Description: "Bridge to masked TypeScript provider key visibility."},
				{Path: "/api/settings/test-connection", Category: "control", Description: "Test a provider connection through the TypeScript control plane."},
				{Path: "/api/settings/environment", Category: "control", Description: "Bridge to TypeScript environment diagnostics."},
				{Path: "/api/settings/mcp-servers", Category: "control", Description: "Bridge to configured MCP servers from the TypeScript settings layer."},
				{Path: "/api/settings/provider-key", Category: "control", Description: "Persist a provider key through the TypeScript settings layer."},
				{Path: "/api/tools", Category: "control", Description: "Bridge to the TypeScript tool registry list."},
				{Path: "/api/tools/by-server", Category: "control", Description: "Bridge to TypeScript tools filtered by MCP server."},
				{Path: "/api/tools/search", Category: "control", Description: "Bridge to TypeScript tool search."},
				{Path: "/api/tools/detect-cli-harnesses", Category: "control", Description: "Bridge to TypeScript CLI harness detection."},
				{Path: "/api/tools/detect-execution-environment", Category: "control", Description: "Bridge to TypeScript execution-environment detection."},
				{Path: "/api/tools/detect-install-surfaces", Category: "control", Description: "Bridge to TypeScript install-surface detection."},
				{Path: "/api/tools/get", Category: "control", Description: "Bridge to a specific TypeScript tool definition."},
				{Path: "/api/tools/create", Category: "control", Description: "Create a tool through the TypeScript control plane."},
				{Path: "/api/tools/upsert-batch", Category: "control", Description: "Upsert a batch of tools through the TypeScript control plane."},
				{Path: "/api/tools/delete", Category: "control", Description: "Delete a tool through the TypeScript control plane."},
				{Path: "/api/tools/always-on", Category: "control", Description: "Toggle the TypeScript always-on state for a tool."},
				{Path: "/api/tool-sets", Category: "control", Description: "Bridge to the TypeScript tool-set list."},
				{Path: "/api/tool-sets/get", Category: "control", Description: "Bridge to a specific TypeScript tool set."},
				{Path: "/api/tool-sets/create", Category: "control", Description: "Create a tool set through the TypeScript control plane."},
				{Path: "/api/tool-sets/update", Category: "control", Description: "Update a tool set through the TypeScript control plane."},
				{Path: "/api/tool-sets/delete", Category: "control", Description: "Delete a tool set through the TypeScript control plane."},
				{Path: "/api/project/context", Category: "control", Description: "Bridge to the TypeScript project context document."},
				{Path: "/api/project/context/update", Category: "control", Description: "Update the TypeScript project context document."},
				{Path: "/api/project/handoffs", Category: "control", Description: "Bridge to TypeScript project handoff metadata."},
				{Path: "/api/shell/log", Category: "control", Description: "Log a shell command through the TypeScript shell service."},
				{Path: "/api/shell/history/query", Category: "control", Description: "Bridge to TypeScript shell history search."},
				{Path: "/api/shell/history/system", Category: "control", Description: "Bridge to recent TypeScript system shell history."},
				{Path: "/api/agent/tool", Category: "agents", Description: "Run a tool through the TypeScript agent router."},
				{Path: "/api/agent/chat", Category: "agents", Description: "Bridge to the TypeScript agent chat surface."},
				{Path: "/api/commands/execute", Category: "agents", Description: "Execute a TypeScript command-registry entry."},
				{Path: "/api/commands", Category: "agents", Description: "Bridge to the TypeScript command registry list."},
				{Path: "/api/skills", Category: "agents", Description: "Bridge to the TypeScript skill registry list."},
				{Path: "/api/skills/read", Category: "agents", Description: "Read a skill through the TypeScript skill registry."},
				{Path: "/api/skills/create", Category: "agents", Description: "Create a skill through the TypeScript skill registry."},
				{Path: "/api/skills/save", Category: "agents", Description: "Save skill content through the TypeScript skill registry."},
				{Path: "/api/skills/assimilate", Category: "agents", Description: "Assimilate docs into a skill through the TypeScript skill-assimilation service."},
				{Path: "/api/workflows", Category: "workflow", Description: "Bridge to TypeScript workflow definitions."},
				{Path: "/api/workflows/graph", Category: "workflow", Description: "Bridge to a TypeScript workflow graph."},
				{Path: "/api/workflows/start", Category: "workflow", Description: "Start a TypeScript workflow execution."},
				{Path: "/api/workflows/executions", Category: "workflow", Description: "List TypeScript workflow executions."},
				{Path: "/api/workflows/execution", Category: "workflow", Description: "Bridge to a TypeScript workflow execution record."},
				{Path: "/api/workflows/history", Category: "workflow", Description: "Bridge to TypeScript workflow execution history."},
				{Path: "/api/workflows/resume", Category: "workflow", Description: "Resume a TypeScript workflow execution."},
				{Path: "/api/workflows/pause", Category: "workflow", Description: "Pause a TypeScript workflow execution."},
				{Path: "/api/workflows/approve", Category: "workflow", Description: "Approve a TypeScript workflow execution."},
				{Path: "/api/workflows/reject", Category: "workflow", Description: "Reject a TypeScript workflow execution."},
				{Path: "/api/workflows/canvases", Category: "workflow", Description: "List saved TypeScript workflow canvases."},
				{Path: "/api/workflows/canvas", Category: "workflow", Description: "Load a saved TypeScript workflow canvas."},
				{Path: "/api/workflows/canvas/save", Category: "workflow", Description: "Save a TypeScript workflow canvas."},
				{Path: "/api/symbols", Category: "code", Description: "List pinned symbols through the TypeScript symbols router."},
				{Path: "/api/symbols/find", Category: "code", Description: "Search symbols through the TypeScript symbols router."},
				{Path: "/api/symbols/pin", Category: "code", Description: "Pin a symbol through the TypeScript symbols router."},
				{Path: "/api/symbols/unpin", Category: "code", Description: "Unpin a symbol through the TypeScript symbols router."},
				{Path: "/api/symbols/priority", Category: "code", Description: "Update symbol priority through the TypeScript symbols router."},
				{Path: "/api/symbols/notes", Category: "code", Description: "Add symbol notes through the TypeScript symbols router."},
				{Path: "/api/symbols/clear", Category: "code", Description: "Clear pinned symbols through the TypeScript symbols router."},
				{Path: "/api/symbols/file", Category: "code", Description: "List pinned symbols for a file through the TypeScript symbols router."},
				{Path: "/api/lsp/find-symbol", Category: "code", Description: "Bridge to the TypeScript LSP find-symbol surface."},
				{Path: "/api/lsp/find-references", Category: "code", Description: "Bridge to the TypeScript LSP reference search surface."},
				{Path: "/api/lsp/symbols", Category: "code", Description: "Bridge to the TypeScript LSP file-symbol surface."},
				{Path: "/api/lsp/search", Category: "code", Description: "Bridge to the TypeScript LSP symbol-search surface."},
				{Path: "/api/lsp/index", Category: "code", Description: "Trigger TypeScript LSP indexing through the bridge."},
				{Path: "/api/api-keys", Category: "governance", Description: "List API keys through the TypeScript API keys router."},
				{Path: "/api/api-keys/get", Category: "governance", Description: "Read an API key through the TypeScript API keys router."},
				{Path: "/api/api-keys/create", Category: "governance", Description: "Create an API key through the TypeScript API keys router."},
				{Path: "/api/api-keys/update", Category: "governance", Description: "Update an API key through the TypeScript API keys router."},
				{Path: "/api/api-keys/delete", Category: "governance", Description: "Delete an API key through the TypeScript API keys router."},
				{Path: "/api/api-keys/validate", Category: "governance", Description: "Validate an API key through the TypeScript API keys router."},
				{Path: "/api/audit", Category: "governance", Description: "List audit logs through the TypeScript audit router."},
				{Path: "/api/audit/query", Category: "governance", Description: "Query audit logs through the TypeScript audit router."},
				{Path: "/api/scripts", Category: "operator", Description: "List saved scripts through the TypeScript saved scripts router."},
				{Path: "/api/scripts/get", Category: "operator", Description: "Read a saved script through the TypeScript saved scripts router."},
				{Path: "/api/scripts/create", Category: "operator", Description: "Create a saved script through the TypeScript saved scripts router."},
				{Path: "/api/scripts/update", Category: "operator", Description: "Update a saved script through the TypeScript saved scripts router."},
				{Path: "/api/scripts/delete", Category: "operator", Description: "Delete a saved script through the TypeScript saved scripts router."},
				{Path: "/api/scripts/execute", Category: "operator", Description: "Execute a saved script through the TypeScript saved scripts router."},
				{Path: "/api/links-backlog", Category: "operator", Description: "List BobbyBookmarks backlog links through the TypeScript links backlog router."},
				{Path: "/api/links-backlog/stats", Category: "operator", Description: "Read BobbyBookmarks backlog stats through the TypeScript links backlog router."},
				{Path: "/api/links-backlog/get", Category: "operator", Description: "Read a BobbyBookmarks backlog item through the TypeScript links backlog router."},
				{Path: "/api/links-backlog/sync", Category: "operator", Description: "Sync BobbyBookmarks backlog data through the TypeScript links backlog router."},
				{Path: "/api/infrastructure", Category: "operator", Description: "Read infrastructure daemon status through the TypeScript infrastructure router."},
				{Path: "/api/infrastructure/doctor", Category: "operator", Description: "Run the infrastructure doctor command through the TypeScript infrastructure router."},
				{Path: "/api/infrastructure/apply", Category: "operator", Description: "Apply infrastructure configuration through the TypeScript infrastructure router."},
				{Path: "/api/expert/research", Category: "agents", Description: "Dispatch a research task through the TypeScript expert router."},
				{Path: "/api/expert/code", Category: "agents", Description: "Dispatch a coding task through the TypeScript expert router."},
				{Path: "/api/expert/status", Category: "agents", Description: "Read TypeScript expert agent status."},
				{Path: "/api/policies", Category: "governance", Description: "List policies through the TypeScript policies router."},
				{Path: "/api/policies/get", Category: "governance", Description: "Read a policy through the TypeScript policies router."},
				{Path: "/api/policies/create", Category: "governance", Description: "Create a policy through the TypeScript policies router."},
				{Path: "/api/policies/update", Category: "governance", Description: "Update a policy through the TypeScript policies router."},
				{Path: "/api/policies/delete", Category: "governance", Description: "Delete a policy through the TypeScript policies router."},
				{Path: "/api/secrets", Category: "governance", Description: "List secrets through the TypeScript secrets router."},
				{Path: "/api/secrets/set", Category: "governance", Description: "Set a secret through the TypeScript secrets router."},
				{Path: "/api/secrets/delete", Category: "governance", Description: "Delete a secret through the TypeScript secrets router."},
				{Path: "/api/marketplace", Category: "registry", Description: "List marketplace entries through the TypeScript marketplace router."},
				{Path: "/api/marketplace/install", Category: "registry", Description: "Install a marketplace entry through the TypeScript marketplace router."},
				{Path: "/api/marketplace/publish", Category: "registry", Description: "Publish a marketplace entry through the TypeScript marketplace router."},
				{Path: "/api/catalog", Category: "registry", Description: "List published catalog entries through the TypeScript catalog router."},
				{Path: "/api/catalog/get", Category: "registry", Description: "Read a published catalog entry through the TypeScript catalog router."},
				{Path: "/api/catalog/runs", Category: "registry", Description: "List validation runs through the TypeScript catalog router."},
				{Path: "/api/catalog/ingest", Category: "registry", Description: "Trigger published catalog ingestion through the TypeScript catalog router."},
				{Path: "/api/catalog/validate", Category: "registry", Description: "Trigger published catalog validation through the TypeScript catalog router."},
				{Path: "/api/catalog/install", Category: "registry", Description: "Install an MCP server from a TypeScript catalog recipe."},
				{Path: "/api/catalog/validate-batch", Category: "registry", Description: "Trigger batch catalog validation through the TypeScript catalog router."},
				{Path: "/api/catalog/stats", Category: "registry", Description: "Read catalog summary stats through the TypeScript catalog router."},
				{Path: "/api/catalog/linked-servers", Category: "registry", Description: "List managed servers linked to a published catalog entry."},
				{Path: "/api/oauth/clients/create", Category: "auth", Description: "Create an OAuth client through the TypeScript OAuth router."},
				{Path: "/api/oauth/clients/get", Category: "auth", Description: "Read an OAuth client through the TypeScript OAuth router."},
				{Path: "/api/oauth/sessions/upsert", Category: "auth", Description: "Upsert an OAuth session through the TypeScript OAuth router."},
				{Path: "/api/oauth/sessions/by-server", Category: "auth", Description: "Read an OAuth session for an MCP server through the TypeScript OAuth router."},
				{Path: "/api/oauth/exchange", Category: "auth", Description: "Exchange an OAuth authorization code through the TypeScript OAuth router."},
				{Path: "/api/research/conduct", Category: "research", Description: "Run a research task through the TypeScript research router."},
				{Path: "/api/research/ingest", Category: "research", Description: "Ingest a research URL through the TypeScript research router."},
				{Path: "/api/research/recursive", Category: "research", Description: "Run recursive research through the TypeScript research router."},
				{Path: "/api/research/queries", Category: "research", Description: "Generate research queries through the TypeScript research router."},
				{Path: "/api/research/queue", Category: "research", Description: "Read research ingestion queue state through the TypeScript research router."},
				{Path: "/api/research/retry-failed", Category: "research", Description: "Retry a failed research URL through the TypeScript research router."},
				{Path: "/api/research/retry-all-failed", Category: "research", Description: "Retry all failed research URLs through the TypeScript research router."},
				{Path: "/api/research/enqueue", Category: "research", Description: "Enqueue a research URL through the TypeScript research router."},
				{Path: "/api/pulse/events", Category: "observability", Description: "Read pulse event history through the TypeScript pulse router."},
				{Path: "/api/pulse/status", Category: "observability", Description: "Read pulse system status through the TypeScript pulse router."},
				{Path: "/api/pulse/providers", Category: "observability", Description: "Check local provider status through the TypeScript pulse router."},
				{Path: "/api/session-export/export", Category: "sessions", Description: "Export sessions through the TypeScript session export router."},
				{Path: "/api/session-export/import", Category: "sessions", Description: "Import sessions through the TypeScript session export router."},
				{Path: "/api/session-export/detect-format", Category: "sessions", Description: "Detect session export format through the TypeScript session export router."},
				{Path: "/api/session-export/formats", Category: "sessions", Description: "List known session export formats through the TypeScript session export router."},
				{Path: "/api/session-export/history", Category: "sessions", Description: "Read session export history through the TypeScript session export router."},
				{Path: "/api/browser-extension/save-memory", Category: "ui", Description: "Save a browser-extension memory through the TypeScript browser extension router."},
				{Path: "/api/browser-extension/parse-dom", Category: "ui", Description: "Parse browser DOM content through the TypeScript browser extension router."},
				{Path: "/api/browser-extension/memories", Category: "ui", Description: "List browser-extension memories through the TypeScript browser extension router."},
				{Path: "/api/browser-extension/delete-memory", Category: "ui", Description: "Delete a browser-extension memory through the TypeScript browser extension router."},
				{Path: "/api/browser-extension/stats", Category: "ui", Description: "Read browser-extension memory stats through the TypeScript browser extension router."},
				{Path: "/api/open-webui/status", Category: "ui", Description: "Read Open WebUI status through the TypeScript OpenWebUI router."},
				{Path: "/api/open-webui/embed-url", Category: "ui", Description: "Read Open WebUI embed URL through the TypeScript OpenWebUI router."},
				{Path: "/api/code-mode/status", Category: "ui", Description: "Read Code Mode status through the TypeScript code mode router."},
				{Path: "/api/code-mode/enable", Category: "ui", Description: "Enable Code Mode through the TypeScript code mode router."},
				{Path: "/api/code-mode/disable", Category: "ui", Description: "Disable Code Mode through the TypeScript code mode router."},
				{Path: "/api/code-mode/execute", Category: "ui", Description: "Execute Code Mode code through the TypeScript code mode router."},
				{Path: "/api/submodules", Category: "ui", Description: "List submodules through the TypeScript submodule router."},
				{Path: "/api/submodules/update-all", Category: "ui", Description: "Update all submodules through the TypeScript submodule router."},
				{Path: "/api/submodules/install-dependencies", Category: "ui", Description: "Install submodule dependencies through the TypeScript submodule router."},
				{Path: "/api/submodules/build", Category: "ui", Description: "Build a submodule through the TypeScript submodule router."},
				{Path: "/api/submodules/enable", Category: "ui", Description: "Enable a submodule through the TypeScript submodule router."},
				{Path: "/api/submodules/capabilities", Category: "ui", Description: "Read submodule capabilities through the TypeScript submodule router."},
				{Path: "/api/suggestions", Category: "ui", Description: "List suggestions through the TypeScript suggestions router."},
				{Path: "/api/suggestions/resolve", Category: "ui", Description: "Resolve a suggestion through the TypeScript suggestions router."},
				{Path: "/api/suggestions/clear", Category: "ui", Description: "Clear suggestions through the TypeScript suggestions router."},
				{Path: "/api/plan/mode", Category: "ui", Description: "Read or update plan mode through the TypeScript plan router."},
				{Path: "/api/plan/diffs", Category: "ui", Description: "List pending plan diffs through the TypeScript plan router."},
				{Path: "/api/plan/approve-diff", Category: "ui", Description: "Approve a plan diff through the TypeScript plan router."},
				{Path: "/api/plan/reject-diff", Category: "ui", Description: "Reject a plan diff through the TypeScript plan router."},
				{Path: "/api/plan/apply-all", Category: "ui", Description: "Apply approved plan diffs through the TypeScript plan router."},
				{Path: "/api/plan/summary", Category: "ui", Description: "Read plan sandbox summary through the TypeScript plan router."},
				{Path: "/api/plan/checkpoints", Category: "ui", Description: "List plan checkpoints through the TypeScript plan router."},
				{Path: "/api/plan/create-checkpoint", Category: "ui", Description: "Create a plan checkpoint through the TypeScript plan router."},
				{Path: "/api/plan/rollback", Category: "ui", Description: "Rollback a plan checkpoint through the TypeScript plan router."},
				{Path: "/api/plan/clear", Category: "ui", Description: "Clear plan sandbox state through the TypeScript plan router."},
				{Path: "/api/knowledge/graph", Category: "knowledge", Description: "Read the knowledge graph through the TypeScript knowledge router."},
				{Path: "/api/knowledge/stats", Category: "knowledge", Description: "Read knowledge stats through the TypeScript knowledge router."},
				{Path: "/api/knowledge/ingest", Category: "knowledge", Description: "Ingest a knowledge URL through the TypeScript knowledge router."},
				{Path: "/api/knowledge/resources", Category: "knowledge", Description: "Read knowledge resources through the TypeScript knowledge router."},
				{Path: "/api/rag/file", Category: "knowledge", Description: "Ingest a file into RAG through the TypeScript RAG router."},
				{Path: "/api/rag/text", Category: "knowledge", Description: "Ingest text into RAG through the TypeScript RAG router."},
				{Path: "/api/directory", Category: "knowledge", Description: "List unified directory items through the TypeScript unified directory router."},
				{Path: "/api/directory/stats", Category: "knowledge", Description: "Read unified directory stats through the TypeScript unified directory router."},
				{Path: "/api/tool-chains/aliases", Category: "tools", Description: "List tool aliases through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/aliases/create", Category: "tools", Description: "Create a tool alias through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/aliases/remove", Category: "tools", Description: "Remove a tool alias through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/aliases/resolve", Category: "tools", Description: "Resolve a tool alias through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains", Category: "tools", Description: "List tool chains through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/get", Category: "tools", Description: "Read a tool chain through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/create", Category: "tools", Description: "Create a tool chain through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/execute", Category: "tools", Description: "Execute a tool chain through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/delete", Category: "tools", Description: "Delete a tool chain through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/lazy", Category: "tools", Description: "Read lazy tool states through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/lazy/register", Category: "tools", Description: "Register a lazy tool through the TypeScript tool chaining router."},
				{Path: "/api/tool-chains/lazy/mark-loaded", Category: "tools", Description: "Mark a lazy tool as loaded through the TypeScript tool chaining router."},
				{Path: "/api/browser-controls/scrape", Category: "browser", Description: "Scrape a page through the TypeScript browser controls router."},
				{Path: "/api/browser-controls/history/push", Category: "browser", Description: "Push browser history through the TypeScript browser controls router."},
				{Path: "/api/browser-controls/history/query", Category: "browser", Description: "Query browser history through the TypeScript browser controls router."},
				{Path: "/api/browser-controls/logs/push", Category: "browser", Description: "Push browser console logs through the TypeScript browser controls router."},
				{Path: "/api/browser-controls/logs/query", Category: "browser", Description: "Query browser console logs through the TypeScript browser controls router."},
				{Path: "/api/browser-controls/stats", Category: "browser", Description: "Read browser controls stats through the TypeScript browser controls router."},
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
				{Path: "/api/runtime/locks", Category: "runtime", Description: "Visibility into main HyperCode and sidecar lock files."},
				{Path: "/api/runtime/status", Category: "runtime", Description: "Top-level runtime summary across CLI, imports, providers, memory, and sessions."},
				{Path: "/api/runtime/imported-instructions", Category: "runtime", Description: "Read-only bridge to imported instructions generated by the main fork."},
				{Path: "/api/startup/status", Category: "runtime", Description: "Truthful Go-sidecar startup readiness snapshot, including upstream control-plane dependency state."},
				{Path: "/api/mesh/status", Category: "mesh", Description: "Native Go mesh node id plus current known peer count."},
				{Path: "/api/mesh/peers", Category: "mesh", Description: "Known mesh peers discovered from the Go mesh visibility layer."},
				{Path: "/api/mesh/capabilities", Category: "mesh", Description: "Combined capability map for the Go node plus upstream-discovered peers."},
				{Path: "/api/mesh/query-capabilities", Category: "mesh", Description: "Detailed capability lookup for a specific mesh node, with upstream fallback when available."},
				{Path: "/api/mesh/find-peer", Category: "mesh", Description: "Find the first known peer whose advertised capabilities match a required capability set."},
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

func (s *Server) handleImportedSessionList(w http.ResponseWriter, r *http.Request) {
	limit := strings.TrimSpace(r.URL.Query().Get("limit"))
	if limit == "" {
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "session.importedList", map[string]any{"limit": 50})
		return
	}
	parsedLimit, err := strconv.Atoi(limit)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid limit query parameter",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "session.importedList", map[string]any{"limit": parsedLimit})
}

func (s *Server) handleImportedSessionGet(w http.ResponseWriter, r *http.Request) {
	importedID := strings.TrimSpace(r.URL.Query().Get("id"))
	if importedID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing id query parameter",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "session.importedGet", map[string]any{"id": importedID})
}

func (s *Server) handleImportedSessionScan(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "session.importedScan")
}

func (s *Server) handleImportedSessionInstructionDocs(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "session.importedInstructionDocs", nil)
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

func (s *Server) handleMCPConfiguredServerGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing uuid query parameter",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcpServers.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleMCPConfiguredServerCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.create")
}

func (s *Server) handleMCPConfiguredServerUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.update")
}

func (s *Server) handleMCPConfiguredServerDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.delete")
}

func (s *Server) handleMCPConfiguredServerBulkImport(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.bulkImport")
}

func (s *Server) handleMCPConfiguredServerReloadMetadata(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.reloadMetadata")
}

func (s *Server) handleMCPConfiguredServerClearMetadataCache(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.clearMetadataCache")
}

func (s *Server) handleMCPRegistrySnapshot(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcpServers.registrySnapshot", nil)
}

func (s *Server) handleMCPSyncTargets(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcpServers.syncTargets", nil)
}

func (s *Server) handleMCPExportClientConfig(w http.ResponseWriter, r *http.Request) {
	client := strings.TrimSpace(r.URL.Query().Get("client"))
	if client == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing client query parameter",
		})
		return
	}
	payload := map[string]any{"client": client}
	if path := strings.TrimSpace(r.URL.Query().Get("path")); path != "" {
		payload["path"] = path
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcpServers.exportClientConfig", payload)
}

func (s *Server) handleMCPSyncClientConfig(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcpServers.syncClientConfig")
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

func (s *Server) handleMCPTraffic(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.traffic", nil)
}

func (s *Server) handleMCPToolSelectionTelemetry(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.getToolSelectionTelemetry", nil)
}

func (s *Server) handleMCPClearToolSelectionTelemetry(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "mcp.clearToolSelectionTelemetry", nil)
}

func (s *Server) handleMCPServerTest(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.runServerTest")
}

func (s *Server) handleMCPJsoncConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.getJsoncEditor", nil)
	case http.MethodPost:
		s.handleTRPCBridgeBodyCall(w, r, "mcp.saveJsoncEditor")
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

func (s *Server) handleMCPWorkingSetEvictions(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "mcp.getWorkingSetEvictionHistory", nil)
}

func (s *Server) handleMCPClearWorkingSetEvictions(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "mcp.clearWorkingSetEvictionHistory", nil)
}

func (s *Server) handleMCPLoadTool(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.loadTool")
}

func (s *Server) handleMCPUnloadTool(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "mcp.unloadTool")
}

func (s *Server) handleMemorySearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing query parameter",
		})
		return
	}
	payload := map[string]any{"query": query}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.query", payload)
}

func (s *Server) handleMemoryContexts(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.listContexts", nil)
}

func (s *Server) handleMemoryContextGet(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing id query parameter",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.getContext", map[string]any{"id": id})
}

func (s *Server) handleMemoryContextDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "memory.deleteContext")
}

func (s *Server) handleMemoryAgentStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.getAgentStats", nil)
}

func (s *Server) handleMemoryAgentSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing query parameter",
		})
		return
	}
	payload := map[string]any{"query": query}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if memoryType := strings.TrimSpace(r.URL.Query().Get("type")); memoryType != "" {
		payload["type"] = memoryType
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.searchAgentMemory", payload)
}

func (s *Server) handleMemorySessionBootstrap(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if activeGoal := strings.TrimSpace(r.URL.Query().Get("activeGoal")); activeGoal != "" {
		payload["activeGoal"] = activeGoal
	}
	if lastObjective := strings.TrimSpace(r.URL.Query().Get("lastObjective")); lastObjective != "" {
		payload["lastObjective"] = lastObjective
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.getSessionBootstrap", payload)
}

func (s *Server) handleMemoryToolContext(w http.ResponseWriter, r *http.Request) {
	toolName := strings.TrimSpace(r.URL.Query().Get("toolName"))
	if toolName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing toolName query parameter",
		})
		return
	}
	payload := map[string]any{"toolName": toolName}
	if activeGoal := strings.TrimSpace(r.URL.Query().Get("activeGoal")); activeGoal != "" {
		payload["activeGoal"] = activeGoal
	}
	if lastObjective := strings.TrimSpace(r.URL.Query().Get("lastObjective")); lastObjective != "" {
		payload["lastObjective"] = lastObjective
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.getToolContext", payload)
}

func (s *Server) handleMemoryRecentSessionSummaries(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{"limit": 10}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.getRecentSessionSummaries", payload)
}

func (s *Server) handleMemorySearchSessionSummaries(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing query parameter",
		})
		return
	}
	payload := map[string]any{"query": query, "limit": 10}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.searchSessionSummaries", payload)
}

func (s *Server) handleMemoryInterchangeFormats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.listInterchangeFormats", nil)
}

func (s *Server) handleMemoryExport(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{"userId": "default", "format": "json"}
	if userID := strings.TrimSpace(r.URL.Query().Get("userId")); userID != "" {
		payload["userId"] = userID
	}
	if format := strings.TrimSpace(r.URL.Query().Get("format")); format != "" {
		payload["format"] = format
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "memory.exportMemories", payload)
}

func (s *Server) handleMemoryImport(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "memory.importMemories")
}

func (s *Server) handleMemoryConvert(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "memory.convertMemories")
}

func (s *Server) handleAgentMemorySearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing query parameter",
		})
		return
	}
	payload := map[string]any{"query": query}
	if namespace := strings.TrimSpace(r.URL.Query().Get("namespace")); namespace != "" {
		payload["namespace"] = namespace
	}
	if memoryType := strings.TrimSpace(r.URL.Query().Get("type")); memoryType != "" {
		payload["type"] = memoryType
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "agentMemory.search", payload)
}

func (s *Server) handleAgentMemoryAdd(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "agentMemory.add")
}

func (s *Server) handleAgentMemoryRecent(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if memoryType := strings.TrimSpace(r.URL.Query().Get("type")); memoryType != "" {
		payload["type"] = memoryType
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "agentMemory.getRecent", payload)
}

func (s *Server) handleAgentMemoryByType(w http.ResponseWriter, r *http.Request) {
	memoryType := strings.TrimSpace(r.URL.Query().Get("type"))
	if memoryType == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing type query parameter",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "agentMemory.getByType", map[string]any{"type": memoryType})
}

func (s *Server) handleAgentMemoryByNamespace(w http.ResponseWriter, r *http.Request) {
	namespace := strings.TrimSpace(r.URL.Query().Get("namespace"))
	if namespace == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "missing namespace query parameter",
		})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "agentMemory.getByNamespace", map[string]any{"namespace": namespace})
}

func (s *Server) handleAgentMemoryDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "agentMemory.delete")
}

func (s *Server) handleAgentMemoryClearSession(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "agentMemory.clearSession", nil)
}

func (s *Server) handleAgentMemoryExport(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "agentMemory.export", nil)
}

func (s *Server) handleAgentMemoryHandoff(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "agentMemory.handoff")
}

func (s *Server) handleAgentMemoryPickup(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "agentMemory.pickup")
}

func (s *Server) handleAgentMemoryStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "agentMemory.stats", nil)
}

func (s *Server) handleGraphGet(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "graph.get", nil)
}

func (s *Server) handleGraphRebuild(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "graph.rebuild", nil)
}

func (s *Server) handleGraphConsumers(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	if filePath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing filePath query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "graph.getConsumers", map[string]any{"filePath": filePath})
}

func (s *Server) handleGraphDependencies(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	if filePath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing filePath query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "graph.getDependencies", map[string]any{"filePath": filePath})
}

func (s *Server) handleGraphSymbols(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "graph.getSymbolsGraph", nil)
}

func (s *Server) handleContextList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "borgContext.list", nil)
}

func (s *Server) handleContextAdd(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "borgContext.add")
}

func (s *Server) handleContextRemove(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "borgContext.remove")
}

func (s *Server) handleContextClear(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "borgContext.clear", nil)
}

func (s *Server) handleContextPrompt(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "borgContext.getPrompt", nil)
}

func (s *Server) handleGitModules(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "git.getModules", nil)
}

func (s *Server) handleGitLog(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "git.getLog", payload)
}

func (s *Server) handleGitStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "git.getStatus", nil)
}

func (s *Server) handleGitRevert(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "git.revert")
}

func (s *Server) handleTestsStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tests.status", nil)
}

func (s *Server) handleTestsStart(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "tests.start", nil)
}

func (s *Server) handleTestsStop(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "tests.stop", nil)
}

func (s *Server) handleTestsRun(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "tests.run")
}

func (s *Server) handleTestsResults(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tests.results", nil)
}

func (s *Server) handleMetricsStats(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if windowMs := strings.TrimSpace(r.URL.Query().Get("windowMs")); windowMs != "" {
		if parsed, err := strconv.Atoi(windowMs); err == nil {
			payload["windowMs"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "metrics.getStats", payload)
}

func (s *Server) handleMetricsTrack(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "metrics.track")
}

func (s *Server) handleMetricsSystemSnapshot(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "metrics.systemSnapshot", nil)
}

func (s *Server) handleMetricsTimeline(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if windowMs := strings.TrimSpace(r.URL.Query().Get("windowMs")); windowMs != "" {
		if parsed, err := strconv.Atoi(windowMs); err == nil {
			payload["windowMs"] = parsed
		}
	}
	if buckets := strings.TrimSpace(r.URL.Query().Get("buckets")); buckets != "" {
		if parsed, err := strconv.Atoi(buckets); err == nil {
			payload["buckets"] = parsed
		}
	}
	if metricType := strings.TrimSpace(r.URL.Query().Get("metricType")); metricType != "" {
		payload["metricType"] = metricType
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "metrics.getTimeline", payload)
}

func (s *Server) handleMetricsProviderBreakdown(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "metrics.getProviderBreakdown", nil)
}

func (s *Server) handleMetricsMonitoring(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "metrics.toggleMonitoring")
}

func (s *Server) handleMetricsRoutingHistory(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "metrics.getRoutingHistory", payload)
}

func (s *Server) handleLogsList(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId")); sessionID != "" {
		payload["sessionId"] = sessionID
	}
	if serverName := strings.TrimSpace(r.URL.Query().Get("serverName")); serverName != "" {
		payload["serverName"] = serverName
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "logs.list", payload)
}

func (s *Server) handleLogsSummary(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "logs.summary", payload)
}

func (s *Server) handleLogsClear(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "logs.clear", nil)
}

func (s *Server) handleServerHealthCheck(w http.ResponseWriter, r *http.Request) {
	serverUUID := strings.TrimSpace(r.URL.Query().Get("serverUuid"))
	if serverUUID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing serverUuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "serverHealth.check", map[string]any{"serverUuid": serverUUID})
}

func (s *Server) handleServerHealthReset(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "serverHealth.reset")
}

func (s *Server) handleSettingsGet(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "settings.get", nil)
}

func (s *Server) handleSettingsUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "settings.update")
}

func (s *Server) handleSettingsProviders(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "settings.getProviders", nil)
}

func (s *Server) handleSettingsTestConnection(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "settings.testConnection")
}

func (s *Server) handleSettingsEnvironment(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "settings.getEnvironment", nil)
}

func (s *Server) handleSettingsMCPServers(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "settings.getMcpServers", nil)
}

func (s *Server) handleSettingsProviderKey(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "settings.updateProviderKey")
}

func (s *Server) handleToolsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.list", nil)
}

func (s *Server) handleToolsByServer(w http.ResponseWriter, r *http.Request) {
	serverID := strings.TrimSpace(r.URL.Query().Get("mcpServerUuid"))
	if serverID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing mcpServerUuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.listByServer", map[string]any{"mcpServerUuid": serverID})
}

func (s *Server) handleToolsSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing query parameter"})
		return
	}
	payload := map[string]any{"query": query}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.search", payload)
}

func (s *Server) handleToolsDetectCLIHarnesses(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.detectCliHarnesses", nil)
}

func (s *Server) handleToolsDetectExecutionEnvironment(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.detectExecutionEnvironment", nil)
}

func (s *Server) handleToolsDetectInstallSurfaces(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.detectInstallSurfaces", nil)
}

func (s *Server) handleToolsGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "tools.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleToolsCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "tools.create")
}

func (s *Server) handleToolsUpsertBatch(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "tools.upsertBatch")
}

func (s *Server) handleToolsDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "tools.delete")
}

func (s *Server) handleToolsAlwaysOn(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "tools.setAlwaysOn")
}

func (s *Server) handleToolSetsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolSets.list", nil)
}

func (s *Server) handleToolSetsGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolSets.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleToolSetsCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolSets.create")
}

func (s *Server) handleToolSetsUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolSets.update")
}

func (s *Server) handleToolSetsDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolSets.delete")
}

func (s *Server) handleProjectContext(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "project.getContext", nil)
}

func (s *Server) handleProjectContextUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "project.updateContext")
}

func (s *Server) handleProjectHandoffs(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "project.getHandoffs", nil)
}

func (s *Server) handleShellLog(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "shell.logCommand")
}

func (s *Server) handleShellQueryHistory(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing query parameter"})
		return
	}
	payload := map[string]any{"query": query}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "shell.queryHistory", payload)
}

func (s *Server) handleShellSystemHistory(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "shell.getSystemHistory", payload)
}

func (s *Server) handleAgentRunTool(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "agent.runTool")
}

func (s *Server) handleAgentChat(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "agent.chat")
}

func (s *Server) handleCommandsExecute(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "commands.execute")
}

func (s *Server) handleCommandsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "commands.list", nil)
}

func (s *Server) handleSkillsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "skills.list", nil)
}

func (s *Server) handleSkillsRead(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing name query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "skills.read", map[string]any{"name": name})
}

func (s *Server) handleSkillsCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "skills.create")
}

func (s *Server) handleSkillsSave(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "skills.save")
}

func (s *Server) handleSkillsAssimilate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "skills.assimilate")
}

func (s *Server) handleWorkflowList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.list", nil)
}

func (s *Server) handleWorkflowGraph(w http.ResponseWriter, r *http.Request) {
	workflowID := strings.TrimSpace(r.URL.Query().Get("workflowId"))
	if workflowID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing workflowId query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.getGraph", map[string]any{"workflowId": workflowID})
}

func (s *Server) handleWorkflowStart(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "workflow.start")
}

func (s *Server) handleWorkflowExecutions(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.listExecutions", nil)
}

func (s *Server) handleWorkflowExecution(w http.ResponseWriter, r *http.Request) {
	executionID := strings.TrimSpace(r.URL.Query().Get("executionId"))
	if executionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing executionId query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.getExecution", map[string]any{"executionId": executionID})
}

func (s *Server) handleWorkflowHistory(w http.ResponseWriter, r *http.Request) {
	executionID := strings.TrimSpace(r.URL.Query().Get("executionId"))
	if executionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing executionId query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.getHistory", map[string]any{"executionId": executionID})
}

func (s *Server) handleWorkflowResume(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "workflow.resume")
}

func (s *Server) handleWorkflowPause(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "workflow.pause")
}

func (s *Server) handleWorkflowApprove(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "workflow.approve")
}

func (s *Server) handleWorkflowReject(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "workflow.reject")
}

func (s *Server) handleWorkflowCanvases(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.listCanvases", nil)
}

func (s *Server) handleWorkflowCanvas(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "workflow.loadCanvas", map[string]any{"id": id})
}

func (s *Server) handleWorkflowCanvasSave(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "workflow.saveCanvas")
}

func (s *Server) handleSymbolsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "symbols.list", nil)
}

func (s *Server) handleSymbolsFind(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing query query parameter"})
		return
	}
	payload := map[string]any{"query": query}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "symbols.find", payload)
}

func (s *Server) handleSymbolsPin(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "symbols.pin")
}

func (s *Server) handleSymbolsUnpin(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "symbols.unpin")
}

func (s *Server) handleSymbolsUpdatePriority(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "symbols.updatePriority")
}

func (s *Server) handleSymbolsAddNotes(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "symbols.addNotes")
}

func (s *Server) handleSymbolsClear(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "symbols.clear")
}

func (s *Server) handleSymbolsForFile(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	if filePath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing filePath query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "symbols.forFile", map[string]any{"filePath": filePath})
}

func (s *Server) handleLSPFindSymbol(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	symbolName := strings.TrimSpace(r.URL.Query().Get("symbolName"))
	if filePath == "" || symbolName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing filePath or symbolName query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "lsp.findSymbol", map[string]any{"filePath": filePath, "symbolName": symbolName})
}

func (s *Server) handleLSPFindReferences(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	line, lineErr := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("line")))
	character, charErr := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("character")))
	if filePath == "" || lineErr != nil || charErr != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing or invalid filePath, line, or character query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "lsp.findReferences", map[string]any{"filePath": filePath, "line": line, "character": character})
}

func (s *Server) handleLSPGetSymbols(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	if filePath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing filePath query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "lsp.getSymbols", map[string]any{"filePath": filePath})
}

func (s *Server) handleLSPSearchSymbols(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing query query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "lsp.searchSymbols", map[string]any{"query": query})
}

func (s *Server) handleLSPIndexProject(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "lsp.indexProject")
}

func (s *Server) handleAPIKeysList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "apiKeys.list", nil)
}

func (s *Server) handleAPIKeysGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "apiKeys.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleAPIKeysCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "apiKeys.create")
}

func (s *Server) handleAPIKeysUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "apiKeys.update")
}

func (s *Server) handleAPIKeysDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "apiKeys.delete")
}

func (s *Server) handleAPIKeysValidate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "apiKeys.validate")
}

func (s *Server) handleAuditList(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "audit.list", payload)
}

func (s *Server) handleAuditQuery(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if level := strings.TrimSpace(r.URL.Query().Get("level")); level != "" {
		payload["level"] = level
	}
	if agentID := strings.TrimSpace(r.URL.Query().Get("agentId")); agentID != "" {
		payload["agentId"] = agentID
	}
	if action := strings.TrimSpace(r.URL.Query().Get("action")); action != "" {
		payload["action"] = action
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "audit.log", payload)
}

func (s *Server) handleSavedScriptsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "savedScripts.list", nil)
}

func (s *Server) handleSavedScriptsGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "savedScripts.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleSavedScriptsCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "savedScripts.create")
}

func (s *Server) handleSavedScriptsUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "savedScripts.update")
}

func (s *Server) handleSavedScriptsDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "savedScripts.delete")
}

func (s *Server) handleSavedScriptsExecute(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "savedScripts.execute")
}

func (s *Server) handleLinksBacklogList(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if offset := strings.TrimSpace(r.URL.Query().Get("offset")); offset != "" {
		if parsed, err := strconv.Atoi(offset); err == nil {
			payload["offset"] = parsed
		}
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		payload["search"] = search
	}
	if source := strings.TrimSpace(r.URL.Query().Get("source")); source != "" {
		payload["source"] = source
	}
	if status := strings.TrimSpace(r.URL.Query().Get("research_status")); status != "" {
		payload["research_status"] = status
	}
	if clusterID := strings.TrimSpace(r.URL.Query().Get("cluster_id")); clusterID != "" {
		payload["cluster_id"] = clusterID
	}
	if showDuplicates := strings.TrimSpace(r.URL.Query().Get("show_duplicates")); showDuplicates != "" {
		payload["show_duplicates"] = strings.EqualFold(showDuplicates, "true") || showDuplicates == "1"
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "linksBacklog.list", payload)
}

func (s *Server) handleLinksBacklogStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "linksBacklog.stats", nil)
}

func (s *Server) handleLinksBacklogGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "linksBacklog.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleLinksBacklogSync(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "linksBacklog.syncFromBobbyBookmarks")
}

func (s *Server) handleInfrastructureStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "infrastructure.getInfrastructureStatus", nil)
}

func (s *Server) handleInfrastructureDoctor(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "infrastructure.runDoctor")
}

func (s *Server) handleInfrastructureApply(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "infrastructure.applyConfigurations")
}

func (s *Server) handleExpertResearch(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "expert.research")
}

func (s *Server) handleExpertCode(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "expert.code")
}

func (s *Server) handleExpertStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "expert.getStatus", nil)
}

func (s *Server) handlePoliciesList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "policies.list", nil)
}

func (s *Server) handlePoliciesGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "policies.get", map[string]any{"uuid": uuid})
}

func (s *Server) handlePoliciesCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "policies.create")
}

func (s *Server) handlePoliciesUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "policies.update")
}

func (s *Server) handlePoliciesDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "policies.delete")
}

func (s *Server) handleSecretsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "secrets.list", nil)
}

func (s *Server) handleSecretsSet(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "secrets.set")
}

func (s *Server) handleSecretsDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "secrets.delete")
}

func (s *Server) handleMarketplaceList(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if filter := strings.TrimSpace(r.URL.Query().Get("filter")); filter != "" {
		payload["filter"] = filter
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "marketplace.list", payload)
}

func (s *Server) handleMarketplaceInstall(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "marketplace.install")
}

func (s *Server) handleMarketplacePublish(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "marketplace.publish")
}

func (s *Server) handleCatalogList(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if offset := strings.TrimSpace(r.URL.Query().Get("offset")); offset != "" {
		if parsed, err := strconv.Atoi(offset); err == nil {
			payload["offset"] = parsed
		}
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		payload["search"] = search
	}
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
		payload["status"] = status
	}
	if transport := strings.TrimSpace(r.URL.Query().Get("transport")); transport != "" {
		payload["transport"] = transport
	}
	if installMethod := strings.TrimSpace(r.URL.Query().Get("install_method")); installMethod != "" {
		payload["install_method"] = installMethod
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "catalog.list", payload)
}

func (s *Server) handleCatalogGet(w http.ResponseWriter, r *http.Request) {
	uuid := strings.TrimSpace(r.URL.Query().Get("uuid"))
	if uuid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "catalog.get", map[string]any{"uuid": uuid})
}

func (s *Server) handleCatalogRuns(w http.ResponseWriter, r *http.Request) {
	serverUUID := strings.TrimSpace(r.URL.Query().Get("server_uuid"))
	if serverUUID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing server_uuid query parameter"})
		return
	}
	payload := map[string]any{"server_uuid": serverUUID}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "catalog.listRuns", payload)
}

func (s *Server) handleCatalogIngest(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "catalog.triggerIngestion")
}

func (s *Server) handleCatalogValidate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "catalog.triggerValidation")
}

func (s *Server) handleCatalogInstall(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "catalog.installFromRecipe")
}

func (s *Server) handleCatalogValidateBatch(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "catalog.triggerBatchValidation")
}

func (s *Server) handleCatalogStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "catalog.stats", nil)
}

func (s *Server) handleCatalogLinkedServers(w http.ResponseWriter, r *http.Request) {
	publishedServerUUID := strings.TrimSpace(r.URL.Query().Get("published_server_uuid"))
	if publishedServerUUID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing published_server_uuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "catalog.listLinkedServers", map[string]any{"published_server_uuid": publishedServerUUID})
}

func (s *Server) handleOAuthClientCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "oauth.clients.create")
}

func (s *Server) handleOAuthClientGet(w http.ResponseWriter, r *http.Request) {
	clientID := strings.TrimSpace(r.URL.Query().Get("clientId"))
	if clientID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing clientId query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "oauth.clients.get", map[string]any{"clientId": clientID})
}

func (s *Server) handleOAuthSessionUpsert(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "oauth.sessions.upsert")
}

func (s *Server) handleOAuthSessionGetByServer(w http.ResponseWriter, r *http.Request) {
	serverUUID := strings.TrimSpace(r.URL.Query().Get("mcpServerUuid"))
	if serverUUID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing mcpServerUuid query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "oauth.sessions.getByServer", map[string]any{"mcpServerUuid": serverUUID})
}

func (s *Server) handleOAuthExchange(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "oauth.exchange")
}

func (s *Server) handleResearchConduct(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "research.conduct")
}

func (s *Server) handleResearchIngest(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "research.ingest")
}

func (s *Server) handleResearchRecursive(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "research.recursiveResearch")
}

func (s *Server) handleResearchQueries(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.URL.Query().Get("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing topic query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "research.generateQueries", map[string]any{"topic": topic})
}

func (s *Server) handleResearchQueue(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "research.ingestionQueue", nil)
}

func (s *Server) handleResearchRetryFailed(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "research.retryFailed")
}

func (s *Server) handleResearchRetryAllFailed(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "research.retryAllFailed")
}

func (s *Server) handleResearchEnqueuePending(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "research.enqueuePending")
}

func (s *Server) handlePulseEvents(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if afterTimestamp := strings.TrimSpace(r.URL.Query().Get("afterTimestamp")); afterTimestamp != "" {
		if parsed, err := strconv.ParseInt(afterTimestamp, 10, 64); err == nil {
			payload["afterTimestamp"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "pulse.getLatestEvents", payload)
}

func (s *Server) handlePulseStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "pulse.getSystemStatus", nil)
}

func (s *Server) handlePulseProviders(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "pulse.checkLocalProviders", nil)
}

func (s *Server) handleSessionExport(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "sessionExport.export")
}

func (s *Server) handleSessionImport(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "sessionExport.import")
}

func (s *Server) handleSessionExportDetectFormat(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "sessionExport.detectFormat")
}

func (s *Server) handleSessionExportKnownFormats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "sessionExport.knownFormats", nil)
}

func (s *Server) handleSessionExportHistory(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "sessionExport.history", nil)
}

func (s *Server) handleBrowserExtensionSaveMemory(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browserExtension.saveMemory")
}

func (s *Server) handleBrowserExtensionParseDOM(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browserExtension.parseDom")
}

func (s *Server) handleBrowserExtensionListMemories(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		payload["search"] = search
	}
	if tag := strings.TrimSpace(r.URL.Query().Get("tag")); tag != "" {
		payload["tag"] = tag
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if offset := strings.TrimSpace(r.URL.Query().Get("offset")); offset != "" {
		if parsed, err := strconv.Atoi(offset); err == nil {
			payload["offset"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "browserExtension.listMemories", payload)
}

func (s *Server) handleBrowserExtensionDeleteMemory(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browserExtension.deleteMemory")
}

func (s *Server) handleBrowserExtensionStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "browserExtension.stats", nil)
}

func (s *Server) handleOpenWebUIStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "openWebUI.getStatus", nil)
}

func (s *Server) handleOpenWebUIEmbedURL(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "openWebUI.getEmbedUrl", nil)
}

func (s *Server) handleCodeModeStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "codeMode.getStatus", nil)
}

func (s *Server) handleCodeModeEnable(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "codeMode.enable")
}

func (s *Server) handleCodeModeDisable(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "codeMode.disable")
}

func (s *Server) handleCodeModeExecute(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "codeMode.execute")
}

func (s *Server) handleSubmoduleList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "submodule.list", nil)
}

func (s *Server) handleSubmoduleUpdateAll(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "submodule.updateAll")
}

func (s *Server) handleSubmoduleInstallDependencies(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "submodule.installDependencies")
}

func (s *Server) handleSubmoduleBuild(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "submodule.build")
}

func (s *Server) handleSubmoduleEnable(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "submodule.enable")
}

func (s *Server) handleSubmoduleCapabilities(w http.ResponseWriter, r *http.Request) {
	pathValue := strings.TrimSpace(r.URL.Query().Get("path"))
	if pathValue == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing path query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "submodule.detectCapabilities", map[string]any{"path": pathValue})
}

func (s *Server) handleSuggestionsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "suggestions.list", nil)
}

func (s *Server) handleSuggestionsResolve(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "suggestions.resolve")
}

func (s *Server) handleSuggestionsClear(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "suggestions.clearAll")
}

func (s *Server) handlePlanMode(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "plan.getMode", nil)
		return
	}
	s.handleTRPCBridgeBodyCall(w, r, "plan.setMode")
}

func (s *Server) handlePlanDiffs(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "plan.getDiffs", nil)
}

func (s *Server) handlePlanApproveDiff(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "plan.approveDiff")
}

func (s *Server) handlePlanRejectDiff(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "plan.rejectDiff")
}

func (s *Server) handlePlanApplyAll(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "plan.applyAll")
}

func (s *Server) handlePlanSummary(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "plan.getSummary", nil)
}

func (s *Server) handlePlanCheckpoints(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "plan.getCheckpoints", nil)
}

func (s *Server) handlePlanCreateCheckpoint(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "plan.createCheckpoint")
}

func (s *Server) handlePlanRollback(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "plan.rollback")
}

func (s *Server) handlePlanClear(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "plan.clear")
}

func (s *Server) handleKnowledgeGraph(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if query := strings.TrimSpace(r.URL.Query().Get("query")); query != "" {
		payload["query"] = query
	}
	if depth := strings.TrimSpace(r.URL.Query().Get("depth")); depth != "" {
		if parsed, err := strconv.Atoi(depth); err == nil {
			payload["depth"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "knowledge.getGraph", payload)
}

func (s *Server) handleKnowledgeStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "knowledge.getStats", nil)
}

func (s *Server) handleKnowledgeIngest(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "knowledge.ingest")
}

func (s *Server) handleKnowledgeResources(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "knowledge.getResources", nil)
}

func (s *Server) handleRAGIngestFile(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "rag.ingestFile")
}

func (s *Server) handleRAGIngestText(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "rag.ingestText")
}

func (s *Server) handleUnifiedDirectoryList(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if offset := strings.TrimSpace(r.URL.Query().Get("offset")); offset != "" {
		if parsed, err := strconv.Atoi(offset); err == nil {
			payload["offset"] = parsed
		}
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		payload["search"] = search
	}
	if source := strings.TrimSpace(r.URL.Query().Get("source")); source != "" {
		payload["source"] = source
	}
	if showDuplicates := strings.TrimSpace(r.URL.Query().Get("show_duplicates")); showDuplicates != "" {
		payload["show_duplicates"] = strings.EqualFold(showDuplicates, "true") || showDuplicates == "1"
	}
	if duplicatesOnly := strings.TrimSpace(r.URL.Query().Get("duplicates_only")); duplicatesOnly != "" {
		payload["duplicates_only"] = strings.EqualFold(duplicatesOnly, "true") || duplicatesOnly == "1"
	}
	if researchStatus := strings.TrimSpace(r.URL.Query().Get("research_status")); researchStatus != "" {
		payload["research_status"] = researchStatus
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "unifiedDirectory.list", payload)
}

func (s *Server) handleUnifiedDirectoryStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "unifiedDirectory.stats", nil)
}

func (s *Server) handleToolChainAliases(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolChaining.listAliases", nil)
}

func (s *Server) handleToolChainCreateAlias(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.createAlias")
}

func (s *Server) handleToolChainRemoveAlias(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.removeAlias")
}

func (s *Server) handleToolChainResolveAlias(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing name query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolChaining.resolveAlias", map[string]any{"name": name})
}

func (s *Server) handleToolChainsList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolChaining.listChains", nil)
}

func (s *Server) handleToolChainsGet(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolChaining.getChain", map[string]any{"id": id})
}

func (s *Server) handleToolChainsCreate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.createChain")
}

func (s *Server) handleToolChainsExecute(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.executeChain")
}

func (s *Server) handleToolChainsDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.deleteChain")
}

func (s *Server) handleToolChainsLazyStates(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "toolChaining.lazyStates", nil)
}

func (s *Server) handleToolChainsRegisterLazy(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.registerLazy")
}

func (s *Server) handleToolChainsMarkLoaded(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "toolChaining.markLoaded")
}

func (s *Server) handleBrowserControlsScrape(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browserControls.scrape")
}

func (s *Server) handleBrowserControlsPushHistory(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browserControls.pushHistory")
}

func (s *Server) handleBrowserControlsQueryHistory(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if query := strings.TrimSpace(r.URL.Query().Get("query")); query != "" {
		payload["query"] = query
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if since := strings.TrimSpace(r.URL.Query().Get("since")); since != "" {
		if parsed, err := strconv.ParseInt(since, 10, 64); err == nil {
			payload["since"] = parsed
		}
	}
	if domain := strings.TrimSpace(r.URL.Query().Get("domain")); domain != "" {
		payload["domain"] = domain
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "browserControls.queryHistory", payload)
}

func (s *Server) handleBrowserControlsPushLogs(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browserControls.pushConsoleLogs")
}

func (s *Server) handleBrowserControlsQueryLogs(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if level := strings.TrimSpace(r.URL.Query().Get("level")); level != "" {
		payload["level"] = level
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		payload["search"] = search
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "browserControls.queryConsoleLogs", payload)
}

func (s *Server) handleBrowserControlsStats(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "browserControls.stats", nil)
}

func (s *Server) handleSessionBridgeBodyCall(w http.ResponseWriter, r *http.Request, procedure string) {
	s.handleTRPCBridgeBodyCall(w, r, procedure)
}

func (s *Server) handleSessionBridgeCall(w http.ResponseWriter, r *http.Request, method string, procedure string, payload any) {
	s.handleTRPCBridgeCall(w, r, method, procedure, payload)
}

func (s *Server) handleTRPCBridgeBodyCall(w http.ResponseWriter, r *http.Request, procedure string) {
	var payload any
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
