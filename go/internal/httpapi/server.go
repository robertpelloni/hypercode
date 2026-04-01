package httpapi

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/borghq/hypercode-go/internal/buildinfo"
	"github.com/borghq/hypercode-go/internal/config"
	"github.com/borghq/hypercode-go/internal/controlplane"
	"github.com/borghq/hypercode-go/internal/harnesses"
	"github.com/borghq/hypercode-go/internal/interop"
	"github.com/borghq/hypercode-go/internal/memorystore"
	"github.com/borghq/hypercode-go/internal/mesh"
	"github.com/borghq/hypercode-go/internal/providers"
	"github.com/borghq/hypercode-go/internal/sessionimport"
)

type Server struct {
	cfg            config.Config
	detector       controlplane.ToolProvider
	mesh           *mesh.Service
	startedAt      time.Time
	mux            *http.ServeMux
	lifecycleModes map[string]any
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

type SkillSummary struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Folder string `json:"folder"`
}

type ImportedInstructionsSummary struct {
	Path       string `json:"path"`
	Available  bool   `json:"available"`
	ModifiedAt string `json:"modifiedAt,omitempty"`
	Size       int64  `json:"size,omitempty"`
}

type ImportedSessionMemory struct {
	ID                string         `json:"id"`
	ImportedSessionID string         `json:"importedSessionId"`
	Kind              string         `json:"kind"`
	Content           string         `json:"content"`
	Tags              []string       `json:"tags"`
	Source            string         `json:"source"`
	Metadata          map[string]any `json:"metadata"`
	CreatedAt         int64          `json:"createdAt"`
}

type ImportedSessionRecord struct {
	ID                string                  `json:"id"`
	SourceTool        string                  `json:"sourceTool"`
	SourcePath        string                  `json:"sourcePath"`
	ExternalSessionID *string                 `json:"externalSessionId"`
	Title             *string                 `json:"title"`
	SessionFormat     string                  `json:"sessionFormat"`
	Transcript        string                  `json:"transcript"`
	Excerpt           *string                 `json:"excerpt"`
	WorkingDirectory  *string                 `json:"workingDirectory"`
	TranscriptHash    string                  `json:"transcriptHash"`
	NormalizedSession map[string]any          `json:"normalizedSession"`
	Metadata          map[string]any          `json:"metadata"`
	DiscoveredAt      int64                   `json:"discoveredAt"`
	ImportedAt        int64                   `json:"importedAt"`
	LastModifiedAt    *int64                  `json:"lastModifiedAt"`
	CreatedAt         int64                   `json:"createdAt"`
	UpdatedAt         int64                   `json:"updatedAt"`
	ParsedMemories    []ImportedSessionMemory `json:"parsedMemories"`
}

type ImportedSessionMaintenanceStats struct {
	TotalSessions                int `json:"totalSessions"`
	InlineTranscriptCount        int `json:"inlineTranscriptCount"`
	ArchivedTranscriptCount      int `json:"archivedTranscriptCount"`
	MissingRetentionSummaryCount int `json:"missingRetentionSummaryCount"`
}

type importedSessionArchiveSidecar struct {
	SessionID               string         `json:"sessionId"`
	SourceTool              string         `json:"sourceTool"`
	SourcePath              string         `json:"sourcePath"`
	SessionFormat           string         `json:"sessionFormat"`
	TranscriptHash          string         `json:"transcriptHash"`
	Title                   *string        `json:"title"`
	WorkingDirectory        *string        `json:"workingDirectory"`
	TranscriptLength        int            `json:"transcriptLength"`
	Excerpt                 *string        `json:"excerpt"`
	DurableMemoryCount      int            `json:"durableMemoryCount"`
	DurableInstructionCount int            `json:"durableInstructionCount"`
	MemoryTags              []string       `json:"memoryTags"`
	RetentionSummary        map[string]any `json:"retentionSummary"`
	ArchivedAt              int64          `json:"archivedAt"`
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
		lifecycleModes: map[string]any{
			"lazySessionMode":        false,
			"singleActiveServerMode": false,
		},
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
	s.mux.HandleFunc("/api/config/list", s.handleConfigList)
	s.mux.HandleFunc("/api/config/get", s.handleConfigGet)
	s.mux.HandleFunc("/api/config/upsert", s.handleConfigUpsert)
	s.mux.HandleFunc("/api/config/delete", s.handleConfigDelete)
	s.mux.HandleFunc("/api/config/update", s.handleConfigUpdate)
	s.mux.HandleFunc("/api/config/mcp-timeout", s.handleConfigGetMCPTimeout)
	s.mux.HandleFunc("/api/config/mcp-timeout/set", s.handleConfigSetMCPTimeout)
	s.mux.HandleFunc("/api/config/mcp-max-attempts", s.handleConfigGetMCPMaxAttempts)
	s.mux.HandleFunc("/api/config/mcp-max-attempts/set", s.handleConfigSetMCPMaxAttempts)
	s.mux.HandleFunc("/api/config/mcp-max-total-timeout", s.handleConfigGetMCPMaxTotalTimeout)
	s.mux.HandleFunc("/api/config/mcp-max-total-timeout/set", s.handleConfigSetMCPMaxTotalTimeout)
	s.mux.HandleFunc("/api/config/mcp-reset-timeout-on-progress", s.handleConfigGetMCPResetTimeoutOnProgress)
	s.mux.HandleFunc("/api/config/mcp-reset-timeout-on-progress/set", s.handleConfigSetMCPResetTimeoutOnProgress)
	s.mux.HandleFunc("/api/config/session-lifetime", s.handleConfigGetSessionLifetime)
	s.mux.HandleFunc("/api/config/session-lifetime/set", s.handleConfigSetSessionLifetime)
	s.mux.HandleFunc("/api/config/signup-disabled", s.handleConfigGetSignupDisabled)
	s.mux.HandleFunc("/api/config/signup-disabled/set", s.handleConfigSetSignupDisabled)
	s.mux.HandleFunc("/api/config/sso-signup-disabled", s.handleConfigGetSSOSignupDisabled)
	s.mux.HandleFunc("/api/config/sso-signup-disabled/set", s.handleConfigSetSSOSignupDisabled)
	s.mux.HandleFunc("/api/config/basic-auth-disabled", s.handleConfigGetBasicAuthDisabled)
	s.mux.HandleFunc("/api/config/basic-auth-disabled/set", s.handleConfigSetBasicAuthDisabled)
	s.mux.HandleFunc("/api/config/auth-providers", s.handleConfigGetAuthProviders)
	s.mux.HandleFunc("/api/config/always-visible-tools", s.handleConfigGetAlwaysVisibleTools)
	s.mux.HandleFunc("/api/config/always-visible-tools/set", s.handleConfigSetAlwaysVisibleTools)
	s.mux.HandleFunc("/api/providers/status", s.handleProviderStatus)
	s.mux.HandleFunc("/api/providers/catalog", s.handleProviderCatalog)
	s.mux.HandleFunc("/api/providers/summary", s.handleProviderSummary)
	s.mux.HandleFunc("/api/providers/routing-summary", s.handleRoutingSummary)
	s.mux.HandleFunc("/api/sessions", s.handleSessions)
	s.mux.HandleFunc("/api/sessions/summary", s.handleSessionSummary)
	s.mux.HandleFunc("/api/sessions/context", s.handleSessionContext)
	s.mux.HandleFunc("/api/sessions/supervisor/catalog", s.handleSupervisorSessionCatalog)
	s.mux.HandleFunc("/api/sessions/supervisor/list", s.handleSupervisorSessionList)
	s.mux.HandleFunc("/api/sessions/supervisor/get", s.handleSupervisorSessionGet)
	s.mux.HandleFunc("/api/sessions/supervisor/create", s.handleSupervisorSessionCreate)
	s.mux.HandleFunc("/api/sessions/supervisor/start", s.handleSupervisorSessionStart)
	s.mux.HandleFunc("/api/sessions/supervisor/stop", s.handleSupervisorSessionStop)
	s.mux.HandleFunc("/api/sessions/supervisor/restart", s.handleSupervisorSessionRestart)
	s.mux.HandleFunc("/api/sessions/supervisor/logs", s.handleSupervisorSessionLogs)
	s.mux.HandleFunc("/api/sessions/supervisor/execute-shell", s.handleSupervisorSessionExecuteShell)
	s.mux.HandleFunc("/api/sessions/supervisor/attach-info", s.handleSupervisorSessionAttachInfo)
	s.mux.HandleFunc("/api/sessions/supervisor/health", s.handleSupervisorSessionHealth)
	s.mux.HandleFunc("/api/sessions/supervisor/state", s.handleSupervisorSessionState)
	s.mux.HandleFunc("/api/sessions/supervisor/update-state", s.handleSupervisorSessionUpdateState)
	s.mux.HandleFunc("/api/sessions/supervisor/clear", s.handleSupervisorSessionClear)
	s.mux.HandleFunc("/api/sessions/supervisor/heartbeat", s.handleSupervisorSessionHeartbeat)
	s.mux.HandleFunc("/api/sessions/supervisor/restore", s.handleSupervisorSessionRestore)
	s.mux.HandleFunc("/api/sessions/imported/list", s.handleImportedSessionList)
	s.mux.HandleFunc("/api/sessions/imported/get", s.handleImportedSessionGet)
	s.mux.HandleFunc("/api/sessions/imported/scan", s.handleImportedSessionScan)
	s.mux.HandleFunc("/api/sessions/imported/instruction-docs", s.handleImportedSessionInstructionDocs)
	s.mux.HandleFunc("/api/sessions/imported/maintenance-stats", s.handleImportedSessionMaintenanceStats)
	s.mux.HandleFunc("/api/billing/status", s.handleBillingStatus)
	s.mux.HandleFunc("/api/billing/provider-quotas", s.handleBillingProviderQuotas)
	s.mux.HandleFunc("/api/billing/cost-history", s.handleBillingCostHistory)
	s.mux.HandleFunc("/api/billing/model-pricing", s.handleBillingModelPricing)
	s.mux.HandleFunc("/api/billing/fallback-chain", s.handleBillingFallbackChain)
	s.mux.HandleFunc("/api/billing/task-routing-rules", s.handleBillingTaskRoutingRules)
	s.mux.HandleFunc("/api/billing/routing-strategy", s.handleBillingSetRoutingStrategy)
	s.mux.HandleFunc("/api/billing/task-routing-rule", s.handleBillingSetTaskRoutingRule)
	s.mux.HandleFunc("/api/billing/depleted-models", s.handleBillingDepletedModels)
	s.mux.HandleFunc("/api/billing/fallback-history", s.handleBillingFallbackHistory)
	s.mux.HandleFunc("/api/billing/fallback-history/clear", s.handleBillingClearFallbackHistory)
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
	s.mux.HandleFunc("/api/mcp/tools/auto-call", s.handleMCPAutoCallTool)
	s.mux.HandleFunc("/api/mcp/tool-ads", s.handleMCPToolAdvertisements)
	s.mux.HandleFunc("/api/mcp/tools/schema", s.handleMCPToolSchema)
	s.mux.HandleFunc("/api/mcp/preferences", s.handleMCPToolPreferences)
	s.mux.HandleFunc("/api/mcp/traffic", s.handleMCPTraffic)
	s.mux.HandleFunc("/api/mcp/tool-selection-telemetry", s.handleMCPToolSelectionTelemetry)
	s.mux.HandleFunc("/api/mcp/tool-selection-telemetry/clear", s.handleMCPClearToolSelectionTelemetry)
	s.mux.HandleFunc("/api/mcp/server-test", s.handleMCPServerTest)
	s.mux.HandleFunc("/api/mcp/lifecycle-modes", s.handleMCPSetLifecycleModes)
	s.mux.HandleFunc("/api/mcp/runtime-servers/add", s.handleMCPAddServer)
	s.mux.HandleFunc("/api/mcp/runtime-servers/remove", s.handleMCPRemoveServer)
	s.mux.HandleFunc("/api/mcp/config/jsonc", s.handleMCPJsoncConfig)
	s.mux.HandleFunc("/api/mcp/working-set", s.handleMCPWorkingSet)
	s.mux.HandleFunc("/api/mcp/working-set/evictions", s.handleMCPWorkingSetEvictions)
	s.mux.HandleFunc("/api/mcp/working-set/evictions/clear", s.handleMCPClearWorkingSetEvictions)
	s.mux.HandleFunc("/api/mcp/working-set/load", s.handleMCPLoadTool)
	s.mux.HandleFunc("/api/mcp/working-set/unload", s.handleMCPUnloadTool)
	s.mux.HandleFunc("/api/memory/search", s.handleMemorySearch)
	s.mux.HandleFunc("/api/memory/contexts", s.handleMemoryContexts)
	s.mux.HandleFunc("/api/memory/context/save", s.handleMemoryContextSave)
	s.mux.HandleFunc("/api/memory/context/get", s.handleMemoryContextGet)
	s.mux.HandleFunc("/api/memory/context/delete", s.handleMemoryContextDelete)
	s.mux.HandleFunc("/api/memory/agent-stats", s.handleMemoryAgentStats)
	s.mux.HandleFunc("/api/memory/agent-search", s.handleMemoryAgentSearch)
	s.mux.HandleFunc("/api/memory/facts/add", s.handleMemoryAddFact)
	s.mux.HandleFunc("/api/memory/observations/record", s.handleMemoryRecordObservation)
	s.mux.HandleFunc("/api/memory/observations/recent", s.handleMemoryRecentObservations)
	s.mux.HandleFunc("/api/memory/observations/search", s.handleMemorySearchObservations)
	s.mux.HandleFunc("/api/memory/user-prompts/capture", s.handleMemoryCaptureUserPrompt)
	s.mux.HandleFunc("/api/memory/user-prompts/recent", s.handleMemoryRecentUserPrompts)
	s.mux.HandleFunc("/api/memory/user-prompts/search", s.handleMemorySearchUserPrompts)
	s.mux.HandleFunc("/api/memory/pivot/search", s.handleMemorySearchPivot)
	s.mux.HandleFunc("/api/memory/timeline/window", s.handleMemoryTimelineWindow)
	s.mux.HandleFunc("/api/memory/cross-session-links", s.handleMemoryCrossSessionLinks)
	s.mux.HandleFunc("/api/memory/session-bootstrap", s.handleMemorySessionBootstrap)
	s.mux.HandleFunc("/api/memory/tool-context", s.handleMemoryToolContext)
	s.mux.HandleFunc("/api/memory/session-summaries/capture", s.handleMemoryCaptureSessionSummary)
	s.mux.HandleFunc("/api/memory/session-summaries/recent", s.handleMemoryRecentSessionSummaries)
	s.mux.HandleFunc("/api/memory/session-summaries/search", s.handleMemorySearchSessionSummaries)
	s.mux.HandleFunc("/api/memory/sectioned-status", s.handleMemorySectionedStatus)
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
	s.mux.HandleFunc("/api/autodev/start-loop", s.handleAutoDevStartLoop)
	s.mux.HandleFunc("/api/autodev/cancel-loop", s.handleAutoDevCancelLoop)
	s.mux.HandleFunc("/api/autodev/loops", s.handleAutoDevGetLoops)
	s.mux.HandleFunc("/api/autodev/loop", s.handleAutoDevGetLoop)
	s.mux.HandleFunc("/api/autodev/clear-completed", s.handleAutoDevClearCompleted)
	s.mux.HandleFunc("/api/darwin/evolve", s.handleDarwinEvolve)
	s.mux.HandleFunc("/api/darwin/experiment", s.handleDarwinExperiment)
	s.mux.HandleFunc("/api/darwin/status", s.handleDarwinStatus)
	s.mux.HandleFunc("/api/squad", s.handleSquadList)
	s.mux.HandleFunc("/api/squad/spawn", s.handleSquadSpawn)
	s.mux.HandleFunc("/api/squad/kill", s.handleSquadKill)
	s.mux.HandleFunc("/api/squad/chat", s.handleSquadChat)
	s.mux.HandleFunc("/api/squad/indexer/toggle", s.handleSquadToggleIndexer)
	s.mux.HandleFunc("/api/squad/indexer/status", s.handleSquadIndexerStatus)
	s.mux.HandleFunc("/api/supervisor/decompose", s.handleSupervisorDecompose)
	s.mux.HandleFunc("/api/supervisor/supervise", s.handleSupervisorSupervise)
	s.mux.HandleFunc("/api/supervisor/status", s.handleSupervisorStatus)
	s.mux.HandleFunc("/api/supervisor/tasks", s.handleSupervisorListTasks)
	s.mux.HandleFunc("/api/supervisor/cancel", s.handleSupervisorCancel)
	s.mux.HandleFunc("/api/autonomy/get-level", s.handleAutonomyGetLevel)
	s.mux.HandleFunc("/api/autonomy/set-level", s.handleAutonomySetLevel)
	s.mux.HandleFunc("/api/autonomy/activate-full", s.handleAutonomyActivateFull)
	s.mux.HandleFunc("/api/director/memorize", s.handleDirectorMemorize)
	s.mux.HandleFunc("/api/director/chat", s.handleDirectorChat)
	s.mux.HandleFunc("/api/director/status", s.handleDirectorStatus)
	s.mux.HandleFunc("/api/director/config/update", s.handleDirectorUpdateConfig)
	s.mux.HandleFunc("/api/director-config", s.handleDirectorConfigGet)
	s.mux.HandleFunc("/api/director-config/test", s.handleDirectorConfigTest)
	s.mux.HandleFunc("/api/director-config/update", s.handleDirectorConfigUpdate)
	s.mux.HandleFunc("/api/director/auto-drive/stop", s.handleDirectorStopAutoDrive)
	s.mux.HandleFunc("/api/director/auto-drive/start", s.handleDirectorStartAutoDrive)
	s.mux.HandleFunc("/api/council/members", s.handleCouncilMembers)
	s.mux.HandleFunc("/api/council/members/update", s.handleCouncilUpdateMembers)
	s.mux.HandleFunc("/api/council/status", s.handleCouncilBaseStatus)
	s.mux.HandleFunc("/api/council/config/update", s.handleCouncilBaseUpdateConfig)
	s.mux.HandleFunc("/api/council/supervisors/add", s.handleCouncilBaseAddSupervisors)
	s.mux.HandleFunc("/api/council/supervisors/clear", s.handleCouncilBaseClearSupervisors)
	s.mux.HandleFunc("/api/council/debate", s.handleCouncilBaseDebate)
	s.mux.HandleFunc("/api/council/toggle", s.handleCouncilBaseToggle)
	s.mux.HandleFunc("/api/council/mock/add", s.handleCouncilBaseAddMock)
	s.mux.HandleFunc("/api/council/sessions", s.handleCouncilSessionsList)
	s.mux.HandleFunc("/api/council/sessions/active", s.handleCouncilSessionsActive)
	s.mux.HandleFunc("/api/council/sessions/stats", s.handleCouncilSessionsStats)
	s.mux.HandleFunc("/api/council/sessions/get", s.handleCouncilSessionsGet)
	s.mux.HandleFunc("/api/council/sessions/start", s.handleCouncilSessionsStart)
	s.mux.HandleFunc("/api/council/sessions/bulk-start", s.handleCouncilSessionsBulkStart)
	s.mux.HandleFunc("/api/council/sessions/bulk-stop", s.handleCouncilSessionsBulkStop)
	s.mux.HandleFunc("/api/council/sessions/bulk-resume", s.handleCouncilSessionsBulkResume)
	s.mux.HandleFunc("/api/council/sessions/stop", s.handleCouncilSessionsStop)
	s.mux.HandleFunc("/api/council/sessions/resume", s.handleCouncilSessionsResume)
	s.mux.HandleFunc("/api/council/sessions/delete", s.handleCouncilSessionsDelete)
	s.mux.HandleFunc("/api/council/sessions/guidance", s.handleCouncilSessionsGuidance)
	s.mux.HandleFunc("/api/council/sessions/logs", s.handleCouncilSessionsLogs)
	s.mux.HandleFunc("/api/council/sessions/templates", s.handleCouncilSessionsTemplates)
	s.mux.HandleFunc("/api/council/sessions/from-template", s.handleCouncilSessionsStartFromTemplate)
	s.mux.HandleFunc("/api/council/sessions/persisted", s.handleCouncilSessionsPersisted)
	s.mux.HandleFunc("/api/council/sessions/by-tag", s.handleCouncilSessionsByTag)
	s.mux.HandleFunc("/api/council/sessions/by-template", s.handleCouncilSessionsByTemplate)
	s.mux.HandleFunc("/api/council/sessions/by-cli", s.handleCouncilSessionsByCLI)
	s.mux.HandleFunc("/api/council/sessions/tags/update", s.handleCouncilSessionsUpdateTags)
	s.mux.HandleFunc("/api/council/sessions/tags/add", s.handleCouncilSessionsAddTag)
	s.mux.HandleFunc("/api/council/sessions/tags/remove", s.handleCouncilSessionsRemoveTag)
	s.mux.HandleFunc("/api/council/quota/status", s.handleCouncilQuotaStatus)
	s.mux.HandleFunc("/api/council/quota/config", s.handleCouncilQuotaConfig)
	s.mux.HandleFunc("/api/council/quota/enabled", s.handleCouncilQuotaEnabled)
	s.mux.HandleFunc("/api/council/quota/check", s.handleCouncilQuotaCheck)
	s.mux.HandleFunc("/api/council/quota/stats", s.handleCouncilQuotaStats)
	s.mux.HandleFunc("/api/council/quota/limits", s.handleCouncilQuotaLimits)
	s.mux.HandleFunc("/api/council/quota/reset", s.handleCouncilQuotaReset)
	s.mux.HandleFunc("/api/council/quota/unthrottle", s.handleCouncilQuotaUnthrottle)
	s.mux.HandleFunc("/api/council/quota/record-request", s.handleCouncilQuotaRecordRequest)
	s.mux.HandleFunc("/api/council/quota/rate-limit-error", s.handleCouncilQuotaRecordRateLimitError)
	s.mux.HandleFunc("/api/council/history/status", s.handleCouncilHistoryStatus)
	s.mux.HandleFunc("/api/council/history/config", s.handleCouncilHistoryConfig)
	s.mux.HandleFunc("/api/council/history/toggle", s.handleCouncilHistoryToggle)
	s.mux.HandleFunc("/api/council/history/stats", s.handleCouncilHistoryStats)
	s.mux.HandleFunc("/api/council/history/list", s.handleCouncilHistoryList)
	s.mux.HandleFunc("/api/council/history/get", s.handleCouncilHistoryGet)
	s.mux.HandleFunc("/api/council/history/delete", s.handleCouncilHistoryDelete)
	s.mux.HandleFunc("/api/council/history/supervisor", s.handleCouncilHistorySupervisor)
	s.mux.HandleFunc("/api/council/history/clear", s.handleCouncilHistoryClear)
	s.mux.HandleFunc("/api/council/history/initialize", s.handleCouncilHistoryInitialize)
	s.mux.HandleFunc("/api/council/smart-pilot/status", s.handleCouncilSmartPilotStatus)
	s.mux.HandleFunc("/api/council/smart-pilot/config", s.handleCouncilSmartPilotConfig)
	s.mux.HandleFunc("/api/council/smart-pilot/trigger", s.handleCouncilSmartPilotTrigger)
	s.mux.HandleFunc("/api/council/smart-pilot/reset-count", s.handleCouncilSmartPilotResetCount)
	s.mux.HandleFunc("/api/council/smart-pilot/reset-all", s.handleCouncilSmartPilotResetAll)
	s.mux.HandleFunc("/api/council/hooks", s.handleCouncilHooksList)
	s.mux.HandleFunc("/api/council/hooks/register", s.handleCouncilHooksRegister)
	s.mux.HandleFunc("/api/council/hooks/unregister", s.handleCouncilHooksUnregister)
	s.mux.HandleFunc("/api/council/hooks/clear", s.handleCouncilHooksClear)
	s.mux.HandleFunc("/api/council/ide/status", s.handleCouncilIDEStatus)
	s.mux.HandleFunc("/api/council/ide/submit-task", s.handleCouncilIDESubmitTask)
	s.mux.HandleFunc("/api/council/evolution/start", s.handleCouncilEvolutionStart)
	s.mux.HandleFunc("/api/council/evolution/stop", s.handleCouncilEvolutionStop)
	s.mux.HandleFunc("/api/council/evolution/optimize", s.handleCouncilEvolutionOptimize)
	s.mux.HandleFunc("/api/council/evolution/evolve", s.handleCouncilEvolutionEvolve)
	s.mux.HandleFunc("/api/council/evolution/test", s.handleCouncilEvolutionTest)
	s.mux.HandleFunc("/api/council/fine-tune/datasets", s.handleCouncilFineTuneDatasets)
	s.mux.HandleFunc("/api/council/fine-tune/datasets/get", s.handleCouncilFineTuneDatasetGet)
	s.mux.HandleFunc("/api/council/fine-tune/jobs", s.handleCouncilFineTuneJobs)
	s.mux.HandleFunc("/api/council/fine-tune/jobs/start", s.handleCouncilFineTuneJobStart)
	s.mux.HandleFunc("/api/council/fine-tune/models", s.handleCouncilFineTuneModels)
	s.mux.HandleFunc("/api/council/fine-tune/models/deploy", s.handleCouncilFineTuneModelDeploy)
	s.mux.HandleFunc("/api/council/fine-tune/chat", s.handleCouncilFineTuneChat)
	s.mux.HandleFunc("/api/council/fine-tune/stats", s.handleCouncilFineTuneStats)
	s.mux.HandleFunc("/api/council/rotation", s.handleCouncilRotationList)
	s.mux.HandleFunc("/api/council/rotation/get", s.handleCouncilRotationGet)
	s.mux.HandleFunc("/api/council/rotation/create", s.handleCouncilRotationCreate)
	s.mux.HandleFunc("/api/council/rotation/add-participant", s.handleCouncilRotationAddParticipant)
	s.mux.HandleFunc("/api/council/rotation/post-message", s.handleCouncilRotationPostMessage)
	s.mux.HandleFunc("/api/council/rotation/set-agreement", s.handleCouncilRotationSetAgreement)
	s.mux.HandleFunc("/api/council/rotation/advance-turn", s.handleCouncilRotationAdvanceTurn)
	s.mux.HandleFunc("/api/council/rotation/configure-supervisor", s.handleCouncilRotationConfigureSupervisor)
	s.mux.HandleFunc("/api/council/rotation/run-supervisor-check", s.handleCouncilRotationRunSupervisorCheck)
	s.mux.HandleFunc("/api/council/rotation/update-shared-context", s.handleCouncilRotationUpdateSharedContext)
	s.mux.HandleFunc("/api/council/rotation/pause", s.handleCouncilRotationPause)
	s.mux.HandleFunc("/api/council/rotation/resume", s.handleCouncilRotationResume)
	s.mux.HandleFunc("/api/council/rotation/start-execution", s.handleCouncilRotationStartExecution)
	s.mux.HandleFunc("/api/council/rotation/complete", s.handleCouncilRotationComplete)
	s.mux.HandleFunc("/api/council/visual/system-diagram", s.handleCouncilVisualSystemDiagram)
	s.mux.HandleFunc("/api/council/visual/plan-diagram", s.handleCouncilVisualPlanDiagram)
	s.mux.HandleFunc("/api/council/visual/parse-plan", s.handleCouncilVisualParsePlan)
	s.mux.HandleFunc("/api/deerflow/status", s.handleDeerFlowStatus)
	s.mux.HandleFunc("/api/deerflow/models", s.handleDeerFlowModels)
	s.mux.HandleFunc("/api/deerflow/skills", s.handleDeerFlowSkills)
	s.mux.HandleFunc("/api/deerflow/memory", s.handleDeerFlowMemory)
	s.mux.HandleFunc("/api/healer/diagnose", s.handleHealerDiagnose)
	s.mux.HandleFunc("/api/healer/heal", s.handleHealerHeal)
	s.mux.HandleFunc("/api/healer/history", s.handleHealerHistory)
	s.mux.HandleFunc("/api/clouddev/providers", s.handleCloudDevListProviders)
	s.mux.HandleFunc("/api/clouddev/sessions/create", s.handleCloudDevCreateSession)
	s.mux.HandleFunc("/api/clouddev/sessions", s.handleCloudDevListSessions)
	s.mux.HandleFunc("/api/clouddev/sessions/get", s.handleCloudDevGetSession)
	s.mux.HandleFunc("/api/clouddev/sessions/status", s.handleCloudDevUpdateSessionStatus)
	s.mux.HandleFunc("/api/clouddev/sessions/delete", s.handleCloudDevDeleteSession)
	s.mux.HandleFunc("/api/clouddev/messages/send", s.handleCloudDevSendMessage)
	s.mux.HandleFunc("/api/clouddev/messages/broadcast", s.handleCloudDevBroadcastMessage)
	s.mux.HandleFunc("/api/clouddev/messages/preview-recipients", s.handleCloudDevPreviewBroadcastRecipients)
	s.mux.HandleFunc("/api/clouddev/plan/accept", s.handleCloudDevAcceptPlan)
	s.mux.HandleFunc("/api/clouddev/plan/auto-accept", s.handleCloudDevSetAutoAcceptPlan)
	s.mux.HandleFunc("/api/clouddev/messages/get", s.handleCloudDevGetMessages)
	s.mux.HandleFunc("/api/clouddev/logs", s.handleCloudDevGetLogs)
	s.mux.HandleFunc("/api/clouddev/stats", s.handleCloudDevStats)
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
	s.mux.HandleFunc("/api/tools/context", s.handleToolsContext)
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
	s.mux.HandleFunc("/api/skills/summary", s.handleSkillsSummary)
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
	s.mux.HandleFunc("/api/browser/status", s.handleBrowserStatus)
	s.mux.HandleFunc("/api/browser/close-page", s.handleBrowserClosePage)
	s.mux.HandleFunc("/api/browser/close-all", s.handleBrowserCloseAll)
	s.mux.HandleFunc("/api/browser/search-history", s.handleBrowserSearchHistory)
	s.mux.HandleFunc("/api/browser/scrape", s.handleBrowserScrapePage)
	s.mux.HandleFunc("/api/browser/screenshot", s.handleBrowserScreenshot)
	s.mux.HandleFunc("/api/browser/debug", s.handleBrowserDebug)
	s.mux.HandleFunc("/api/browser/proxy-fetch", s.handleBrowserProxyFetch)
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
	s.mux.HandleFunc("/api/swarm/start", s.handleSwarmStart)
	s.mux.HandleFunc("/api/swarm/resume", s.handleSwarmResumeMission)
	s.mux.HandleFunc("/api/swarm/approve-task", s.handleSwarmApproveTask)
	s.mux.HandleFunc("/api/swarm/decompose-task", s.handleSwarmDecomposeTask)
	s.mux.HandleFunc("/api/swarm/update-task-priority", s.handleSwarmUpdateTaskPriority)
	s.mux.HandleFunc("/api/swarm/debate", s.handleSwarmExecuteDebate)
	s.mux.HandleFunc("/api/swarm/consensus", s.handleSwarmSeekConsensus)
	s.mux.HandleFunc("/api/swarm/missions", s.handleSwarmMissionHistory)
	s.mux.HandleFunc("/api/swarm/risk/summary", s.handleSwarmMissionRiskSummary)
	s.mux.HandleFunc("/api/swarm/risk/rows", s.handleSwarmMissionRiskRows)
	s.mux.HandleFunc("/api/swarm/risk/facets", s.handleSwarmMissionRiskFacets)
	s.mux.HandleFunc("/api/swarm/mesh-capabilities", s.handleSwarmMeshCapabilities)
	s.mux.HandleFunc("/api/swarm/direct-message", s.handleSwarmSendDirectMessage)
	s.mux.HandleFunc("/api/cli/tools", s.handleCLITools)
	s.mux.HandleFunc("/api/cli/harnesses", s.handleHarnesses)
	s.mux.HandleFunc("/api/cli/summary", s.handleCLISummary)
	s.mux.HandleFunc("/api/memory/hypercode-memory/status", s.handleMemoryStatus)
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
	s.mux.HandleFunc("/api/mesh/broadcast", s.handleMeshBroadcast)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"service":   "hypercode-go",
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
			Service: "hypercode-go",
			BaseURL: s.cfg.BaseURL(),
			Routes: []RouteInfo{
				{Path: "/health", Category: "meta", Description: "Basic service health check."},
				{Path: "/version", Category: "meta", Description: "Build version for the Go sidecar."},
				{Path: "/api/index", Category: "meta", Description: "Self-describing index of the Go sidecar API surface."},
				{Path: "/api/health/server", Category: "meta", Description: "Health check alias for API consumers."},
				{Path: "/api/config/status", Category: "config", Description: "Path and config visibility snapshot for the sidecar and main workspace."},
				{Path: "/api/config/list", Category: "config", Description: "List config key/value entries through the TypeScript config router."},
				{Path: "/api/config/get", Category: "config", Description: "Read one config key through the TypeScript config router."},
				{Path: "/api/config/upsert", Category: "config", Description: "Upsert a config key through the TypeScript config router."},
				{Path: "/api/config/delete", Category: "config", Description: "Delete a config key through the TypeScript config router."},
				{Path: "/api/config/update", Category: "config", Description: "Update a config key through the TypeScript config router."},
				{Path: "/api/config/mcp-timeout", Category: "config", Description: "Read MCP timeout through the TypeScript config router."},
				{Path: "/api/config/mcp-timeout/set", Category: "config", Description: "Update MCP timeout through the TypeScript config router."},
				{Path: "/api/config/mcp-max-attempts", Category: "config", Description: "Read MCP max attempts through the TypeScript config router."},
				{Path: "/api/config/mcp-max-attempts/set", Category: "config", Description: "Update MCP max attempts through the TypeScript config router."},
				{Path: "/api/config/mcp-max-total-timeout", Category: "config", Description: "Read MCP max total timeout through the TypeScript config router."},
				{Path: "/api/config/mcp-max-total-timeout/set", Category: "config", Description: "Update MCP max total timeout through the TypeScript config router."},
				{Path: "/api/config/mcp-reset-timeout-on-progress", Category: "config", Description: "Read the MCP reset-on-progress flag through the TypeScript config router."},
				{Path: "/api/config/mcp-reset-timeout-on-progress/set", Category: "config", Description: "Update the MCP reset-on-progress flag through the TypeScript config router."},
				{Path: "/api/config/session-lifetime", Category: "config", Description: "Read session lifetime through the TypeScript config router."},
				{Path: "/api/config/session-lifetime/set", Category: "config", Description: "Update session lifetime through the TypeScript config router."},
				{Path: "/api/config/signup-disabled", Category: "config", Description: "Read signup-disabled state through the TypeScript config router."},
				{Path: "/api/config/signup-disabled/set", Category: "config", Description: "Update signup-disabled state through the TypeScript config router."},
				{Path: "/api/config/sso-signup-disabled", Category: "config", Description: "Read SSO-signup-disabled state through the TypeScript config router."},
				{Path: "/api/config/sso-signup-disabled/set", Category: "config", Description: "Update SSO-signup-disabled state through the TypeScript config router."},
				{Path: "/api/config/basic-auth-disabled", Category: "config", Description: "Read basic-auth-disabled state through the TypeScript config router."},
				{Path: "/api/config/basic-auth-disabled/set", Category: "config", Description: "Update basic-auth-disabled state through the TypeScript config router."},
				{Path: "/api/config/auth-providers", Category: "config", Description: "Read auth providers through the TypeScript config router."},
				{Path: "/api/config/always-visible-tools", Category: "config", Description: "Read always-visible tools through the TypeScript config router."},
				{Path: "/api/config/always-visible-tools/set", Category: "config", Description: "Update always-visible tools through the TypeScript config router."},
				{Path: "/api/providers/status", Category: "providers", Description: "Provider credential presence and auth-method hints."},
				{Path: "/api/providers/catalog", Category: "providers", Description: "Provider catalog metadata including default models and preferred tasks."},
				{Path: "/api/providers/summary", Category: "providers", Description: "Compact provider counts and auth/preferred-task buckets."},
				{Path: "/api/providers/routing-summary", Category: "providers", Description: "Read-only preview of intended task routing order."},
				{Path: "/api/sessions", Category: "sessions", Description: "Discovered session artifacts exposed as read-only sessions."},
				{Path: "/api/sessions/summary", Category: "sessions", Description: "Compact summary of discovered sessions by tool, format, task, and model hint."},
				{Path: "/api/sessions/context", Category: "sessions", Description: "Go-owned session context summary combining startup readiness, memory bootstrap, and tool advertisements."},
				{Path: "/api/sessions/supervisor/catalog", Category: "sessions", Description: "Bridge to the TypeScript session harness catalog."},
				{Path: "/api/sessions/supervisor/list", Category: "sessions", Description: "Bridge to the TypeScript supervised session list."},
				{Path: "/api/sessions/supervisor/get", Category: "sessions", Description: "Bridge to a specific TypeScript supervised session snapshot."},
				{Path: "/api/sessions/supervisor/create", Category: "sessions", Description: "Create a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/start", Category: "sessions", Description: "Start a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/stop", Category: "sessions", Description: "Stop a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/restart", Category: "sessions", Description: "Restart a supervised session through the TypeScript control plane."},
				{Path: "/api/sessions/supervisor/logs", Category: "sessions", Description: "Bridge to buffered logs for a specific TypeScript supervised session."},
				{Path: "/api/sessions/supervisor/execute-shell", Category: "sessions", Description: "Execute a contextual shell command in a TypeScript supervised session."},
				{Path: "/api/sessions/supervisor/attach-info", Category: "sessions", Description: "Bridge to supervised-session readiness and process metadata."},
				{Path: "/api/sessions/supervisor/health", Category: "sessions", Description: "Bridge to health details for a TypeScript supervised session."},
				{Path: "/api/sessions/supervisor/state", Category: "sessions", Description: "Bridge to the shared TypeScript session-manager state."},
				{Path: "/api/sessions/supervisor/update-state", Category: "sessions", Description: "Update the shared TypeScript session-manager state."},
				{Path: "/api/sessions/supervisor/clear", Category: "sessions", Description: "Clear the shared TypeScript session-manager state."},
				{Path: "/api/sessions/supervisor/heartbeat", Category: "sessions", Description: "Touch the shared TypeScript session-manager heartbeat."},
				{Path: "/api/sessions/supervisor/restore", Category: "sessions", Description: "Restore supervised sessions through the TypeScript control plane."},
				{Path: "/api/sessions/imported/list", Category: "sessions", Description: "Bridge to imported sessions already processed by the TypeScript control plane."},
				{Path: "/api/sessions/imported/get", Category: "sessions", Description: "Bridge to a specific imported session record from the TypeScript control plane."},
				{Path: "/api/sessions/imported/scan", Category: "sessions", Description: "Trigger TypeScript imported-session scanning, import, and memory extraction."},
				{Path: "/api/sessions/imported/instruction-docs", Category: "sessions", Description: "Bridge to imported-session instruction documents generated by the TypeScript control plane."},
				{Path: "/api/sessions/imported/maintenance-stats", Category: "sessions", Description: "Bridge to imported-session archive and retention maintenance counters."},
				{Path: "/api/billing/status", Category: "providers", Description: "Read billing status through the TypeScript billing router."},
				{Path: "/api/billing/provider-quotas", Category: "providers", Description: "Read provider quota state through the TypeScript billing router."},
				{Path: "/api/billing/cost-history", Category: "providers", Description: "Read billing cost history through the TypeScript billing router."},
				{Path: "/api/billing/model-pricing", Category: "providers", Description: "Read model pricing through the TypeScript billing router."},
				{Path: "/api/billing/fallback-chain", Category: "providers", Description: "Read provider fallback chain through the TypeScript billing router."},
				{Path: "/api/billing/task-routing-rules", Category: "providers", Description: "Read task routing rules through the TypeScript billing router."},
				{Path: "/api/billing/routing-strategy", Category: "providers", Description: "Update global routing strategy through the TypeScript billing router."},
				{Path: "/api/billing/task-routing-rule", Category: "providers", Description: "Update task-specific routing through the TypeScript billing router."},
				{Path: "/api/billing/depleted-models", Category: "providers", Description: "Read depleted model state through the TypeScript billing router."},
				{Path: "/api/billing/fallback-history", Category: "providers", Description: "Read provider fallback history through the TypeScript billing router."},
				{Path: "/api/billing/fallback-history/clear", Category: "providers", Description: "Clear provider fallback history through the TypeScript billing router."},
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
				{Path: "/api/mcp/tools/auto-call", Category: "mcp", Description: "Run one-shot semantic tool discovery and execution through the TypeScript auto_call_tool meta-tool."},
				{Path: "/api/mcp/tool-ads", Category: "mcp", Description: "Bridge goal/objective-aware tool advertisements through the TypeScript list_all_tools helper."},
				{Path: "/api/mcp/tools/schema", Category: "mcp", Description: "Hydrate and return a specific MCP tool schema through the TypeScript control plane."},
				{Path: "/api/mcp/preferences", Category: "mcp", Description: "Get or update MCP tool-selection preferences via the TypeScript control plane."},
				{Path: "/api/mcp/traffic", Category: "mcp", Description: "Bridge to recent TypeScript MCP server traffic events."},
				{Path: "/api/mcp/tool-selection-telemetry", Category: "mcp", Description: "Bridge to TypeScript auto-tool selection telemetry."},
				{Path: "/api/mcp/tool-selection-telemetry/clear", Category: "mcp", Description: "Clear TypeScript auto-tool selection telemetry."},
				{Path: "/api/mcp/server-test", Category: "mcp", Description: "Run a TypeScript MCP server probe through the sidecar."},
				{Path: "/api/mcp/lifecycle-modes", Category: "mcp", Description: "Update TypeScript MCP pool lifecycle modes through the sidecar."},
				{Path: "/api/mcp/runtime-servers/add", Category: "mcp", Description: "Add a downstream runtime MCP server through the TypeScript control plane."},
				{Path: "/api/mcp/runtime-servers/remove", Category: "mcp", Description: "Remove a downstream runtime MCP server through the TypeScript control plane."},
				{Path: "/api/mcp/config/jsonc", Category: "mcp", Description: "Read or update the TypeScript MCP JSONC config through the sidecar."},
				{Path: "/api/mcp/working-set", Category: "mcp", Description: "Bridge to the TypeScript MCP working-set snapshot."},
				{Path: "/api/mcp/working-set/evictions", Category: "mcp", Description: "Bridge to TypeScript MCP working-set eviction history."},
				{Path: "/api/mcp/working-set/evictions/clear", Category: "mcp", Description: "Clear TypeScript MCP working-set eviction history."},
				{Path: "/api/mcp/working-set/load", Category: "mcp", Description: "Load an MCP tool into the TypeScript working set."},
				{Path: "/api/mcp/working-set/unload", Category: "mcp", Description: "Unload an MCP tool from the TypeScript working set."},
				{Path: "/api/memory/search", Category: "memory", Description: "Bridge to TypeScript contextual memory search."},
				{Path: "/api/memory/contexts", Category: "memory", Description: "Bridge to TypeScript saved context listing."},
				{Path: "/api/memory/context/save", Category: "memory", Description: "Save a memory context through the TypeScript control plane."},
				{Path: "/api/memory/context/get", Category: "memory", Description: "Bridge to a specific saved memory context."},
				{Path: "/api/memory/context/delete", Category: "memory", Description: "Delete a saved memory context through the TypeScript control plane."},
				{Path: "/api/memory/agent-stats", Category: "memory", Description: "Bridge to TypeScript agent-memory statistics."},
				{Path: "/api/memory/agent-search", Category: "memory", Description: "Bridge to TypeScript agent-memory search."},
				{Path: "/api/memory/facts/add", Category: "memory", Description: "Add a memory fact through the TypeScript control plane."},
				{Path: "/api/memory/observations/record", Category: "memory", Description: "Record a structured observation through the TypeScript control plane."},
				{Path: "/api/memory/observations/recent", Category: "memory", Description: "Bridge to recent structured observations from the TypeScript control plane."},
				{Path: "/api/memory/observations/search", Category: "memory", Description: "Search structured observations through the TypeScript control plane."},
				{Path: "/api/memory/user-prompts/capture", Category: "memory", Description: "Capture a structured user prompt through the TypeScript control plane."},
				{Path: "/api/memory/user-prompts/recent", Category: "memory", Description: "Bridge to recent user prompts from the TypeScript control plane."},
				{Path: "/api/memory/user-prompts/search", Category: "memory", Description: "Search captured user prompts through the TypeScript control plane."},
				{Path: "/api/memory/pivot/search", Category: "memory", Description: "Bridge to pivot-based memory search through the TypeScript control plane."},
				{Path: "/api/memory/timeline/window", Category: "memory", Description: "Bridge to memory timeline window queries from the TypeScript control plane."},
				{Path: "/api/memory/cross-session-links", Category: "memory", Description: "Bridge to cross-session memory-link queries from the TypeScript control plane."},
				{Path: "/api/memory/session-bootstrap", Category: "memory", Description: "Bridge to TypeScript session bootstrap memory context."},
				{Path: "/api/memory/tool-context", Category: "memory", Description: "Bridge to TypeScript tool-context memory lookup."},
				{Path: "/api/memory/session-summaries/capture", Category: "memory", Description: "Capture a session-summary memory through the TypeScript control plane."},
				{Path: "/api/memory/session-summaries/recent", Category: "memory", Description: "Bridge to recent session-summary memories from the TypeScript control plane."},
				{Path: "/api/memory/session-summaries/search", Category: "memory", Description: "Bridge to session-summary memory search from the TypeScript control plane."},
				{Path: "/api/memory/sectioned-status", Category: "memory", Description: "Bridge to the TypeScript sectioned-memory status snapshot."},
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
				{Path: "/api/autodev/start-loop", Category: "code", Description: "Start an autoDev loop through the TypeScript autoDev router."},
				{Path: "/api/autodev/cancel-loop", Category: "code", Description: "Cancel an autoDev loop through the TypeScript autoDev router."},
				{Path: "/api/autodev/loops", Category: "code", Description: "List autoDev loops through the TypeScript autoDev router."},
				{Path: "/api/autodev/loop", Category: "code", Description: "Read one autoDev loop through the TypeScript autoDev router."},
				{Path: "/api/autodev/clear-completed", Category: "code", Description: "Clear completed autoDev loops through the TypeScript autoDev router."},
				{Path: "/api/darwin/evolve", Category: "code", Description: "Propose a Darwin mutation through the TypeScript darwin router."},
				{Path: "/api/darwin/experiment", Category: "code", Description: "Start a Darwin experiment through the TypeScript darwin router."},
				{Path: "/api/darwin/status", Category: "code", Description: "Read Darwin experiment status through the TypeScript darwin router."},
				{Path: "/api/squad", Category: "agents", Description: "List squad members through the TypeScript squad router."},
				{Path: "/api/squad/spawn", Category: "agents", Description: "Spawn a squad member through the TypeScript squad router."},
				{Path: "/api/squad/kill", Category: "agents", Description: "Terminate a squad member through the TypeScript squad router."},
				{Path: "/api/squad/chat", Category: "agents", Description: "Send a message to a squad member through the TypeScript squad router."},
				{Path: "/api/squad/indexer/toggle", Category: "agents", Description: "Toggle the squad indexer through the TypeScript squad router."},
				{Path: "/api/squad/indexer/status", Category: "agents", Description: "Read squad indexer status through the TypeScript squad router."},
				{Path: "/api/supervisor/decompose", Category: "agents", Description: "Decompose a goal through the TypeScript supervisor router."},
				{Path: "/api/supervisor/supervise", Category: "agents", Description: "Run a supervised task through the TypeScript supervisor router."},
				{Path: "/api/supervisor/status", Category: "agents", Description: "Read supervisor status through the TypeScript supervisor router."},
				{Path: "/api/supervisor/tasks", Category: "agents", Description: "List supervisor tasks through the TypeScript supervisor router."},
				{Path: "/api/supervisor/cancel", Category: "agents", Description: "Cancel a supervisor task through the TypeScript supervisor router."},
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
				{Path: "/api/tools/context", Category: "control", Description: "Go-owned tool guidance snapshot combining startup readiness, tool context memory, and related tool advertisements."},
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
				{Path: "/api/skills/summary", Category: "agents", Description: "List skills with progressive-disclosure metadata only (id, name, folder)."},
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
				{Path: "/api/autonomy/get-level", Category: "governance", Description: "Read the current autonomy level through the TypeScript autonomy router."},
				{Path: "/api/autonomy/set-level", Category: "governance", Description: "Set autonomy level through the TypeScript autonomy router."},
				{Path: "/api/autonomy/activate-full", Category: "governance", Description: "Activate full autonomy through the TypeScript autonomy router."},
				{Path: "/api/director/memorize", Category: "governance", Description: "Send memory content to the TypeScript director router."},
				{Path: "/api/director/chat", Category: "governance", Description: "Chat with the TypeScript director runtime."},
				{Path: "/api/director/status", Category: "governance", Description: "Read TypeScript director runtime status."},
				{Path: "/api/director/config/update", Category: "governance", Description: "Update TypeScript director config."},
				{Path: "/api/director-config", Category: "governance", Description: "Read TypeScript directorConfig settings."},
				{Path: "/api/director-config/test", Category: "governance", Description: "Run TypeScript directorConfig readiness checks."},
				{Path: "/api/director-config/update", Category: "governance", Description: "Update TypeScript directorConfig settings."},
				{Path: "/api/director/auto-drive/stop", Category: "governance", Description: "Stop auto-drive through the TypeScript director router."},
				{Path: "/api/director/auto-drive/start", Category: "governance", Description: "Start auto-drive through the TypeScript director router."},
				{Path: "/api/council/members", Category: "governance", Description: "Read council members through the TypeScript council router."},
				{Path: "/api/council/members/update", Category: "governance", Description: "Update council members through the TypeScript council router."},
				{Path: "/api/council/status", Category: "governance", Description: "Read council base status through the TypeScript council router."},
				{Path: "/api/council/config/update", Category: "governance", Description: "Update council base config through the TypeScript council router."},
				{Path: "/api/council/supervisors/add", Category: "governance", Description: "Add council supervisors through the TypeScript council router."},
				{Path: "/api/council/supervisors/clear", Category: "governance", Description: "Clear council supervisors through the TypeScript council router."},
				{Path: "/api/council/debate", Category: "governance", Description: "Run a council debate through the TypeScript council router."},
				{Path: "/api/council/toggle", Category: "governance", Description: "Toggle the council through the TypeScript council router."},
				{Path: "/api/council/mock/add", Category: "governance", Description: "Add a mock council supervisor through the TypeScript council router."},
				{Path: "/api/council/sessions", Category: "governance", Description: "List council sessions through the TypeScript council router."},
				{Path: "/api/council/sessions/active", Category: "governance", Description: "List active council sessions through the TypeScript council router."},
				{Path: "/api/council/sessions/stats", Category: "governance", Description: "Read council session stats through the TypeScript council router."},
				{Path: "/api/council/sessions/get", Category: "governance", Description: "Read a specific council session through the TypeScript council router."},
				{Path: "/api/council/sessions/start", Category: "governance", Description: "Start a council session through the TypeScript council router."},
				{Path: "/api/council/sessions/bulk-start", Category: "governance", Description: "Start multiple council sessions through the TypeScript council router."},
				{Path: "/api/council/sessions/bulk-stop", Category: "governance", Description: "Stop all council sessions through the TypeScript council router."},
				{Path: "/api/council/sessions/bulk-resume", Category: "governance", Description: "Resume all council sessions through the TypeScript council router."},
				{Path: "/api/council/sessions/stop", Category: "governance", Description: "Stop a council session through the TypeScript council router."},
				{Path: "/api/council/sessions/resume", Category: "governance", Description: "Resume a council session through the TypeScript council router."},
				{Path: "/api/council/sessions/delete", Category: "governance", Description: "Delete a council session through the TypeScript council router."},
				{Path: "/api/council/sessions/guidance", Category: "governance", Description: "Send guidance to a council session through the TypeScript council router."},
				{Path: "/api/council/sessions/logs", Category: "governance", Description: "Read council session logs through the TypeScript council router."},
				{Path: "/api/council/sessions/templates", Category: "governance", Description: "Read council session templates through the TypeScript council router."},
				{Path: "/api/council/sessions/from-template", Category: "governance", Description: "Start a council session from a template through the TypeScript council router."},
				{Path: "/api/council/sessions/persisted", Category: "governance", Description: "List persisted council sessions through the TypeScript council router."},
				{Path: "/api/council/sessions/by-tag", Category: "governance", Description: "List council sessions by tag through the TypeScript council router."},
				{Path: "/api/council/sessions/by-template", Category: "governance", Description: "List council sessions by template through the TypeScript council router."},
				{Path: "/api/council/sessions/by-cli", Category: "governance", Description: "List council sessions by CLI type through the TypeScript council router."},
				{Path: "/api/council/sessions/tags/update", Category: "governance", Description: "Replace council session tags through the TypeScript council router."},
				{Path: "/api/council/sessions/tags/add", Category: "governance", Description: "Add a council session tag through the TypeScript council router."},
				{Path: "/api/council/sessions/tags/remove", Category: "governance", Description: "Remove a council session tag through the TypeScript council router."},
				{Path: "/api/council/quota/status", Category: "governance", Description: "Read council quota status through the TypeScript council router."},
				{Path: "/api/council/quota/config", Category: "governance", Description: "Read or update council quota config through the TypeScript council router."},
				{Path: "/api/council/quota/enabled", Category: "governance", Description: "Enable or disable council quota enforcement through the TypeScript council router."},
				{Path: "/api/council/quota/check", Category: "governance", Description: "Check council quota availability for a provider through the TypeScript council router."},
				{Path: "/api/council/quota/stats", Category: "governance", Description: "Read council quota stats through the TypeScript council router."},
				{Path: "/api/council/quota/limits", Category: "governance", Description: "Read or update council quota limits through the TypeScript council router."},
				{Path: "/api/council/quota/reset", Category: "governance", Description: "Reset council quota usage through the TypeScript council router."},
				{Path: "/api/council/quota/unthrottle", Category: "governance", Description: "Unthrottle a council quota provider through the TypeScript council router."},
				{Path: "/api/council/quota/record-request", Category: "governance", Description: "Record a council quota request through the TypeScript council router."},
				{Path: "/api/council/quota/rate-limit-error", Category: "governance", Description: "Record a council quota rate-limit error through the TypeScript council router."},
				{Path: "/api/council/history/status", Category: "governance", Description: "Read council debate-history status through the TypeScript history router."},
				{Path: "/api/council/history/config", Category: "governance", Description: "Read or update council debate-history config through the TypeScript history router."},
				{Path: "/api/council/history/toggle", Category: "governance", Description: "Toggle council debate-history through the TypeScript history router."},
				{Path: "/api/council/history/stats", Category: "governance", Description: "Read council debate-history stats through the TypeScript history router."},
				{Path: "/api/council/history/list", Category: "governance", Description: "List council debate-history records through the TypeScript history router."},
				{Path: "/api/council/history/get", Category: "governance", Description: "Read a council debate-history record through the TypeScript history router."},
				{Path: "/api/council/history/delete", Category: "governance", Description: "Delete a council debate-history record through the TypeScript history router."},
				{Path: "/api/council/history/supervisor", Category: "governance", Description: "Read council supervisor vote history through the TypeScript history router."},
				{Path: "/api/council/history/clear", Category: "governance", Description: "Clear council debate-history through the TypeScript history router."},
				{Path: "/api/council/history/initialize", Category: "governance", Description: "Initialize council debate-history through the TypeScript history router."},
				{Path: "/api/council/smart-pilot/status", Category: "governance", Description: "Read council smart-pilot status through the TypeScript smartPilot router."},
				{Path: "/api/council/smart-pilot/config", Category: "governance", Description: "Read or update council smart-pilot config through the TypeScript smartPilot router."},
				{Path: "/api/council/smart-pilot/trigger", Category: "governance", Description: "Trigger a smart-pilot task through the TypeScript smartPilot router."},
				{Path: "/api/council/smart-pilot/reset-count", Category: "governance", Description: "Reset a smart-pilot approval count through the TypeScript smartPilot router."},
				{Path: "/api/council/smart-pilot/reset-all", Category: "governance", Description: "Reset all smart-pilot approval counts through the TypeScript smartPilot router."},
				{Path: "/api/council/hooks", Category: "governance", Description: "List registered council auto-continue hooks through the TypeScript hooks router."},
				{Path: "/api/council/hooks/register", Category: "governance", Description: "Register a council auto-continue hook through the TypeScript hooks router."},
				{Path: "/api/council/hooks/unregister", Category: "governance", Description: "Unregister a council auto-continue hook through the TypeScript hooks router."},
				{Path: "/api/council/hooks/clear", Category: "governance", Description: "Clear all registered council auto-continue hooks through the TypeScript hooks router."},
				{Path: "/api/council/ide/status", Category: "governance", Description: "Read council IDE bridge status through the TypeScript IDE router."},
				{Path: "/api/council/ide/submit-task", Category: "governance", Description: "Submit an IDE-generated task through the TypeScript IDE router."},
				{Path: "/api/council/evolution/start", Category: "governance", Description: "Start council self-evolution through the TypeScript evolution router."},
				{Path: "/api/council/evolution/stop", Category: "governance", Description: "Stop council self-evolution through the TypeScript evolution router."},
				{Path: "/api/council/evolution/optimize", Category: "governance", Description: "Optimize council self-evolution weights through the TypeScript evolution router."},
				{Path: "/api/council/evolution/evolve", Category: "governance", Description: "Run a council evolution task through the TypeScript evolution router."},
				{Path: "/api/council/evolution/test", Category: "governance", Description: "Run a council evolution self-test through the TypeScript evolution router."},
				{Path: "/api/council/fine-tune/datasets", Category: "governance", Description: "Create or list fine-tuning datasets through the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/datasets/get", Category: "governance", Description: "Read a fine-tuning dataset through the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/jobs", Category: "governance", Description: "Create or list fine-tuning jobs through the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/jobs/start", Category: "governance", Description: "Start a fine-tuning job through the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/models", Category: "governance", Description: "Register or list fine-tuned models through the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/models/deploy", Category: "governance", Description: "Deploy a fine-tuned model through the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/chat", Category: "governance", Description: "Chat through a deployed fine-tuned model via the TypeScript fineTune router."},
				{Path: "/api/council/fine-tune/stats", Category: "governance", Description: "Read fine-tuning statistics through the TypeScript fineTune router."},
				{Path: "/api/council/rotation", Category: "governance", Description: "List shared-context council rotation rooms through the TypeScript rotation router."},
				{Path: "/api/council/rotation/get", Category: "governance", Description: "Read a shared-context council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/create", Category: "governance", Description: "Create a shared-context council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/add-participant", Category: "governance", Description: "Add a participant to a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/post-message", Category: "governance", Description: "Post a council rotation chatroom message through the TypeScript rotation router."},
				{Path: "/api/council/rotation/set-agreement", Category: "governance", Description: "Record a plan-mode agreement vote through the TypeScript rotation router."},
				{Path: "/api/council/rotation/advance-turn", Category: "governance", Description: "Advance a council rotation room turn through the TypeScript rotation router."},
				{Path: "/api/council/rotation/configure-supervisor", Category: "governance", Description: "Configure a supervisor for a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/run-supervisor-check", Category: "governance", Description: "Run a supervisor evaluation for a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/update-shared-context", Category: "governance", Description: "Update shared context for a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/pause", Category: "governance", Description: "Pause a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/resume", Category: "governance", Description: "Resume a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/start-execution", Category: "governance", Description: "Start execution mode for a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/rotation/complete", Category: "governance", Description: "Complete a council rotation room through the TypeScript rotation router."},
				{Path: "/api/council/visual/system-diagram", Category: "governance", Description: "Read the council system diagram through the TypeScript visual router."},
				{Path: "/api/council/visual/plan-diagram", Category: "governance", Description: "Render a council plan diagram through the TypeScript visual router."},
				{Path: "/api/council/visual/parse-plan", Category: "governance", Description: "Parse a council Mermaid plan through the TypeScript visual router."},
				{Path: "/api/deerflow/status", Category: "operator", Description: "Read DeerFlow bridge availability through the TypeScript DeerFlow router."},
				{Path: "/api/deerflow/models", Category: "operator", Description: "List DeerFlow models through the TypeScript DeerFlow router."},
				{Path: "/api/deerflow/skills", Category: "operator", Description: "List DeerFlow skills through the TypeScript DeerFlow router."},
				{Path: "/api/deerflow/memory", Category: "operator", Description: "Read DeerFlow memory status through the TypeScript DeerFlow router."},
				{Path: "/api/healer/diagnose", Category: "operator", Description: "Analyze an error through the TypeScript healer router."},
				{Path: "/api/healer/heal", Category: "operator", Description: "Attempt a heal action through the TypeScript healer router."},
				{Path: "/api/healer/history", Category: "operator", Description: "Read healer history through the TypeScript healer router."},
				{Path: "/api/clouddev/providers", Category: "operator", Description: "List cloud development providers through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/sessions/create", Category: "operator", Description: "Create a cloud development session through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/sessions", Category: "operator", Description: "List cloud development sessions through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/sessions/get", Category: "operator", Description: "Read a cloud development session through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/sessions/status", Category: "operator", Description: "Update a cloud development session status through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/sessions/delete", Category: "operator", Description: "Delete a cloud development session through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/messages/send", Category: "operator", Description: "Send a cloud development session message through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/messages/broadcast", Category: "operator", Description: "Broadcast a cloud development session message through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/messages/preview-recipients", Category: "operator", Description: "Preview cloud development broadcast recipients through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/plan/accept", Category: "operator", Description: "Accept a cloud development plan through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/plan/auto-accept", Category: "operator", Description: "Toggle cloud development auto-accept through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/messages/get", Category: "operator", Description: "Read cloud development session messages through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/logs", Category: "operator", Description: "Read cloud development session logs through the TypeScript cloudDev router."},
				{Path: "/api/clouddev/stats", Category: "operator", Description: "Read aggregate cloud development stats through the TypeScript cloudDev router."},
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
				{Path: "/api/browser/status", Category: "browser", Description: "Read browser status through the TypeScript browser router."},
				{Path: "/api/browser/close-page", Category: "browser", Description: "Close a browser page through the TypeScript browser router."},
				{Path: "/api/browser/close-all", Category: "browser", Description: "Close all browser pages through the TypeScript browser router."},
				{Path: "/api/browser/search-history", Category: "browser", Description: "Search browser history through the TypeScript browser router."},
				{Path: "/api/browser/scrape", Category: "browser", Description: "Scrape the current browser page through the TypeScript browser router."},
				{Path: "/api/browser/screenshot", Category: "browser", Description: "Capture a browser screenshot through the TypeScript browser router."},
				{Path: "/api/browser/debug", Category: "browser", Description: "Issue browser debug actions through the TypeScript browser router."},
				{Path: "/api/browser/proxy-fetch", Category: "browser", Description: "Run a browser proxy fetch through the TypeScript browser router."},
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
				{Path: "/api/swarm/start", Category: "orchestration", Description: "Start a TypeScript swarm orchestration mission."},
				{Path: "/api/swarm/resume", Category: "orchestration", Description: "Resume a TypeScript swarm mission."},
				{Path: "/api/swarm/approve-task", Category: "orchestration", Description: "Approve or reject a swarm task through the TypeScript swarm router."},
				{Path: "/api/swarm/decompose-task", Category: "orchestration", Description: "Decompose a swarm task through the TypeScript swarm router."},
				{Path: "/api/swarm/update-task-priority", Category: "orchestration", Description: "Update swarm task priority through the TypeScript swarm router."},
				{Path: "/api/swarm/debate", Category: "orchestration", Description: "Run a multi-model swarm debate through the TypeScript swarm router."},
				{Path: "/api/swarm/consensus", Category: "orchestration", Description: "Seek multi-model consensus through the TypeScript swarm router."},
				{Path: "/api/swarm/missions", Category: "orchestration", Description: "List swarm mission history through the TypeScript swarm router."},
				{Path: "/api/swarm/risk/summary", Category: "orchestration", Description: "Read swarm mission risk summary through the TypeScript swarm router."},
				{Path: "/api/swarm/risk/rows", Category: "orchestration", Description: "Read swarm mission risk rows through the TypeScript swarm router."},
				{Path: "/api/swarm/risk/facets", Category: "orchestration", Description: "Read swarm mission risk facets through the TypeScript swarm router."},
				{Path: "/api/swarm/mesh-capabilities", Category: "orchestration", Description: "Read swarm mesh capabilities through the TypeScript swarm router."},
				{Path: "/api/swarm/direct-message", Category: "orchestration", Description: "Send a direct mesh message through the TypeScript swarm router."},
				{Path: "/api/cli/tools", Category: "cli", Description: "Detected local CLI tools and versions."},
				{Path: "/api/cli/harnesses", Category: "cli", Description: "Harness registry metadata and install visibility."},
				{Path: "/api/cli/summary", Category: "cli", Description: "Compact CLI and harness readiness summary."},
				{Path: "/api/memory/hypercode-memory/status", Category: "memory", Description: "Read-only sectioned-memory status snapshot."},
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
				{Path: "/api/mesh/broadcast", Category: "mesh", Description: "Broadcast a mesh message through the TypeScript mesh router."},
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
	parsedLimit := 50
	var err error
	if limit != "" {
		parsedLimit, err = strconv.Atoi(limit)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid limit query parameter",
			})
			return
		}
	}
	if parsedLimit <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid limit query parameter",
		})
		return
	}

	var importedSessions []ImportedSessionRecord
	upstreamBase, bridgeErr := s.callUpstreamJSON(r.Context(), "session.importedList", map[string]any{"limit": parsedLimit}, &importedSessions)
	if bridgeErr == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    importedSessions,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "session.importedList",
			},
		})
		return
	}

	if archivedRecords, archiveErr := s.loadArchivedImportedSessionRecords(); archiveErr == nil && len(archivedRecords) > 0 {
		if parsedLimit < len(archivedRecords) {
			archivedRecords = archivedRecords[:parsedLimit]
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    archivedRecords,
			"bridge": map[string]any{
				"fallback":  "go-sessionimport",
				"procedure": "session.importedList",
				"reason":    bridgeErr.Error(),
			},
		})
		return
	}

	candidates, scanErr := s.scanValidatedImportSources()
	if scanErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   bridgeErr.Error(),
			"detail":  scanErr.Error(),
		})
		return
	}
	fallbackSessions := s.importedSessionFallbackRecords(candidates)
	if parsedLimit < len(fallbackSessions) {
		fallbackSessions = fallbackSessions[:parsedLimit]
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackSessions,
		"bridge": map[string]any{
			"fallback":  "go-sessionimport",
			"procedure": "session.importedList",
			"reason":    bridgeErr.Error(),
		},
	})
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

	var importedSession *ImportedSessionRecord
	upstreamBase, bridgeErr := s.callUpstreamJSON(r.Context(), "session.importedGet", map[string]any{"id": importedID}, &importedSession)
	if bridgeErr == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    importedSession,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "session.importedGet",
			},
		})
		return
	}

	if archivedRecords, archiveErr := s.loadArchivedImportedSessionRecords(); archiveErr == nil && len(archivedRecords) > 0 {
		for _, record := range archivedRecords {
			if record.ID != importedID {
				continue
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data":    record,
				"bridge": map[string]any{
					"fallback":  "go-sessionimport",
					"procedure": "session.importedGet",
					"reason":    bridgeErr.Error(),
				},
			})
			return
		}
	}

	candidates, scanErr := s.scanValidatedImportSources()
	if scanErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   bridgeErr.Error(),
			"detail":  scanErr.Error(),
		})
		return
	}
	for _, record := range s.importedSessionFallbackRecords(candidates) {
		if record.ID != importedID {
			continue
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    record,
			"bridge": map[string]any{
				"fallback":  "go-sessionimport",
				"procedure": "session.importedGet",
				"reason":    bridgeErr.Error(),
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    nil,
		"bridge": map[string]any{
			"fallback":  "go-sessionimport",
			"procedure": "session.importedGet",
			"reason":    bridgeErr.Error(),
		},
	})
}

func (s *Server) handleImportedSessionScan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil && err.Error() != "EOF" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}

	var summary struct {
		DiscoveredCount    int      `json:"discoveredCount"`
		ImportedCount      int      `json:"importedCount"`
		SkippedCount       int      `json:"skippedCount"`
		StoredMemoryCount  int      `json:"storedMemoryCount"`
		InstructionDocPath *string  `json:"instructionDocPath"`
		Tools              []string `json:"tools"`
	}
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "session.importedScan", payload, &summary)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    summary,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "session.importedScan",
			},
		})
		return
	}

	if archivedRecords, archiveErr := s.loadArchivedImportedSessionRecords(); archiveErr == nil && len(archivedRecords) > 0 {
		fallbackSummary := archivedImportedSessionScanSummary(archivedRecords)
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackSummary,
			"bridge": map[string]any{
				"fallback":  "go-sessionimport",
				"procedure": "session.importedScan",
				"reason":    err.Error(),
			},
		})
		return
	}

	candidates, scanErr := s.scanValidatedImportSources()
	if scanErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  scanErr.Error(),
		})
		return
	}

	discoveredCount := len(candidates)
	importedCount := 0
	skippedCount := 0
	toolsSet := make(map[string]struct{})
	for _, candidate := range candidates {
		if candidate.Valid {
			skippedCount++
		}
		if candidate.SourceTool != "" {
			toolsSet[candidate.SourceTool] = struct{}{}
		}
	}
	tools := make([]string, 0, len(toolsSet))
	for tool := range toolsSet {
		tools = append(tools, tool)
	}
	sort.Strings(tools)

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"discoveredCount":    discoveredCount,
			"importedCount":      importedCount,
			"skippedCount":       skippedCount,
			"storedMemoryCount":  0,
			"instructionDocPath": nil,
			"tools":              tools,
		},
		"bridge": map[string]any{
			"fallback":  "go-sessionimport",
			"procedure": "session.importedScan",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleImportedSessionInstructionDocs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var docs []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "session.importedInstructionDocs", nil, &docs)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    docs,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "session.importedInstructionDocs",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": func() []map[string]any {
			document := interop.ReadImportedInstructions(s.cfg.ImportedInstructionsPath())
			if !document.Available {
				return []map[string]any{}
			}
			return []map[string]any{
				{
					"path":       document.Path,
					"name":       filepath.Base(document.Path),
					"modifiedAt": document.ModifiedAt,
					"size":       document.Size,
				},
			}
		}(),
		"bridge": map[string]any{
			"fallback":  "go-sessionimport",
			"procedure": "session.importedInstructionDocs",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleImportedSessionMaintenanceStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var stats ImportedSessionMaintenanceStats
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "session.importedMaintenanceStats", nil, &stats)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    stats,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "session.importedMaintenanceStats",
			},
		})
		return
	}

	if archivedRecords, archiveErr := s.loadArchivedImportedSessionRecords(); archiveErr == nil && len(archivedRecords) > 0 {
		fallbackStats := archivedImportedSessionMaintenanceStats(archivedRecords)
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackStats,
			"bridge": map[string]any{
				"fallback":  "go-sessionimport",
				"procedure": "session.importedMaintenanceStats",
				"reason":    err.Error(),
			},
		})
		return
	}

	candidates, scanErr := s.scanValidatedImportSources()
	if scanErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  scanErr.Error(),
		})
		return
	}

	fallbackStats := ImportedSessionMaintenanceStats{
		TotalSessions:                len(candidates),
		InlineTranscriptCount:        len(candidates),
		ArchivedTranscriptCount:      0,
		MissingRetentionSummaryCount: len(candidates),
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackStats,
		"bridge": map[string]any{
			"fallback":  "go-sessionimport",
			"procedure": "session.importedMaintenanceStats",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var status map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getStatus", nil, &status)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    status,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getStatus",
			},
		})
		return
	}

	tools, summary, fallbackErr := s.localMCPSummary(r.Context())
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	sourceBackedServers := sourceBackedInstalledHarnesses(summary.InstalledHarnesses)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"connected":                false,
			"serverCount":              len(sourceBackedServers),
			"toolCount":                sourceBackedToolCount(summary.InstalledHarnesses),
			"availableToolCount":       len(tools),
			"harnessCount":             summary.HarnessCount,
			"sourceBackedHarnessCount": summary.SourceBackedHarnessCount,
			"lifecycle": map[string]any{
				"lazySessionMode":        s.lifecycleModes["lazySessionMode"],
				"singleActiveServerMode": s.lifecycleModes["singleActiveServerMode"],
				"events":                 []map[string]any{},
			},
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getStatus",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPRuntimeServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var servers []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.listServers", nil, &servers)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    servers,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listServers",
			},
		})
		return
	}

	_, summary, fallbackErr := s.localMCPSummary(r.Context())
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackRuntimeServers(summary.InstalledHarnesses),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listServers",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPConfiguredServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var servers []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcpServers.list", nil, &servers)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    servers,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcpServers.list",
			},
		})
		return
	}

	fallbackServers, fallbackErr := s.localConfiguredMCPServers()
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackServers,
		"bridge": map[string]any{
			"fallback":  "go-local-jsonc",
			"procedure": "mcpServers.list",
			"reason":    err.Error(),
		},
	})
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

	var server map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcpServers.get", map[string]any{"uuid": uuid}, &server)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    server,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcpServers.get",
			},
		})
		return
	}

	fallbackServers, fallbackErr := s.localConfiguredMCPServers()
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}
	for _, fallbackServer := range fallbackServers {
		if fallbackUUID, _ := fallbackServer["uuid"].(string); fallbackUUID == uuid {
			writeJSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data":    fallbackServer,
				"bridge": map[string]any{
					"fallback":  "go-local-jsonc",
					"procedure": "mcpServers.get",
					"reason":    err.Error(),
				},
			})
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    nil,
		"bridge": map[string]any{
			"fallback":  "go-local-jsonc",
			"procedure": "mcpServers.get",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPConfiguredServerCreate(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcpServers.create", func(payload map[string]any) (any, error) {
		return s.localCreateConfiguredServer(payload)
	})
}

func (s *Server) handleMCPConfiguredServerUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcpServers.update", func(payload map[string]any) (any, error) {
		return s.localUpdateConfiguredServer(payload)
	})
}

func (s *Server) handleMCPConfiguredServerDelete(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcpServers.delete", func(payload map[string]any) (any, error) {
		return s.localDeleteConfiguredServer(payload)
	})
}

func (s *Server) handleMCPConfiguredServerBulkImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var payload []map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcpServers.bulkImport", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcpServers.bulkImport",
			},
		})
		return
	}

	fallbackResult, fallbackErr := s.localBulkImportConfiguredServers(payload)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-jsonc",
			"procedure": "mcpServers.bulkImport",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPConfiguredServerReloadMetadata(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcpServers.reloadMetadata", func(payload map[string]any) (any, error) {
		return s.localReloadConfiguredServerMetadata(payload)
	})
}

func (s *Server) handleMCPConfiguredServerClearMetadataCache(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcpServers.clearMetadataCache", func(payload map[string]any) (any, error) {
		return s.localClearConfiguredServerMetadata(payload)
	})
}

func (s *Server) handleMCPRegistrySnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var snapshot []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcpServers.registrySnapshot", nil, &snapshot)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    snapshot,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcpServers.registrySnapshot",
			},
		})
		return
	}

	fallbackSnapshot, fallbackErr := s.localMCPRegistrySnapshot()
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackSnapshot,
		"bridge": map[string]any{
			"fallback":  "go-master-index",
			"procedure": "mcpServers.registrySnapshot",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPSyncTargets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var targets []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcpServers.syncTargets", nil, &targets)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    targets,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcpServers.syncTargets",
			},
		})
		return
	}

	fallbackTargets, fallbackErr := s.localMCPSyncTargets()
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackTargets,
		"bridge": map[string]any{
			"fallback":  "go-local-jsonc",
			"procedure": "mcpServers.syncTargets",
			"reason":    err.Error(),
		},
	})
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

	var preview map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcpServers.exportClientConfig", payload, &preview)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    preview,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcpServers.exportClientConfig",
			},
		})
		return
	}

	overridePath, _ := payload["path"].(string)
	fallbackPreview, fallbackErr := s.localMCPExportClientConfig(client, overridePath)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackPreview,
		"bridge": map[string]any{
			"fallback":  "go-local-jsonc",
			"procedure": "mcpServers.exportClientConfig",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPSyncClientConfig(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcpServers.syncClientConfig", func(payload map[string]any) (any, error) {
		client, _ := payload["client"].(string)
		overridePath, _ := payload["path"].(string)
		preview, err := s.localMCPExportClientConfig(client, overridePath)
		if err != nil {
			return nil, err
		}
		targetPath, _ := preview["targetPath"].(string)
		jsonText, _ := preview["json"].(string)
		if strings.TrimSpace(targetPath) == "" {
			return nil, errors.New("missing client target path")
		}
		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(targetPath, []byte(jsonText), 0o644); err != nil {
			return nil, err
		}
		preview["written"] = true
		return preview, nil
	})
}

func (s *Server) handleMCPTools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var tools []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.listTools", nil, &tools)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    tools,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listTools",
			},
		})
		return
	}

	_, summary, fallbackErr := s.localMCPSummary(r.Context())
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackMCPTools(summary.InstalledHarnesses),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    err.Error(),
		},
	})
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

	var results []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.searchTools", payload, &results)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    results,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.searchTools",
			},
		})
		return
	}

	_, summary, fallbackErr := s.localMCPSummary(r.Context())
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackSearchMCPTools(summary.InstalledHarnesses, query),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.searchTools",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPCallTool(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.callTool", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.callTool",
			},
		})
		return
	}

	fallbackResult, fallbackErr := s.localCallMCPMetaTool(r, payload)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.callTool",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPAutoCallTool(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var rawArgs map[string]any
	if err := json.NewDecoder(r.Body).Decode(&rawArgs); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}

	args := normalizeAutoCallArgs(rawArgs)
	payload := map[string]any{
		"name": "auto_call_tool",
		"args": args,
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.callTool", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.callTool",
			},
		})
		return
	}

	fallbackResult, fallbackErr := s.localCallMCPMetaTool(r, payload)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.callTool",
			"reason":    err.Error(),
		},
	})
}

func normalizeAutoCallArgs(input map[string]any) map[string]any {
	args := map[string]any{}
	for key, value := range input {
		args[key] = value
	}

	readString := func(keys ...string) string {
		for _, key := range keys {
			value, ok := input[key]
			if !ok {
				continue
			}
			text, ok := value.(string)
			if !ok {
				continue
			}
			trimmed := strings.TrimSpace(text)
			if trimmed != "" {
				return trimmed
			}
		}
		return ""
	}

	objective := readString("objective", "query", "task", "goal", "prompt", "instruction")
	if objective != "" {
		args["objective"] = objective
	}

	if contextValue := readString("context", "details", "description", "notes"); contextValue != "" {
		args["context"] = contextValue
	} else {
		contextParts := make([]string, 0, 4)
		for _, key := range []string{"path", "file", "filePath", "selection", "cwd"} {
			if value := readString(key); value != "" {
				contextParts = append(contextParts, key+": "+value)
			}
		}
		if len(contextParts) > 0 {
			args["context"] = strings.Join(contextParts, "; ")
		}
	}

	return args
}

func (s *Server) handleMCPToolAdvertisements(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	goal := strings.TrimSpace(r.URL.Query().Get("goal"))
	objective := strings.TrimSpace(r.URL.Query().Get("objective"))
	if query == "" {
		query = strings.TrimSpace(strings.Join([]string{objective, goal}, " "))
	}

	limit := 8
	if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 && parsed <= 32 {
			limit = parsed
		}
	}

	toolSuggestions, err := s.buildToolSuggestionSnapshotWithLimit(r, query, limit)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"recommendedTools": toolSuggestions.RecommendedTools,
			"relatedTools":     toolSuggestions.RelatedTools,
		},
		"bridge": map[string]any{
			"recommendedTools": toolSuggestions.Bridge["recommendedTools"],
			"relatedTools":     toolSuggestions.Bridge["relatedTools"],
		},
	})
}

func (s *Server) handleMCPToolSchema(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getToolSchema", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getToolSchema",
			},
		})
		return
	}

	fallbackResult, fallbackErr := localFallbackToolSchema(payload)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getToolSchema",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPToolPreferences(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		var preferences map[string]any
		upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getToolPreferences", nil, &preferences)
		if err == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data":    preferences,
				"bridge": map[string]any{
					"upstreamBase": upstreamBase,
					"procedure":    "mcp.getToolPreferences",
				},
			})
			return
		}

		fallbackPreferences, fallbackErr := s.localToolPreferences()
		if fallbackErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{
				"success": false,
				"error":   err.Error(),
				"detail":  fallbackErr.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackPreferences,
			"bridge": map[string]any{
				"fallback":  "go-local-jsonc",
				"procedure": "mcp.getToolPreferences",
				"reason":    err.Error(),
			},
		})
	case http.MethodPost:
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid JSON body",
			})
			return
		}

		var result map[string]any
		upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.setToolPreferences", payload, &result)
		if err == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data":    result,
				"bridge": map[string]any{
					"upstreamBase": upstreamBase,
					"procedure":    "mcp.setToolPreferences",
				},
			})
			return
		}

		fallbackPreferences, fallbackErr := s.saveLocalToolPreferences(payload)
		if fallbackErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{
				"success": false,
				"error":   err.Error(),
				"detail":  fallbackErr.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackPreferences,
			"bridge": map[string]any{
				"fallback":  "go-local-jsonc",
				"procedure": "mcp.setToolPreferences",
				"reason":    err.Error(),
			},
		})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
	}
}

func (s *Server) handleMCPTraffic(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.traffic", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.traffic",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.traffic",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPToolSelectionTelemetry(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getToolSelectionTelemetry", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getToolSelectionTelemetry",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getToolSelectionTelemetry",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPClearToolSelectionTelemetry(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.clearToolSelectionTelemetry", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.clearToolSelectionTelemetry",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"ok": true,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.clearToolSelectionTelemetry",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPServerTest(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.runServerTest", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.runServerTest",
			},
		})
		return
	}

	startedAt := time.Now()
	targetKind, _ := payload["targetKind"].(string)
	operation, _ := payload["operation"].(string)
	serverName, _ := payload["serverName"].(string)
	toolName, _ := payload["toolName"].(string)
	args, _ := payload["args"].(map[string]any)
	if args == nil {
		args = map[string]any{}
	}

	requestPayload := map[string]any{
		"jsonrpc": "2.0",
		"id":      "probe-go-local",
		"method":  operation,
		"params": func() map[string]any {
			if operation == "tools/call" {
				return map[string]any{"name": toolName, "arguments": args}
			}
			return map[string]any{}
		}(),
		"target": func() string {
			if targetKind == "router" {
				return "hypercode-router"
			}
			if strings.TrimSpace(serverName) != "" {
				return serverName
			}
			return "unknown-server"
		}(),
		"via": func() string {
			if targetKind == "router" {
				return "hypercode-router"
			}
			return "direct-downstream"
		}(),
	}

	buildFailure := func(summary string, payloadBody map[string]any) map[string]any {
		endedAt := time.Now()
		return map[string]any{
			"success": false,
			"target": map[string]any{
				"kind": targetKind,
				"displayName": func() string {
					if targetKind == "router" {
						return "HyperCode router"
					}
					if strings.TrimSpace(serverName) != "" {
						return serverName
					}
					return "Unknown downstream server"
				}(),
				"serverName": nullableString(serverName),
				"via":        requestPayload["via"],
			},
			"operation": operation,
			"startedAt": startedAt.UnixMilli(),
			"endedAt":   endedAt.UnixMilli(),
			"latencyMs": endedAt.Sub(startedAt).Milliseconds(),
			"request":   requestPayload,
			"response": map[string]any{
				"summary": summary,
				"payload": payloadBody,
			},
			"trafficEvents": []map[string]any{},
		}
	}

	switch {
	case targetKind == "server" && strings.TrimSpace(serverName) == "":
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    buildFailure("Downstream probe requires a server name.", map[string]any{"error": "Downstream probe requires a server name."}),
			"bridge":  map[string]any{"fallback": "go-local-mcp", "procedure": "mcp.runServerTest", "reason": err.Error()},
		})
		return
	case operation == "tools/call" && strings.TrimSpace(toolName) == "":
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    buildFailure("Tool call probe requires a tool name.", map[string]any{"error": "Tool call probe requires a tool name."}),
			"bridge":  map[string]any{"fallback": "go-local-mcp", "procedure": "mcp.runServerTest", "reason": err.Error()},
		})
		return
	case targetKind == "router":
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    buildFailure("HyperCode MCP router is not initialized.", map[string]any{"error": "HyperCode MCP router is not initialized."}),
			"bridge":  map[string]any{"fallback": "go-local-mcp", "procedure": "mcp.runServerTest", "reason": err.Error()},
		})
		return
	default:
		message := "Downstream server '" + serverName + "' is not currently connected."
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    buildFailure(message, map[string]any{"error": message}),
			"bridge":  map[string]any{"fallback": "go-local-mcp", "procedure": "mcp.runServerTest", "reason": err.Error()},
		})
		return
	}
}

func (s *Server) handleMCPSetLifecycleModes(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	if value, ok := payload["lazySessionMode"].(bool); ok {
		s.lifecycleModes["lazySessionMode"] = value
	}
	if value, ok := payload["singleActiveServerMode"].(bool); ok {
		s.lifecycleModes["singleActiveServerMode"] = value
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.setLifecycleModes", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.setLifecycleModes",
			},
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"ok": true,
			"lifecycle": map[string]any{
				"lazySessionMode":        s.lifecycleModes["lazySessionMode"],
				"singleActiveServerMode": s.lifecycleModes["singleActiveServerMode"],
			},
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.setLifecycleModes",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPAddServer(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcp.addServer", func(payload map[string]any) (any, error) {
		result, err := s.localCreateConfiguredServer(payload)
		if err != nil {
			return nil, err
		}
		name, _ := payload["name"].(string)
		return map[string]any{
			"success": true,
			"name":    name,
			"server":  result,
		}, nil
	})
}

func (s *Server) handleMCPRemoveServer(w http.ResponseWriter, r *http.Request) {
	s.handleConfiguredServerMutation(w, r, "mcp.removeServer", func(payload map[string]any) (any, error) {
		if _, err := s.localDeleteConfiguredServer(payload); err != nil {
			return nil, err
		}
		return map[string]any{
			"success": true,
		}, nil
	})
}

func (s *Server) handleMCPJsoncConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		var editor map[string]any
		upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getJsoncEditor", nil, &editor)
		if err == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data":    editor,
				"bridge": map[string]any{
					"upstreamBase": upstreamBase,
					"procedure":    "mcp.getJsoncEditor",
				},
			})
			return
		}

		editor, fallbackErr := s.localMCPJsoncEditor()
		if fallbackErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{
				"success": false,
				"error":   err.Error(),
				"detail":  fallbackErr.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    editor,
			"bridge": map[string]any{
				"fallback":  "go-local-jsonc",
				"procedure": "mcp.getJsoncEditor",
				"reason":    err.Error(),
			},
		})
	case http.MethodPost:
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid JSON body",
			})
			return
		}

		var result map[string]any
		upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.saveJsoncEditor", payload, &result)
		if err == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data":    result,
				"bridge": map[string]any{
					"upstreamBase": upstreamBase,
					"procedure":    "mcp.saveJsoncEditor",
				},
			})
			return
		}

		content, _ := payload["content"].(string)
		if strings.TrimSpace(content) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "missing content",
			})
			return
		}
		if fallbackErr := s.saveLocalMCPJsonc(content); fallbackErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{
				"success": false,
				"error":   err.Error(),
				"detail":  fallbackErr.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data": map[string]any{
				"ok": true,
			},
			"bridge": map[string]any{
				"fallback":  "go-local-jsonc",
				"procedure": "mcp.saveJsoncEditor",
				"reason":    err.Error(),
			},
		})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
	}
}

func (s *Server) handleMCPWorkingSet(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getWorkingSet", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getWorkingSet",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"limits": map[string]any{
				"maxLoadedTools":          0,
				"maxHydratedSchemas":      0,
				"idleEvictionThresholdMs": 0,
			},
			"tools": []map[string]any{},
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getWorkingSet",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPWorkingSetEvictions(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getWorkingSetEvictionHistory", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getWorkingSetEvictionHistory",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getWorkingSetEvictionHistory",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPClearWorkingSetEvictions(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.clearWorkingSetEvictionHistory", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.clearWorkingSetEvictionHistory",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"ok":      true,
			"message": "MCP server unavailable; eviction history already empty.",
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.clearWorkingSetEvictionHistory",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPLoadTool(w http.ResponseWriter, r *http.Request) {
	s.handleMCPManualToolMutation(w, r, "mcp.loadTool")
}

func (s *Server) handleMCPUnloadTool(w http.ResponseWriter, r *http.Request) {
	s.handleMCPManualToolMutation(w, r, "mcp.unloadTool")
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
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.query", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.query",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.query",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryContexts(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.listContexts", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.listContexts",
			},
		})
		return
	}

	contexts, fallbackErr := s.localMemoryContexts()
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    contexts,
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.listContexts",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryContextSave(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "memory.saveContext")
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
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getContext", map[string]any{"id": id}, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getContext",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    nil,
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getContext",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryContextDelete(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.deleteContext", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "memory.deleteContext"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"success": false}, "bridge": map[string]any{"fallback": "go-local-memory", "procedure": "memory.deleteContext", "reason": err.Error()}})
}

func (s *Server) handleMemoryAgentStats(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getAgentStats", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getAgentStats",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"totalCount":             0,
			"sessionCount":           0,
			"workingCount":           0,
			"longTermCount":          0,
			"observationCount":       0,
			"uniqueObservationCount": 0,
			"promptCount":            0,
			"sessionSummaryCount":    0,
			"session":                0,
			"working":                0,
			"long_term":              0,
			"user":                   0,
			"agent":                  0,
			"project":                0,
			"discovery":              0,
			"decision":               0,
			"progress":               0,
			"warning":                0,
			"fix":                    0,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getAgentStats",
			"reason":    err.Error(),
		},
	})
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
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.searchAgentMemory", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.searchAgentMemory",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.searchAgentMemory",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryAddFact(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.addFact", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "memory.addFact"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"success": false}, "bridge": map[string]any{"fallback": "go-local-memory", "procedure": "memory.addFact", "reason": err.Error()}})
}

func (s *Server) handleMemoryRecordObservation(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.recordObservation", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "memory.recordObservation"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"success": false}, "bridge": map[string]any{"fallback": "go-local-memory", "procedure": "memory.recordObservation", "reason": err.Error()}})
}

func (s *Server) handleMemoryRecentObservations(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{"limit": 10}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if namespace := strings.TrimSpace(r.URL.Query().Get("namespace")); namespace != "" {
		payload["namespace"] = namespace
	}
	if observationType := strings.TrimSpace(r.URL.Query().Get("type")); observationType != "" {
		payload["type"] = observationType
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getRecentObservations", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getRecentObservations",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getRecentObservations",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemorySearchObservations(w http.ResponseWriter, r *http.Request) {
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
	if namespace := strings.TrimSpace(r.URL.Query().Get("namespace")); namespace != "" {
		payload["namespace"] = namespace
	}
	if observationType := strings.TrimSpace(r.URL.Query().Get("type")); observationType != "" {
		payload["type"] = observationType
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.searchObservations", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.searchObservations",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.searchObservations",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryCaptureUserPrompt(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.captureUserPrompt", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "memory.captureUserPrompt"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"success": false}, "bridge": map[string]any{"fallback": "go-local-memory", "procedure": "memory.captureUserPrompt", "reason": err.Error()}})
}

func (s *Server) handleMemoryRecentUserPrompts(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{"limit": 10}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if role := strings.TrimSpace(r.URL.Query().Get("role")); role != "" {
		payload["role"] = role
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getRecentUserPrompts", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getRecentUserPrompts",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getRecentUserPrompts",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemorySearchUserPrompts(w http.ResponseWriter, r *http.Request) {
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
	if role := strings.TrimSpace(r.URL.Query().Get("role")); role != "" {
		payload["role"] = role
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.searchUserPrompts", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.searchUserPrompts",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.searchUserPrompts",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemorySearchPivot(w http.ResponseWriter, r *http.Request) {
	s.handleReadOnlyMemoryBodyFallback(w, r, "memory.searchMemoryPivot")
}

func (s *Server) handleMemoryTimelineWindow(w http.ResponseWriter, r *http.Request) {
	s.handleReadOnlyMemoryBodyFallback(w, r, "memory.getMemoryTimelineWindow")
}

func (s *Server) handleMemoryCrossSessionLinks(w http.ResponseWriter, r *http.Request) {
	s.handleReadOnlyMemoryBodyFallback(w, r, "memory.getCrossSessionMemoryLinks")
}

func (s *Server) handleMemorySessionBootstrap(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if activeGoal := strings.TrimSpace(r.URL.Query().Get("activeGoal")); activeGoal != "" {
		payload["activeGoal"] = activeGoal
	}
	if lastObjective := strings.TrimSpace(r.URL.Query().Get("lastObjective")); lastObjective != "" {
		payload["lastObjective"] = lastObjective
	}

	var result map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getSessionBootstrap", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getSessionBootstrap",
			},
		})
		return
	}

	activeGoal, _ := payload["activeGoal"].(string)
	lastObjective, _ := payload["lastObjective"].(string)
	promptParts := make([]string, 0, 3)
	promptParts = append(promptParts, "Memory bootstrap:")
	if strings.TrimSpace(activeGoal) != "" {
		promptParts = append(promptParts, "Current goal: "+activeGoal)
	}
	if strings.TrimSpace(lastObjective) != "" {
		promptParts = append(promptParts, "Last objective: "+lastObjective)
	}
	promptParts = append(promptParts, "No relevant prior memory was found.")
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"activeGoal":             activeGoal,
			"lastObjective":          lastObjective,
			"goal":                   activeGoal,
			"objective":              lastObjective,
			"summaryCount":           0,
			"observationCount":       0,
			"toolAdvertisementCount": 0,
			"prompt":                 strings.Join(promptParts, "\n"),
		},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getSessionBootstrap",
			"reason":    err.Error(),
		},
	})
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

	var result map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getToolContext", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getToolContext",
			},
		})
		return
	}

	query := toolName
	if lastObjective, _ := payload["lastObjective"].(string); strings.TrimSpace(lastObjective) != "" {
		query = strings.TrimSpace(strings.Join([]string{toolName, lastObjective}, " "))
	}
	if activeGoal, _ := payload["activeGoal"].(string); strings.TrimSpace(activeGoal) != "" {
		query = strings.TrimSpace(strings.Join([]string{query, activeGoal}, " "))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"toolName":         toolName,
			"query":            query,
			"matchedPaths":     []string{},
			"observationCount": 0,
			"summaryCount":     0,
			"prompt":           "JIT tool context for " + toolName + ":\nNo relevant prior memory was found.",
		},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getToolContext",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryCaptureSessionSummary(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.captureSessionSummary", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "memory.captureSessionSummary"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"success": false}, "bridge": map[string]any{"fallback": "go-local-memory", "procedure": "memory.captureSessionSummary", "reason": err.Error()}})
}

func (s *Server) handleMemoryRecentSessionSummaries(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{"limit": 10}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getRecentSessionSummaries", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getRecentSessionSummaries",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getRecentSessionSummaries",
			"reason":    err.Error(),
		},
	})
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
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.searchSessionSummaries", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.searchSessionSummaries",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.searchSessionSummaries",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemorySectionedStatus(w http.ResponseWriter, r *http.Request) {
	var result map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getSectionedMemoryStatus", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getSectionedMemoryStatus",
			},
		})
		return
	}

	status, fallbackErr := memorystore.ReadStatus(s.cfg.WorkspaceRoot)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error(), "detail": fallbackErr.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"available": status.Exists,
			"sections":  status.Sections,
			"storePath": status.StorePath,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getSectionedMemoryStatus",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMemoryInterchangeFormats(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.listInterchangeFormats", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.listInterchangeFormats",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []string{"json", "markdown"},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.listInterchangeFormats",
			"reason":    err.Error(),
		},
	})
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
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var skills []map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "skills.list", nil, &skills)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    skills,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "skills.list",
			},
		})
		return
	}

	fallbackSkills, fallbackErr := s.localSkillsMetadata()
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error(), "detail": fallbackErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackSkills,
		"bridge": map[string]any{
			"fallback":  "go-local-skills",
			"procedure": "skills.list",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleSkillsSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var rawSkills []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Path string `json:"path"`
	}
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "skills.list", nil, &rawSkills)
	if err == nil {
		query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("query")))
		summaries := make([]SkillSummary, 0, len(rawSkills))
		for _, skill := range rawSkills {
			folder := strings.TrimSpace(filepath.Base(filepath.Dir(skill.Path)))
			if folder == "." || folder == string(filepath.Separator) {
				folder = ""
			}
			summary := SkillSummary{
				ID:     skill.ID,
				Name:   skill.Name,
				Folder: folder,
			}
			if query != "" {
				haystack := strings.ToLower(strings.Join([]string{summary.ID, summary.Name, summary.Folder}, " "))
				if !strings.Contains(haystack, query) {
					continue
				}
			}
			summaries = append(summaries, summary)
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    summaries,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "skills.list",
			},
		})
		return
	}

	fallbackSummaries, fallbackErr := s.localSkillSummaries(strings.TrimSpace(r.URL.Query().Get("query")))
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error(), "detail": fallbackErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackSummaries,
		"bridge": map[string]any{
			"fallback":  "go-local-skills",
			"procedure": "skills.list",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleSkillsRead(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing name query parameter"})
		return
	}

	var result map[string]any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "skills.read", map[string]any{"name": name}, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "skills.read",
			},
		})
		return
	}

	fallbackResult, fallbackErr := s.localReadSkill(name)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error(), "detail": fallbackErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-skills",
			"procedure": "skills.read",
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleSkillsCreate(w http.ResponseWriter, r *http.Request) {
	s.handleSkillMutation(w, r, "skills.create", func(payload map[string]any) (any, error) {
		return s.localCreateSkill(payload)
	})
}

func (s *Server) handleSkillsSave(w http.ResponseWriter, r *http.Request) {
	s.handleSkillMutation(w, r, "skills.save", func(payload map[string]any) (any, error) {
		return s.localSaveSkill(payload)
	})
}

func (s *Server) handleSkillsAssimilate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "skills.assimilate")
}

func (s *Server) handleSkillMutation(w http.ResponseWriter, r *http.Request, procedure string, fallback func(map[string]any) (any, error)) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), procedure, payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    procedure,
			},
		})
		return
	}

	fallbackResult, fallbackErr := fallback(payload)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error(), "detail": fallbackErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-skills",
			"procedure": procedure,
			"reason":    err.Error(),
		},
	})
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

func (s *Server) handleConfiguredServerMutation(w http.ResponseWriter, r *http.Request, procedure string, fallback func(map[string]any) (any, error)) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false,
			"error":   "method not allowed",
		})
		return
	}

	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid JSON body",
		})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), procedure, payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    procedure,
			},
		})
		return
	}

	fallbackResult, fallbackErr := fallback(payload)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackResult,
		"bridge": map[string]any{
			"fallback":  "go-local-jsonc",
			"procedure": procedure,
			"reason":    err.Error(),
		},
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
			Service:   "hypercode-go",
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

func (s *Server) localMCPSummary(ctx context.Context) ([]controlplane.Tool, CLISummary, error) {
	tools, err := s.detector.DetectAll(ctx)
	if err != nil {
		return nil, CLISummary{}, err
	}
	summary := summarizeCLI(s.cfg.WorkspaceRoot, tools)
	return tools, summary, nil
}

func sourceBackedInstalledHarnesses(definitions []harnesses.Definition) []harnesses.Definition {
	filtered := make([]harnesses.Definition, 0, len(definitions))
	for _, definition := range definitions {
		if !definition.Installed || definition.ToolInventoryStatus != "source-backed" {
			continue
		}
		filtered = append(filtered, definition)
	}
	return filtered
}

func sourceBackedToolCount(definitions []harnesses.Definition) int {
	total := 0
	for _, definition := range definitions {
		if !definition.Installed || definition.ToolInventoryStatus != "source-backed" {
			continue
		}
		total += definition.ToolCallCount
	}
	return total
}

func fallbackRuntimeServers(definitions []harnesses.Definition) []map[string]any {
	servers := make([]map[string]any, 0)
	for _, definition := range sourceBackedInstalledHarnesses(definitions) {
		servers = append(servers, map[string]any{
			"name":                definition.ID,
			"runtimeConnected":    false,
			"toolCount":           definition.ToolCallCount,
			"toolInventoryStatus": definition.ToolInventoryStatus,
			"integrationLevel":    definition.IntegrationLevel,
			"source":              definition.ToolSource,
		})
	}
	return servers
}

func fallbackMCPTools(definitions []harnesses.Definition) []map[string]any {
	tools := make([]map[string]any, 0)
	for _, definition := range sourceBackedInstalledHarnesses(definitions) {
		for _, name := range definition.ToolCallNames {
			tools = append(tools, map[string]any{
				"name":         name,
				"server":       definition.ID,
				"alwaysOn":     false,
				"alwaysShow":   false,
				"source":       definition.ToolSource,
				"availability": "source-backed",
			})
		}
	}
	sort.Slice(tools, func(i, j int) bool {
		leftServer, _ := tools[i]["server"].(string)
		rightServer, _ := tools[j]["server"].(string)
		if leftServer == rightServer {
			leftName, _ := tools[i]["name"].(string)
			rightName, _ := tools[j]["name"].(string)
			return leftName < rightName
		}
		return leftServer < rightServer
	})
	return tools
}

func fallbackSearchMCPTools(definitions []harnesses.Definition, query string) []map[string]any {
	allTools := fallbackMCPTools(definitions)
	terms := strings.Fields(strings.ToLower(query))
	if len(terms) == 0 {
		if len(allTools) > 8 {
			return allTools[:8]
		}
		return allTools
	}

	type rankedTool struct {
		tool  map[string]any
		score int
	}
	ranked := make([]rankedTool, 0, len(allTools))
	for _, tool := range allTools {
		name, _ := tool["name"].(string)
		server, _ := tool["server"].(string)
		haystack := strings.ToLower(name + " " + server)
		score := 0
		for _, term := range terms {
			if term == "" {
				continue
			}
			if strings.Contains(haystack, term) {
				score++
			}
		}
		if score == 0 {
			continue
		}
		ranked = append(ranked, rankedTool{
			tool:  tool,
			score: score,
		})
	}

	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].score == ranked[j].score {
			leftName, _ := ranked[i].tool["name"].(string)
			rightName, _ := ranked[j].tool["name"].(string)
			return leftName < rightName
		}
		return ranked[i].score > ranked[j].score
	})

	results := make([]map[string]any, 0, len(ranked))
	for _, item := range ranked {
		name, _ := item.tool["name"].(string)
		server, _ := item.tool["server"].(string)
		results = append(results, map[string]any{
			"name":        name,
			"server":      server,
			"alwaysShow":  false,
			"matchReason": "Matched local source-backed tool inventory.",
			"score":       item.score,
		})
	}
	return results
}

func (s *Server) localCallMCPMetaTool(r *http.Request, payload map[string]any) (map[string]any, error) {
	name, _ := payload["name"].(string)
	args, _ := payload["args"].(map[string]any)
	if args == nil {
		args = map[string]any{}
	}

	switch name {
	case "search_tools":
		query, _ := args["query"].(string)
		_, summary, err := s.localMCPSummary(r.Context())
		if err != nil {
			return nil, err
		}
		results := fallbackSearchMCPTools(summary.InstalledHarnesses, query)
		return map[string]any{
			"ok": true,
			"result": map[string]any{
				"content": []map[string]any{
					{
						"type": "text",
						"text": prettyJSON(results),
					},
				},
			},
		}, nil
	case "list_all_tools":
		_, summary, err := s.localMCPSummary(r.Context())
		if err != nil {
			return nil, err
		}
		results := fallbackMCPTools(summary.InstalledHarnesses)
		return map[string]any{
			"ok": true,
			"result": map[string]any{
				"content": []map[string]any{
					{
						"type": "text",
						"text": prettyJSON(results),
					},
				},
			},
		}, nil
	case "auto_call_tool":
		normalized := normalizeAutoCallArgs(args)
		objective, _ := normalized["objective"].(string)
		if strings.TrimSpace(objective) == "" {
			return map[string]any{
				"ok": false,
				"result": map[string]any{
					"content": []map[string]any{
						{
							"type": "text",
							"text": "Objective is required for auto_call_tool.",
						},
					},
				},
			}, nil
		}
		_, summary, err := s.localMCPSummary(r.Context())
		if err != nil {
			return nil, err
		}
		searchResults := fallbackSearchMCPTools(summary.InstalledHarnesses, objective)
		chosen := "list_all_tools"
		if len(searchResults) > 0 {
			if toolName, ok := searchResults[0]["name"].(string); ok && strings.TrimSpace(toolName) != "" {
				chosen = toolName
			}
		}
		return map[string]any{
			"ok": true,
			"result": map[string]any{
				"content": []map[string]any{
					{
						"type": "text",
						"text": "[Auto-Execution Logic: Chose " + chosen + "]\n--- Result ---\nLocal fallback can recommend tools but cannot execute non-meta MCP tools without the TypeScript bridge.",
					},
				},
			},
		}, nil
	default:
		return nil, errors.New("unsupported tool fallback: " + name)
	}
}

func localFallbackToolSchema(payload map[string]any) (map[string]any, error) {
	name, _ := payload["name"].(string)
	switch name {
	case "search_tools":
		return map[string]any{
			"inputSchema": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{
						"type":        "string",
						"description": "Tool intent or keyword search query.",
					},
					"limit": map[string]any{
						"type":        "number",
						"description": "Maximum number of results to return (default 10).",
					},
				},
				"required": []string{"query"},
			},
			"evictedHydratedTools": []any{},
		}, nil
	case "list_all_tools":
		return map[string]any{
			"inputSchema": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{
						"type":        "string",
						"description": "Optional keyword filter applied across tool names, descriptions, server names, and advertised names.",
					},
					"limit": map[string]any{
						"type":        "number",
						"description": "Maximum number of tools to return after filtering. Defaults to 100.",
					},
					"category": map[string]any{
						"type":        "string",
						"description": "Optional category filter.",
						"enum":        []string{"all", "meta", "compatibility", "native", "saved-script", "downstream"},
					},
				},
			},
			"evictedHydratedTools": []any{},
		}, nil
	case "auto_call_tool":
		return map[string]any{
			"inputSchema": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"objective": map[string]any{
						"type":        "string",
						"description": "The objective or task you want to accomplish using a tool.",
					},
					"context": map[string]any{
						"type":        "string",
						"description": "Any necessary variables, file paths, or text snippets required to fill the tool arguments.",
					},
				},
				"required": []string{"objective", "context"},
			},
			"evictedHydratedTools": []any{},
		}, nil
	default:
		return nil, errors.New("unsupported tool schema fallback: " + name)
	}
}

func (s *Server) localMCPRegistrySnapshot() ([]map[string]any, error) {
	indexPath := filepath.Join(s.cfg.WorkspaceRoot, "BORG_MASTER_INDEX.jsonc")
	content, err := os.ReadFile(indexPath)
	if err != nil {
		return nil, err
	}

	sanitized := stripJSONCLineComments(string(content))
	var parsed struct {
		Categories map[string][]map[string]any `json:"categories"`
	}
	if err := json.Unmarshal([]byte(sanitized), &parsed); err != nil {
		return nil, err
	}

	results := make([]map[string]any, 0)
	seenByURL := make(map[string]struct{})
	for category, items := range parsed.Categories {
		for _, item := range items {
			url, _ := item["url"].(string)
			if strings.TrimSpace(url) == "" {
				continue
			}
			if _, seen := seenByURL[url]; seen {
				continue
			}
			if !isMCPLikeRegistryEntry(category, item) {
				continue
			}
			seenByURL[url] = struct{}{}

			name, _ := item["name"].(string)
			if strings.TrimSpace(name) == "" {
				name, _ = item["id"].(string)
			}
			if strings.TrimSpace(name) == "" {
				name = url
			}
			description, _ := item["description"].(string)
			if strings.TrimSpace(description) == "" {
				description, _ = item["summary"].(string)
			}
			if strings.TrimSpace(description) == "" {
				description = "No description available."
			}

			tags := make([]string, 0)
			if rawTags, ok := item["tags"].([]any); ok {
				for _, rawTag := range rawTags {
					tag, _ := rawTag.(string)
					if strings.TrimSpace(tag) == "" {
						continue
					}
					tags = append(tags, strings.ToLower(tag))
				}
			}
			id, _ := item["id"].(string)
			if strings.TrimSpace(id) == "" {
				id = url
			}
			results = append(results, map[string]any{
				"id":          id,
				"name":        name,
				"url":         url,
				"category":    category,
				"description": description,
				"tags":        tags,
			})
		}
	}

	sort.Slice(results, func(i, j int) bool {
		leftName, _ := results[i]["name"].(string)
		rightName, _ := results[j]["name"].(string)
		return leftName < rightName
	})
	if len(results) > 300 {
		results = results[:300]
	}
	return results, nil
}

func isMCPLikeRegistryEntry(category string, item map[string]any) bool {
	url, _ := item["url"].(string)
	kind, _ := item["kind"].(string)
	if strings.Contains(strings.ToLower(category), "mcp") || strings.Contains(strings.ToLower(kind), "mcp") || strings.Contains(strings.ToLower(url), "modelcontextprotocol") || strings.Contains(strings.ToLower(url), "mcp") {
		return true
	}
	if rawTags, ok := item["tags"].([]any); ok {
		for _, rawTag := range rawTags {
			tag, _ := rawTag.(string)
			if strings.Contains(strings.ToLower(tag), "mcp") {
				return true
			}
		}
	}
	return false
}

func (s *Server) localMCPJsoncEditor() (map[string]any, error) {
	jsoncPath := filepath.Join(s.cfg.MainConfigDir, "mcp.jsonc")
	content, err := os.ReadFile(jsoncPath)
	if err == nil {
		return map[string]any{
			"path":    jsoncPath,
			"content": string(content),
		}, nil
	}
	if !os.IsNotExist(err) {
		return nil, err
	}

	fallback := map[string]any{
		"mcpServers": map[string]any{},
	}
	return map[string]any{
		"path":    jsoncPath,
		"content": "// HyperCode MCP configuration\n" + prettyJSON(fallback) + "\n",
	}, nil
}

func (s *Server) saveLocalMCPJsonc(content string) error {
	sanitized := stripJSONCLineComments(content)
	var parsed map[string]any
	if err := json.Unmarshal([]byte(sanitized), &parsed); err != nil {
		return err
	}
	if _, ok := parsed["mcpServers"]; !ok {
		parsed["mcpServers"] = map[string]any{}
	}

	jsoncPath := filepath.Join(s.cfg.MainConfigDir, "mcp.jsonc")
	jsonPath := filepath.Join(s.cfg.MainConfigDir, "mcp.json")
	if err := os.MkdirAll(s.cfg.MainConfigDir, 0o755); err != nil {
		return err
	}

	jsoncBody := "// HyperCode MCP configuration\n// This file is HyperCode-owned and may include cached server metadata under mcpServers.<name>._meta.\n" + prettyJSON(parsed) + "\n"
	if err := os.WriteFile(jsoncPath, []byte(jsoncBody), 0o644); err != nil {
		return err
	}

	compatibility := make(map[string]any, len(parsed))
	for key, value := range parsed {
		if key == "settings" {
			continue
		}
		if key == "mcpServers" {
			compatibility[key] = stripServerMeta(value)
			continue
		}
		compatibility[key] = value
	}
	return os.WriteFile(jsonPath, []byte(prettyJSON(compatibility)+"\n"), 0o644)
}

func (s *Server) localMemoryContexts() ([]map[string]any, error) {
	contextsPath := filepath.Join(s.cfg.WorkspaceRoot, ".hypercode", "memory", "contexts.json")
	raw, err := os.ReadFile(contextsPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []map[string]any{}, nil
		}
		return nil, err
	}

	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return []map[string]any{}, nil
	}

	var contexts []map[string]any
	if err := json.Unmarshal(raw, &contexts); err != nil {
		return nil, err
	}
	return contexts, nil
}

func (s *Server) handleReadOnlyMemoryBodyFallback(w http.ResponseWriter, r *http.Request, procedure string) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), procedure, payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    procedure,
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": procedure,
			"reason":    err.Error(),
		},
	})
}

func (s *Server) handleMCPManualToolMutation(w http.ResponseWriter, r *http.Request, procedure string) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), procedure, payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    procedure,
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"ok":      false,
			"message": "MCP Server not initialized",
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": procedure,
			"reason":    err.Error(),
		},
	})
}

func (s *Server) localConfiguredMCPServers() ([]map[string]any, error) {
	editor, err := s.localMCPJsoncEditor()
	if err != nil {
		return nil, err
	}
	content, _ := editor["content"].(string)
	var parsed map[string]any
	if err := json.Unmarshal([]byte(stripJSONCLineComments(content)), &parsed); err != nil {
		return nil, err
	}

	rawServers, _ := parsed["mcpServers"].(map[string]any)
	results := make([]map[string]any, 0, len(rawServers))
	for name, rawServer := range rawServers {
		serverMap, _ := rawServer.(map[string]any)
		serverType, _ := serverMap["type"].(string)
		if serverType == "" {
			if url, _ := serverMap["url"].(string); strings.TrimSpace(url) != "" {
				serverType = "STREAMABLE_HTTP"
			} else {
				serverType = "STDIO"
			}
		}

		command := nullableString(serverMap["command"])
		url := nullableString(serverMap["url"])
		description := nullableString(serverMap["description"])
		args := stringSlice(serverMap["args"])
		env := stringMap(serverMap["env"])
		headers := stringMap(serverMap["headers"])
		alwaysOn, _ := serverMap["always_on"].(bool)
		if !alwaysOn {
			if metaMap, ok := serverMap["_meta"].(map[string]any); ok {
				if metaAlwaysOn, ok := metaMap["alwaysOn"].(bool); ok {
					alwaysOn = metaAlwaysOn
				}
			}
		}

		results = append(results, map[string]any{
			"uuid":                         syntheticServerUUID(name),
			"name":                         name,
			"description":                  description,
			"type":                         serverType,
			"command":                      command,
			"args":                         args,
			"env":                          env,
			"url":                          url,
			"error_status":                 "unknown",
			"created_at":                   nil,
			"bearerToken":                  nullableString(serverMap["bearerToken"]),
			"headers":                      headers,
			"always_on":                    alwaysOn,
			"user_id":                      nil,
			"source_published_server_uuid": nullableString(serverMap["source_published_server_uuid"]),
			"_meta":                        serverMap["_meta"],
		})
	}

	sort.Slice(results, func(i, j int) bool {
		leftName, _ := results[i]["name"].(string)
		rightName, _ := results[j]["name"].(string)
		return leftName < rightName
	})
	return results, nil
}

func (s *Server) localSkillsMetadata() ([]map[string]any, error) {
	skills, err := s.scanLocalSkills()
	if err != nil {
		return nil, err
	}
	results := make([]map[string]any, 0, len(skills))
	for _, skill := range skills {
		results = append(results, map[string]any{
			"id":          skill.ID,
			"name":        skill.Name,
			"description": skill.Description,
			"content":     skill.Content,
			"path":        skill.Path,
		})
	}
	return results, nil
}

func (s *Server) localSkillSummaries(query string) ([]SkillSummary, error) {
	skills, err := s.scanLocalSkills()
	if err != nil {
		return nil, err
	}
	query = strings.ToLower(strings.TrimSpace(query))
	results := make([]SkillSummary, 0, len(skills))
	for _, skill := range skills {
		summary := SkillSummary{
			ID:     skill.ID,
			Name:   skill.Name,
			Folder: filepath.Base(filepath.Dir(skill.Path)),
		}
		if query != "" {
			haystack := strings.ToLower(strings.Join([]string{summary.ID, summary.Name, summary.Folder}, " "))
			if !strings.Contains(haystack, query) {
				continue
			}
		}
		results = append(results, summary)
	}
	sort.Slice(results, func(i, j int) bool {
		if results[i].Folder == results[j].Folder {
			return results[i].Name < results[j].Name
		}
		return results[i].Folder < results[j].Folder
	})
	return results, nil
}

func (s *Server) localReadSkill(name string) (map[string]any, error) {
	skills, err := s.scanLocalSkills()
	if err != nil {
		return nil, err
	}
	for _, skill := range skills {
		if skill.ID == name || skill.Name == name || filepath.Base(filepath.Dir(skill.Path)) == name {
			return map[string]any{
				"content": []map[string]any{
					{
						"type": "text",
						"text": skill.Content,
					},
				},
			}, nil
		}
	}
	return map[string]any{
		"content": []map[string]any{
			{
				"type": "text",
				"text": "Skill '" + name + "' not found.",
			},
		},
	}, nil
}

func (s *Server) localCreateSkill(payload map[string]any) (map[string]any, error) {
	id, _ := payload["id"].(string)
	name, _ := payload["name"].(string)
	description, _ := payload["description"].(string)
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("missing skill id")
	}
	if strings.TrimSpace(name) == "" {
		name = id
	}
	skillDir := filepath.Join(s.localSkillRoots()[1], id)
	if err := os.MkdirAll(skillDir, 0o755); err != nil {
		return nil, err
	}
	skillFile := filepath.Join(skillDir, "SKILL.md")
	body := strings.TrimSpace(description)
	if body == "" {
		body = name
	}
	content := "---\nname: " + name + "\ndescription: " + description + "\n---\n\n# " + name + "\n\n" + body + "\n\n## Instructions\n1. ...\n"
	if err := os.WriteFile(skillFile, []byte(content), 0o644); err != nil {
		return nil, err
	}
	return map[string]any{
		"content": []map[string]any{
			{
				"type": "text",
				"text": "Created skill '" + name + "' at " + skillFile,
			},
		},
	}, nil
}

func (s *Server) localSaveSkill(payload map[string]any) (map[string]any, error) {
	id, _ := payload["id"].(string)
	content, _ := payload["content"].(string)
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("missing skill id")
	}
	skills, err := s.scanLocalSkills()
	if err != nil {
		return nil, err
	}
	for _, skill := range skills {
		if skill.ID != id {
			continue
		}
		if err := os.WriteFile(skill.Path, []byte(content), 0o644); err != nil {
			return nil, err
		}
		return map[string]any{
			"content": []map[string]any{
				{
					"type": "text",
					"text": "Saved skill '" + id + "'.",
				},
			},
		}, nil
	}
	return map[string]any{
		"content": []map[string]any{
			{
				"type": "text",
				"text": "Skill '" + id + "' not found.",
			},
		},
	}, nil
}

func (s *Server) localSkillRoots() []string {
	return []string{
		filepath.Join(s.cfg.WorkspaceRoot, "packages", "core", "src", "skills"),
		filepath.Join(s.cfg.WorkspaceRoot, ".hypercode", "skills"),
	}
}

type localSkillRecord struct {
	ID          string
	Name        string
	Description string
	Content     string
	Path        string
}

func (s *Server) scanLocalSkills() ([]localSkillRecord, error) {
	results := make([]localSkillRecord, 0)
	seen := make(map[string]struct{})
	for _, root := range s.localSkillRoots() {
		if strings.TrimSpace(root) == "" {
			continue
		}
		if _, err := os.Stat(root); err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			if !strings.EqualFold(d.Name(), "SKILL.md") {
				return nil
			}
			record, err := parseLocalSkill(path)
			if err != nil {
				return nil
			}
			if _, ok := seen[record.Path]; ok {
				return nil
			}
			seen[record.Path] = struct{}{}
			results = append(results, record)
			return nil
		})
		if err != nil {
			return nil, err
		}
	}
	sort.Slice(results, func(i, j int) bool {
		if results[i].ID == results[j].ID {
			return results[i].Path < results[j].Path
		}
		return results[i].ID < results[j].ID
	})
	return results, nil
}

func parseLocalSkill(path string) (localSkillRecord, error) {
	contentBytes, err := os.ReadFile(path)
	if err != nil {
		return localSkillRecord{}, err
	}
	raw := string(contentBytes)
	name := filepath.Base(filepath.Dir(path))
	description := "No description provided"
	body := raw
	if strings.HasPrefix(raw, "---\n") {
		parts := strings.SplitN(raw, "\n---\n", 2)
		if len(parts) == 2 {
			frontmatter := strings.TrimPrefix(parts[0], "---\n")
			body = parts[1]
			for _, line := range strings.Split(frontmatter, "\n") {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "name:") {
					value := strings.TrimSpace(strings.TrimPrefix(line, "name:"))
					if value != "" {
						name = value
					}
				}
				if strings.HasPrefix(line, "description:") {
					value := strings.TrimSpace(strings.TrimPrefix(line, "description:"))
					if value != "" {
						description = value
					}
				}
			}
		}
	}
	return localSkillRecord{
		ID:          name,
		Name:        name,
		Description: description,
		Content:     body,
		Path:        path,
	}, nil
}

func (s *Server) localCreateConfiguredServer(payload map[string]any) (any, error) {
	name, _ := payload["name"].(string)
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("missing server name")
	}
	config, err := s.readLocalMCPConfigObject()
	if err != nil {
		return nil, err
	}
	servers, _ := config["mcpServers"].(map[string]any)
	if servers == nil {
		servers = map[string]any{}
	}
	servers[name] = configuredServerEntryFromPayload(payload)
	config["mcpServers"] = servers
	if err := s.writeLocalMCPConfigObject(config); err != nil {
		return nil, err
	}
	return s.localConfiguredServerByName(name)
}

func (s *Server) localUpdateConfiguredServer(payload map[string]any) (any, error) {
	uuid, _ := payload["uuid"].(string)
	config, err := s.readLocalMCPConfigObject()
	if err != nil {
		return nil, err
	}
	servers, _ := config["mcpServers"].(map[string]any)
	if servers == nil {
		return nil, errors.New("no configured servers")
	}
	targetName := strings.TrimSpace(nameForSyntheticUUID(servers, uuid))
	if targetName == "" {
		return nil, errors.New("configured server not found")
	}

	current, _ := servers[targetName].(map[string]any)
	if current == nil {
		current = map[string]any{}
	}
	nextName := targetName
	if updatedName, ok := payload["name"].(string); ok && strings.TrimSpace(updatedName) != "" {
		nextName = updatedName
	}
	updated := mergeConfiguredServerEntry(current, payload)
	delete(servers, targetName)
	servers[nextName] = updated
	config["mcpServers"] = servers
	if err := s.writeLocalMCPConfigObject(config); err != nil {
		return nil, err
	}
	return s.localConfiguredServerByName(nextName)
}

func (s *Server) localDeleteConfiguredServer(payload map[string]any) (any, error) {
	uuid, _ := payload["uuid"].(string)
	config, err := s.readLocalMCPConfigObject()
	if err != nil {
		return nil, err
	}
	servers, _ := config["mcpServers"].(map[string]any)
	if servers == nil {
		return map[string]any{"ok": true}, nil
	}
	targetName := strings.TrimSpace(nameForSyntheticUUID(servers, uuid))
	if targetName == "" {
		return map[string]any{"ok": true}, nil
	}
	delete(servers, targetName)
	config["mcpServers"] = servers
	if err := s.writeLocalMCPConfigObject(config); err != nil {
		return nil, err
	}
	return map[string]any{"ok": true}, nil
}

func (s *Server) localReloadConfiguredServerMetadata(payload map[string]any) (any, error) {
	uuid, _ := payload["uuid"].(string)
	mode, _ := payload["mode"].(string)
	if strings.TrimSpace(mode) == "" {
		mode = "binary"
	}
	config, err := s.readLocalMCPConfigObject()
	if err != nil {
		return nil, err
	}
	servers, _ := config["mcpServers"].(map[string]any)
	if servers == nil {
		return nil, errors.New("no configured servers")
	}
	targetName := strings.TrimSpace(nameForSyntheticUUID(servers, uuid))
	if targetName == "" {
		return nil, errors.New("configured server not found")
	}
	entry, _ := servers[targetName].(map[string]any)
	if entry == nil {
		entry = map[string]any{}
	}
	now := time.Now().UTC().Format(time.RFC3339)
	meta, _ := entry["_meta"].(map[string]any)
	if meta == nil {
		meta = map[string]any{}
	}
	meta["status"] = "pending"
	meta["metadataVersion"] = 2
	meta["metadataSource"] = "derived"
	meta["cacheHydratedAt"] = now
	meta["lastAttemptedBinaryLoadAt"] = now
	meta["reloadableFromCache"] = false
	if _, ok := meta["toolCount"]; !ok {
		meta["toolCount"] = 0
	}
	if _, ok := meta["tools"]; !ok {
		meta["tools"] = []any{}
	}
	meta["error"] = "Go fallback refreshed metadata cache placeholder using local configuration only (" + mode + ")."
	entry["_meta"] = meta
	servers[targetName] = entry
	config["mcpServers"] = servers
	if err := s.writeLocalMCPConfigObject(config); err != nil {
		return nil, err
	}
	server, err := s.localConfiguredServerByName(targetName)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"server":         server,
		"metadata":       meta,
		"toolCount":      meta["toolCount"],
		"reloadDecision": "go-local-placeholder",
		"ok":             true,
	}, nil
}

func (s *Server) localClearConfiguredServerMetadata(payload map[string]any) (any, error) {
	uuid, _ := payload["uuid"].(string)
	config, err := s.readLocalMCPConfigObject()
	if err != nil {
		return nil, err
	}
	servers, _ := config["mcpServers"].(map[string]any)
	if servers == nil {
		return nil, errors.New("no configured servers")
	}
	targetName := strings.TrimSpace(nameForSyntheticUUID(servers, uuid))
	if targetName == "" {
		return nil, errors.New("configured server not found")
	}
	entry, _ := servers[targetName].(map[string]any)
	if entry == nil {
		entry = map[string]any{}
	}
	clearedAt := time.Now().UTC().Format(time.RFC3339)
	meta := map[string]any{
		"status":                     "pending",
		"metadataVersion":            2,
		"metadataSource":             "derived",
		"reloadableFromCache":        false,
		"toolCount":                  0,
		"tools":                      []any{},
		"error":                      "Cache cleared at " + clearedAt,
		"cacheHydratedAt":            nil,
		"discoveredAt":               nil,
		"lastAttemptedBinaryLoadAt":  nil,
		"lastSuccessfulBinaryLoadAt": nil,
	}
	entry["_meta"] = meta
	servers[targetName] = entry
	config["mcpServers"] = servers
	if err := s.writeLocalMCPConfigObject(config); err != nil {
		return nil, err
	}
	server, err := s.localConfiguredServerByName(targetName)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"server":    server,
		"metadata":  meta,
		"toolCount": 0,
		"ok":        true,
	}, nil
}

func (s *Server) localBulkImportConfiguredServers(payload []map[string]any) (any, error) {
	config, err := s.readLocalMCPConfigObject()
	if err != nil {
		return nil, err
	}
	servers, _ := config["mcpServers"].(map[string]any)
	if servers == nil {
		servers = map[string]any{}
	}

	if len(payload) == 0 {
		return []map[string]any{}, nil
	}

	importedNames := make([]string, 0, len(payload))
	for _, item := range payload {
		name, _ := item["name"].(string)
		if strings.TrimSpace(name) == "" {
			continue
		}
		servers[name] = configuredServerEntryFromPayload(item)
		importedNames = append(importedNames, name)
	}
	config["mcpServers"] = servers
	if err := s.writeLocalMCPConfigObject(config); err != nil {
		return nil, err
	}

	results := make([]map[string]any, 0, len(importedNames))
	for _, name := range importedNames {
		server, err := s.localConfiguredServerByName(name)
		if err != nil {
			return nil, err
		}
		results = append(results, server)
	}
	return results, nil
}

func (s *Server) localConfiguredServerByName(name string) (map[string]any, error) {
	servers, err := s.localConfiguredMCPServers()
	if err != nil {
		return nil, err
	}
	for _, server := range servers {
		serverName, _ := server["name"].(string)
		if serverName == name {
			return server, nil
		}
	}
	return nil, errors.New("configured server not found")
}

func (s *Server) readLocalMCPConfigObject() (map[string]any, error) {
	editor, err := s.localMCPJsoncEditor()
	if err != nil {
		return nil, err
	}
	content, _ := editor["content"].(string)
	var parsed map[string]any
	if err := json.Unmarshal([]byte(stripJSONCLineComments(content)), &parsed); err != nil {
		return nil, err
	}
	if _, ok := parsed["mcpServers"]; !ok {
		parsed["mcpServers"] = map[string]any{}
	}
	return parsed, nil
}

func (s *Server) writeLocalMCPConfigObject(config map[string]any) error {
	return s.saveLocalMCPJsonc(prettyJSON(config))
}

func configuredServerEntryFromPayload(payload map[string]any) map[string]any {
	entry := map[string]any{}
	for _, key := range []string{"description", "command", "url", "bearerToken", "source_published_server_uuid", "type"} {
		if value, ok := payload[key]; ok && value != nil {
			entry[key] = value
		}
	}
	if args := stringSlice(payload["args"]); len(args) > 0 {
		entry["args"] = args
	}
	if env := stringMap(payload["env"]); len(env) > 0 {
		envMap := make(map[string]any, len(env))
		for key, value := range env {
			envMap[key] = value
		}
		entry["env"] = envMap
	}
	if headers := stringMap(payload["headers"]); len(headers) > 0 {
		headerMap := make(map[string]any, len(headers))
		for key, value := range headers {
			headerMap[key] = value
		}
		entry["headers"] = headerMap
	}
	if alwaysOn, ok := payload["always_on"].(bool); ok {
		entry["always_on"] = alwaysOn
	}
	return entry
}

func mergeConfiguredServerEntry(current map[string]any, patch map[string]any) map[string]any {
	next := make(map[string]any, len(current))
	for key, value := range current {
		next[key] = value
	}
	for key, value := range configuredServerEntryFromPayload(patch) {
		next[key] = value
	}
	return next
}

func nameForSyntheticUUID(servers map[string]any, uuid string) string {
	for name := range servers {
		if syntheticServerUUID(name) == uuid {
			return name
		}
	}
	return ""
}

func (s *Server) localMCPSyncTargets() ([]map[string]any, error) {
	clients := []string{"claude-desktop", "cursor", "vscode"}
	results := make([]map[string]any, 0, len(clients))
	for _, client := range clients {
		path, candidates, exists, err := s.resolveLocalClientConfigTarget(client, "")
		if err != nil {
			return nil, err
		}
		results = append(results, map[string]any{
			"client":     client,
			"path":       path,
			"candidates": candidates,
			"exists":     exists,
		})
	}
	return results, nil
}

func (s *Server) localMCPExportClientConfig(client string, overridePath string) (map[string]any, error) {
	servers, err := s.localConfiguredMCPServers()
	if err != nil {
		return nil, err
	}
	targetPath, _, exists, err := s.resolveLocalClientConfigTarget(client, overridePath)
	if err != nil {
		return nil, err
	}
	document := map[string]any{
		"mcpServers": buildClientConfigMCPServers(servers),
	}
	jsonText := prettyJSON(document) + "\n"
	return map[string]any{
		"client":      client,
		"targetPath":  targetPath,
		"existed":     exists,
		"serverCount": len(document["mcpServers"].(map[string]any)),
		"document":    document,
		"json":        jsonText,
	}, nil
}

func (s *Server) resolveLocalClientConfigTarget(client string, overridePath string) (string, []string, bool, error) {
	candidates := []string{}
	if strings.TrimSpace(overridePath) != "" {
		candidates = []string{overridePath}
	} else {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", nil, false, err
		}
		appData := os.Getenv("APPDATA")
		if appData == "" {
			appData = filepath.Join(homeDir, "AppData", "Roaming")
		}
		switch client {
		case "claude-desktop":
			candidates = []string{filepath.Join(appData, "Claude", "claude_desktop_config.json")}
		case "cursor":
			candidates = []string{
				filepath.Join(appData, "Cursor", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(appData, "Cursor", "User", "mcp.json"),
			}
		case "vscode":
			candidates = []string{
				filepath.Join(appData, "Code", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(appData, "Code", "User", "settings.json"),
				filepath.Join(s.cfg.WorkspaceRoot, ".vscode", "mcp.json"),
			}
		default:
			return "", nil, false, errors.New("unsupported client")
		}
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, candidates, true, nil
		}
	}
	if len(candidates) == 0 {
		return "", nil, false, errors.New("no client config candidates")
	}
	return candidates[0], candidates, false, nil
}

func buildClientConfigMCPServers(servers []map[string]any) map[string]any {
	result := make(map[string]any)
	for _, server := range servers {
		name, _ := server["name"].(string)
		if strings.TrimSpace(name) == "" {
			continue
		}
		serverType, _ := server["type"].(string)
		command, _ := server["command"].(string)
		url, _ := server["url"].(string)
		args := stringSlice(server["args"])
		env := stringMap(server["env"])
		headers := stringMap(server["headers"])
		bearerToken, _ := server["bearerToken"].(string)

		if serverType == "STDIO" {
			if strings.TrimSpace(command) == "" {
				continue
			}
			definition := map[string]any{
				"command": command,
			}
			if len(args) > 0 {
				definition["args"] = args
			}
			if len(env) > 0 {
				definition["env"] = env
			}
			result[name] = definition
			continue
		}
		if strings.TrimSpace(url) == "" {
			continue
		}
		definition := map[string]any{
			"url": url,
		}
		if bearerToken != "" {
			headers["Authorization"] = "Bearer " + bearerToken
		}
		if len(headers) > 0 {
			definition["headers"] = headers
		}
		result[name] = definition
	}
	return result
}

func (s *Server) localToolPreferences() (map[string]any, error) {
	editor, err := s.localMCPJsoncEditor()
	if err != nil {
		return nil, err
	}
	content, _ := editor["content"].(string)
	var parsed map[string]any
	if err := json.Unmarshal([]byte(stripJSONCLineComments(content)), &parsed); err != nil {
		return nil, err
	}
	settings, _ := parsed["settings"].(map[string]any)
	toolSelection, _ := settings["toolSelection"].(map[string]any)
	return normalizeToolPreferences(toolSelection), nil
}

func (s *Server) saveLocalToolPreferences(payload map[string]any) (map[string]any, error) {
	editor, err := s.localMCPJsoncEditor()
	if err != nil {
		return nil, err
	}
	content, _ := editor["content"].(string)
	var parsed map[string]any
	if err := json.Unmarshal([]byte(stripJSONCLineComments(content)), &parsed); err != nil {
		return nil, err
	}
	settings, _ := parsed["settings"].(map[string]any)
	if settings == nil {
		settings = map[string]any{}
	}
	currentToolSelection, _ := settings["toolSelection"].(map[string]any)
	current := normalizeToolPreferences(currentToolSelection)
	next := applyToolPreferencePatch(current, payload)
	settings["toolSelection"] = next
	parsed["settings"] = settings
	if _, ok := parsed["mcpServers"]; !ok {
		parsed["mcpServers"] = map[string]any{}
	}
	if err := s.saveLocalMCPJsonc(prettyJSON(parsed)); err != nil {
		return nil, err
	}
	result := make(map[string]any, len(next)+1)
	for key, value := range next {
		result[key] = value
	}
	result["ok"] = true
	return result, nil
}

func normalizeToolPreferences(raw map[string]any) map[string]any {
	return map[string]any{
		"importantTools":          normalizeToolNameList(raw["importantTools"]),
		"alwaysLoadedTools":       normalizeAlwaysLoadedTools(raw["alwaysLoadedTools"]),
		"autoLoadMinConfidence":   clampFloat(raw["autoLoadMinConfidence"], 0.85, 0.5, 0.99),
		"maxLoadedTools":          clampInt(raw["maxLoadedTools"], 16, 4, 64),
		"maxHydratedSchemas":      clampInt(raw["maxHydratedSchemas"], 8, 2, 32),
		"idleEvictionThresholdMs": clampInt(raw["idleEvictionThresholdMs"], 5*60*1000, 10_000, 24*60*60*1000),
	}
}

func applyToolPreferencePatch(current map[string]any, patch map[string]any) map[string]any {
	next := map[string]any{
		"importantTools":          current["importantTools"],
		"alwaysLoadedTools":       current["alwaysLoadedTools"],
		"autoLoadMinConfidence":   current["autoLoadMinConfidence"],
		"maxLoadedTools":          current["maxLoadedTools"],
		"maxHydratedSchemas":      current["maxHydratedSchemas"],
		"idleEvictionThresholdMs": current["idleEvictionThresholdMs"],
	}
	for _, key := range []string{"importantTools", "alwaysLoadedTools", "autoLoadMinConfidence", "maxLoadedTools", "maxHydratedSchemas", "idleEvictionThresholdMs"} {
		if value, ok := patch[key]; ok {
			next[key] = value
		}
	}
	normalizedPatch := map[string]any{
		"importantTools":          next["importantTools"],
		"alwaysLoadedTools":       next["alwaysLoadedTools"],
		"autoLoadMinConfidence":   next["autoLoadMinConfidence"],
		"maxLoadedTools":          next["maxLoadedTools"],
		"maxHydratedSchemas":      next["maxHydratedSchemas"],
		"idleEvictionThresholdMs": next["idleEvictionThresholdMs"],
	}
	return normalizeToolPreferences(normalizedPatch)
}

func normalizeToolNameList(value any) []string {
	result := []string{}
	seen := map[string]struct{}{}
	switch typed := value.(type) {
	case []any:
		for _, raw := range typed {
			name, _ := raw.(string)
			trimmed := strings.TrimSpace(name)
			if trimmed == "" {
				continue
			}
			if _, ok := seen[trimmed]; ok {
				continue
			}
			seen[trimmed] = struct{}{}
			result = append(result, trimmed)
		}
	case []string:
		for _, name := range typed {
			trimmed := strings.TrimSpace(name)
			if trimmed == "" {
				continue
			}
			if _, ok := seen[trimmed]; ok {
				continue
			}
			seen[trimmed] = struct{}{}
			result = append(result, trimmed)
		}
	}
	return result
}

func normalizeAlwaysLoadedTools(value any) []string {
	if value == nil {
		return []string{"search_tools", "read_file", "write_file", "grep_search", "execute_command", "browser__open"}
	}
	return normalizeToolNameList(value)
}

func clampFloat(value any, fallback float64, min float64, max float64) float64 {
	number, ok := value.(float64)
	if !ok {
		if intValue, ok := value.(int); ok {
			number = float64(intValue)
		} else {
			return fallback
		}
	}
	if number < min {
		return min
	}
	if number > max {
		return max
	}
	return number
}

func clampInt(value any, fallback int, min int, max int) int {
	number := fallback
	switch typed := value.(type) {
	case float64:
		number = int(typed)
	case int:
		number = typed
	default:
		return fallback
	}
	if number < min {
		return min
	}
	if number > max {
		return max
	}
	return number
}

func stripServerMeta(value any) any {
	servers, ok := value.(map[string]any)
	if !ok {
		return value
	}
	stripped := make(map[string]any, len(servers))
	for name, rawServer := range servers {
		serverMap, ok := rawServer.(map[string]any)
		if !ok {
			stripped[name] = rawServer
			continue
		}
		copyMap := make(map[string]any, len(serverMap))
		for key, fieldValue := range serverMap {
			if key == "_meta" {
				continue
			}
			copyMap[key] = fieldValue
		}
		stripped[name] = copyMap
	}
	return stripped
}

func prettyJSON(value any) string {
	encoded, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(encoded)
}

func syntheticServerUUID(name string) string {
	hash := stableHash("mcp-server\n" + name)
	return hash[:8] + "-" + hash[8:12] + "-" + hash[12:16] + "-" + hash[16:20] + "-" + hash[20:32]
}

func nullableString(value any) any {
	text, _ := value.(string)
	if strings.TrimSpace(text) == "" {
		return nil
	}
	return text
}

func stringSlice(value any) []string {
	values, ok := value.([]any)
	if !ok {
		if stringsValue, ok := value.([]string); ok {
			return append([]string(nil), stringsValue...)
		}
		return []string{}
	}
	result := make([]string, 0, len(values))
	for _, raw := range values {
		text, _ := raw.(string)
		if strings.TrimSpace(text) == "" {
			continue
		}
		result = append(result, text)
	}
	return result
}

func stringMap(value any) map[string]string {
	record, ok := value.(map[string]any)
	if !ok {
		if typedRecord, ok := value.(map[string]string); ok {
			copyMap := make(map[string]string, len(typedRecord))
			for key, entry := range typedRecord {
				copyMap[key] = entry
			}
			return copyMap
		}
		return map[string]string{}
	}
	result := make(map[string]string, len(record))
	for key, raw := range record {
		text, _ := raw.(string)
		if key == "" || text == "" {
			continue
		}
		result[key] = text
	}
	return result
}

func stripJSONCLineComments(content string) string {
	lines := strings.Split(content, "\n")
	for index, line := range lines {
		inString := false
		escaped := false
		for i := 0; i < len(line)-1; i++ {
			ch := line[i]
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = !inString
				continue
			}
			if !inString && ch == '/' && line[i+1] == '/' {
				line = line[:i]
				break
			}
		}
		lines[index] = line
	}
	return strings.Join(lines, "\n")
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

func (s *Server) importedSessionsArchiveRoot() string {
	return filepath.Join(s.cfg.WorkspaceRoot, ".hypercode", "imported_sessions", "archive")
}

func readGzipJSON(filePath string, target any) error {
	payload, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	reader, err := gzip.NewReader(bytes.NewReader(payload))
	if err != nil {
		return err
	}
	defer reader.Close()

	return json.NewDecoder(reader).Decode(target)
}

func readGzipText(filePath string) (string, error) {
	payload, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	reader, err := gzip.NewReader(bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	defer reader.Close()

	decoded, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}

func archivedImportedSessionRecord(sidecar importedSessionArchiveSidecar, metadataPath string) (ImportedSessionRecord, error) {
	transcriptPath := strings.TrimSuffix(metadataPath, ".meta.json.gz") + ".txt.gz"
	transcript, err := readGzipText(transcriptPath)
	if err != nil {
		return ImportedSessionRecord{}, err
	}

	sessionID := strings.TrimSpace(sidecar.SessionID)
	if sessionID == "" {
		sessionID = "import-" + stableHash(metadataPath)[:16]
	}
	transcriptHash := strings.TrimSpace(sidecar.TranscriptHash)
	if transcriptHash == "" {
		transcriptHash = stableHash(sidecar.SourceTool + "\n" + sidecar.SourcePath + "\n" + sidecar.SessionFormat)
	}

	title := sidecar.Title
	if title == nil || strings.TrimSpace(*title) == "" {
		titleText := filepath.Base(sidecar.SourcePath)
		if strings.TrimSpace(titleText) != "" {
			title = &titleText
		}
	}

	excerpt := sidecar.Excerpt
	if excerpt == nil && strings.TrimSpace(transcript) != "" {
		excerptText := transcript
		if len(excerptText) > 240 {
			excerptText = excerptText[:240]
		}
		excerpt = &excerptText
	}

	importedAt := sidecar.ArchivedAt
	if importedAt <= 0 {
		if stat, statErr := os.Stat(metadataPath); statErr == nil {
			importedAt = stat.ModTime().UTC().UnixMilli()
		} else {
			importedAt = time.Now().UTC().UnixMilli()
		}
	}

	normalized := map[string]any{
		"archiveFormat": "gzip-text-v1",
	}
	metadata := map[string]any{
		"archiveFormat":           "gzip-text-v1",
		"durableMemoryCount":      sidecar.DurableMemoryCount,
		"durableInstructionCount": sidecar.DurableInstructionCount,
		"memoryTags":              sidecar.MemoryTags,
	}
	if sidecar.RetentionSummary != nil {
		metadata["retentionSummary"] = sidecar.RetentionSummary
	}

	return ImportedSessionRecord{
		ID:                sessionID,
		SourceTool:        sidecar.SourceTool,
		SourcePath:        sidecar.SourcePath,
		ExternalSessionID: nil,
		Title:             title,
		SessionFormat:     sidecar.SessionFormat,
		Transcript:        transcript,
		Excerpt:           excerpt,
		WorkingDirectory:  sidecar.WorkingDirectory,
		TranscriptHash:    transcriptHash,
		NormalizedSession: normalized,
		Metadata:          metadata,
		DiscoveredAt:      importedAt,
		ImportedAt:        importedAt,
		LastModifiedAt:    &importedAt,
		CreatedAt:         importedAt,
		UpdatedAt:         importedAt,
		ParsedMemories:    []ImportedSessionMemory{},
	}, nil
}

func (s *Server) loadArchivedImportedSessionRecords() ([]ImportedSessionRecord, error) {
	archiveRoot := s.importedSessionsArchiveRoot()
	if _, err := os.Stat(archiveRoot); err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	records := make([]ImportedSessionRecord, 0, 32)
	err := filepath.WalkDir(archiveRoot, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(path), ".meta.json.gz") {
			return nil
		}

		var sidecar importedSessionArchiveSidecar
		if err := readGzipJSON(path, &sidecar); err != nil {
			return nil
		}
		record, err := archivedImportedSessionRecord(sidecar, path)
		if err != nil {
			return nil
		}
		records = append(records, record)
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(records, func(i, j int) bool {
		if records[i].ImportedAt == records[j].ImportedAt {
			return records[i].ID < records[j].ID
		}
		return records[i].ImportedAt > records[j].ImportedAt
	})
	return records, nil
}

func archivedImportedSessionMaintenanceStats(records []ImportedSessionRecord) ImportedSessionMaintenanceStats {
	stats := ImportedSessionMaintenanceStats{
		TotalSessions:           len(records),
		ArchivedTranscriptCount: len(records),
	}
	for _, record := range records {
		if _, ok := record.Metadata["retentionSummary"]; !ok {
			stats.MissingRetentionSummaryCount++
		}
	}
	return stats
}

func archivedImportedSessionScanSummary(records []ImportedSessionRecord) map[string]any {
	toolsSet := make(map[string]struct{})
	storedMemoryCount := 0
	for _, record := range records {
		if record.SourceTool != "" {
			toolsSet[record.SourceTool] = struct{}{}
		}
		storedMemoryCount += intNumber(record.Metadata["durableMemoryCount"])
		storedMemoryCount += intNumber(record.Metadata["durableInstructionCount"])
	}

	tools := make([]string, 0, len(toolsSet))
	for tool := range toolsSet {
		tools = append(tools, tool)
	}
	sort.Strings(tools)

	return map[string]any{
		"discoveredCount":    len(records),
		"importedCount":      len(records),
		"skippedCount":       0,
		"storedMemoryCount":  storedMemoryCount,
		"instructionDocPath": nil,
		"tools":              tools,
	}
}

func intNumber(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

func (s *Server) importedSessionFallbackRecords(candidates []sessionimport.ValidationResult) []ImportedSessionRecord {
	records := make([]ImportedSessionRecord, 0, len(candidates))
	for _, candidate := range candidates {
		records = append(records, importedSessionFallbackRecord(candidate))
	}
	sort.Slice(records, func(i, j int) bool {
		return records[i].ID < records[j].ID
	})
	return records
}

func importedSessionFallbackRecord(candidate sessionimport.ValidationResult) ImportedSessionRecord {
	transcriptHash := stableHash(candidate.SourceTool + "\n" + candidate.SourcePath + "\n" + candidate.Format)
	id := "import-" + transcriptHash[:16]
	transcript := fallbackTranscript(candidate)
	excerptText := transcript
	if len(excerptText) > 240 {
		excerptText = excerptText[:240]
	}
	titleText := filepath.Base(candidate.SourcePath)
	lastModified := parseFallbackUnixMillis(candidate.LastModifiedAt)
	discoveredAt := time.Now().UTC().UnixMilli()
	if lastModified != nil {
		discoveredAt = *lastModified
	}

	var excerpt *string
	if strings.TrimSpace(excerptText) != "" {
		excerpt = &excerptText
	}
	var title *string
	if strings.TrimSpace(titleText) != "" {
		title = &titleText
	}

	normalized := map[string]any{
		"sourceType":     candidate.SourceType,
		"detectedModels": candidate.DetectedModels,
		"valid":          candidate.Valid,
	}
	if len(candidate.Errors) > 0 {
		normalized["errors"] = candidate.Errors
	}

	metadata := map[string]any{
		"fallback":       "go-sessionimport",
		"estimatedSize":  candidate.EstimatedSize,
		"sourceType":     candidate.SourceType,
		"detectedModels": candidate.DetectedModels,
		"valid":          candidate.Valid,
	}
	if len(candidate.Errors) > 0 {
		metadata["errors"] = candidate.Errors
	}

	return ImportedSessionRecord{
		ID:                id,
		SourceTool:        candidate.SourceTool,
		SourcePath:        candidate.SourcePath,
		ExternalSessionID: nil,
		Title:             title,
		SessionFormat:     candidate.Format,
		Transcript:        transcript,
		Excerpt:           excerpt,
		WorkingDirectory:  nil,
		TranscriptHash:    transcriptHash,
		NormalizedSession: normalized,
		Metadata:          metadata,
		DiscoveredAt:      discoveredAt,
		ImportedAt:        discoveredAt,
		LastModifiedAt:    lastModified,
		CreatedAt:         discoveredAt,
		UpdatedAt:         discoveredAt,
		ParsedMemories:    []ImportedSessionMemory{},
	}
}

func fallbackTranscript(candidate sessionimport.ValidationResult) string {
	lines := []string{
		"Go fallback imported session summary",
		"sourceTool: " + candidate.SourceTool,
		"sourcePath: " + candidate.SourcePath,
		"sourceType: " + candidate.SourceType,
		"sessionFormat: " + candidate.Format,
	}
	if len(candidate.DetectedModels) > 0 {
		lines = append(lines, "detectedModels: "+strings.Join(candidate.DetectedModels, ", "))
	}
	if len(candidate.Errors) > 0 {
		lines = append(lines, "errors: "+strings.Join(candidate.Errors, "; "))
	}
	return strings.Join(lines, "\n")
}

func parseFallbackUnixMillis(value string) *int64 {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil
	}
	millis := parsed.UTC().UnixMilli()
	return &millis
}

func stableHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
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
