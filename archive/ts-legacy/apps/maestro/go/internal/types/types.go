package types

import "time"

// ThinkingMode controls how AI reasoning/thinking content is displayed.
type ThinkingMode string

const (
	ThinkingModeOff    ThinkingMode = "off"
	ThinkingModeOn     ThinkingMode = "on"
	ThinkingModeSticky ThinkingMode = "sticky"
)

// Group represents a session group
type Group struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Emoji     string `json:"emoji"`
	Collapsed bool   `json:"collapsed"`
}

// SessionInfo is a simplified session interface for CLI (subset of full Session)
type SessionInfo struct {
	ID                string `json:"id"`
	GroupID           string `json:"groupId,omitempty"`
	Name              string `json:"name"`
	ToolType          string `json:"toolType"` // Derived from AgentId in TS
	Cwd               string `json:"cwd"`
	ProjectRoot       string `json:"projectRoot"`
	AutoRunFolderPath string `json:"autoRunFolderPath,omitempty"`
	AgentSessionID    string `json:"agentSessionId,omitempty"`
	CustomModel       string `json:"customModel,omitempty"`
}

// UsageStats represents usage statistics from AI agent CLI
type UsageStats struct {
	InputTokens               int     `json:"inputTokens"`
	OutputTokens              int     `json:"outputTokens"`
	CacheReadInputTokens      int     `json:"cacheReadInputTokens"`
	CacheCreationInputTokens  int     `json:"cacheCreationInputTokens"`
	TotalCostUSD              float64 `json:"totalCostUsd"`
	ContextWindow             int     `json:"contextWindow"`
	ReasoningTokens           int     `json:"reasoningTokens,omitempty"`
}

// HistoryEntryType represents history entry types for the History panel
type HistoryEntryType string

const (
	HistoryEntryTypeAuto HistoryEntryType = "AUTO"
	HistoryEntryTypeUser HistoryEntryType = "USER"
	HistoryEntryTypeCue  HistoryEntryType = "CUE"
)

// HistoryEntry represents a history entry
type HistoryEntry struct {
	ID               string           `json:"id"`
	Type             HistoryEntryType `json:"type"`
	Timestamp        int64            `json:"timestamp"`
	Summary          string           `json:"summary"`
	FullResponse     string           `json:"fullResponse,omitempty"`
	AgentSessionID   string           `json:"agentSessionId,omitempty"`
	SessionName      string           `json:"sessionName,omitempty"`
	ProjectPath      string           `json:"projectPath"`
	SessionID        string           `json:"sessionId,omitempty"`
	ContextUsage     float64          `json:"contextUsage,omitempty"`
	UsageStats       *UsageStats      `json:"usageStats,omitempty"`
	Success          bool             `json:"success,omitempty"`
	ElapsedTimeMs    int              `json:"elapsedTimeMs,omitempty"`
	Validated        bool             `json:"validated,omitempty"`
	CueTriggerName   string           `json:"cueTriggerName,omitempty"`
	CueEventType     string           `json:"cueEventType,omitempty"`
	CueSourceSession string           `json:"cueSourceSession,omitempty"`
}

// PlaybookDocumentEntry represents a document entry within a playbook
type PlaybookDocumentEntry struct {
	Filename          string `json:"filename"`
	ResetOnCompletion bool   `json:"resetOnCompletion"`
}

// Playbook represents a saved Playbook configuration
type Playbook struct {
	ID                string                  `json:"id"`
	Name              string                  `json:"name"`
	CreatedAt         int64                   `json:"createdAt"`
	UpdatedAt         int64                   `json:"updatedAt"`
	Documents         []PlaybookDocumentEntry `json:"documents"`
	LoopEnabled       bool                    `json:"loopEnabled"`
	MaxLoops          *int                    `json:"maxLoops,omitempty"`
	Prompt            string                  `json:"prompt"`
	WorktreeSettings  *WorktreeSettings       `json:"worktreeSettings,omitempty"`
}

// WorktreeSettings represents git worktree settings for a playbook
type WorktreeSettings struct {
	BranchNameTemplate   string `json:"branchNameTemplate"`
	CreatePROnCompletion bool   `json:"createPROnCompletion"`
	PRTargetBranch       string `json:"prTargetBranch,omitempty"`
}

// BatchDocumentEntry represents a document entry in the batch run queue
type BatchDocumentEntry struct {
	ID                string `json:"id"`
	Filename          string `json:"filename"`
	ResetOnCompletion bool   `json:"resetOnCompletion"`
	IsDuplicate       bool   `json:"isDuplicate"`
	IsMissing         bool   `json:"isMissing,omitempty"`
}

// WorktreeConfig represents git worktree configuration for Auto Run
type WorktreeConfig struct {
	Enabled              bool   `json:"enabled"`
	Path                 string `json:"path"`
	BranchName           string `json:"branchName"`
	CreatePROnCompletion bool   `json:"createPROnCompletion"`
	PRTargetBranch       string `json:"prTargetBranch"`
}

// WorktreeRunTarget represents a target specification for dispatching Auto Run
type WorktreeRunTarget struct {
	Mode                 string `json:"mode"` // 'existing-open' | 'existing-closed' | 'create-new'
	SessionID            string `json:"sessionId,omitempty"`
	WorktreePath         string `json:"worktreePath,omitempty"`
	BaseBranch           string `json:"baseBranch,omitempty"`
	NewBranchName        string `json:"newBranchName,omitempty"`
	CreatePROnCompletion bool   `json:"createPROnCompletion"`
}

// BatchRunConfig represents configuration for starting a batch run
type BatchRunConfig struct {
	Documents      []BatchDocumentEntry `json:"documents"`
	Prompt         string               `json:"prompt"`
	LoopEnabled    bool                 `json:"loopEnabled"`
	MaxLoops       *int                 `json:"maxLoops,omitempty"`
	Worktree       *WorktreeConfig      `json:"worktree,omitempty"`
	WorktreeTarget *WorktreeRunTarget   `json:"worktreeTarget,omitempty"`
}

// AgentConfig represents agent configuration
type AgentConfig struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	BinaryName  string   `json:"binaryName"`
	Command     string   `json:"command"`
	Args        []string `json:"args"`
	Available   bool     `json:"available"`
	Path        string   `json:"path,omitempty"`
	RequiresPty bool     `json:"requiresPty,omitempty"`
	Hidden      bool     `json:"hidden,omitempty"`
}

// AgentErrorType represents types of errors that agents can encounter
type AgentErrorType string

const (
	AgentErrorCodeAuthExpired      AgentErrorType = "auth_expired"
	AgentErrorCodeTokenExhaustion AgentErrorType = "token_exhaustion"
	AgentErrorCodeRateLimited     AgentErrorType = "rate_limited"
	AgentErrorCodeNetworkError     AgentErrorType = "network_error"
	AgentErrorCodeAgentCrashed     AgentErrorType = "agent_crashed"
	AgentErrorCodePermissionDenied AgentErrorType = "permission_denied"
	AgentErrorCodeSessionNotFound  AgentErrorType = "session_not_found"
	AgentErrorCodeUnknown          AgentErrorType = "unknown"
)

// AgentError represents structured error information from an AI agent
type AgentError struct {
	Type        AgentErrorType `json:"type"`
	Message     string         `json:"message"`
	Recoverable bool           `json:"recoverable"`
	AgentID     string         `json:"agentId"`
	SessionID   string         `json:"sessionId,omitempty"`
	Timestamp   int64          `json:"timestamp"`
	Raw         *AgentErrorRaw `json:"raw,omitempty"`
	ParsedJSON  interface{}    `json:"parsedJson,omitempty"`
}

// AgentErrorRaw contains original error data for debugging
type AgentErrorRaw struct {
	ExitCode  int    `json:"exitCode,omitempty"`
	Stderr    string `json:"stderr,omitempty"`
	Stdout    string `json:"stdout,omitempty"`
	ErrorLine string `json:"errorLine,omitempty"`
}

// AgentErrorRecovery represents a recovery action for an agent error
type AgentErrorRecovery struct {
	Type        AgentErrorType `json:"type"`
	Label       string         `json:"label"`
	Description string         `json:"description,omitempty"`
	Primary     bool           `json:"primary,omitempty"`
	Icon        string         `json:"icon,omitempty"`
}

// PowerStatus represents status information for the power management system
type PowerStatus struct {
	Enabled  bool     `json:"enabled"`
	Blocking bool     `json:"blocking"`
	Reasons  []string `json:"reasons"`
	Platform string   `json:"platform"` // 'darwin' | 'win32' | 'linux'
}

// SshRemoteConfig represents configuration for an SSH remote host
type SshRemoteConfig struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Host           string            `json:"host"`
	Port           int               `json:"port"`
	Username       string            `json:"username"`
	PrivateKeyPath string            `json:"privateKeyPath"`
	RemoteEnv      map[string]string `json:"remoteEnv,omitempty"`
	Enabled        bool              `json:"enabled"`
	UseSshConfig   bool              `json:"useSshConfig,omitempty"`
	SshConfigHost  string            `json:"sshConfigHost,omitempty"`
}

// SshRemoteStatus represents the status of an SSH remote connection
type SshRemoteStatus struct {
	LastTestSuccess *bool  `json:"lastTestSuccess"`
	LastTestAt      *int64 `json:"lastTestAt"`
	LastTestError   *string `json:"lastTestError"`
}

type SshRemoteInfo struct {
	Hostname     string `json:"hostname"`
	AgentVersion string `json:"agentVersion,omitempty"`
}

// SshRemoteTestResult represents the result of testing an SSH remote connection
type SshRemoteTestResult struct {
	Success    bool              `json:"success"`
	Error      string            `json:"error,omitempty"`
	RemoteInfo *SshRemoteInfo    `json:"remoteInfo,omitempty"`
}

// RemoteDirEntry represents an entry in a remote directory.

// AgentSshRemoteConfig represents agent-level SSH remote configuration
type AgentSshRemoteConfig struct {
	Enabled            bool    `json:"enabled"`
	RemoteID           *string `json:"remoteId"`
	WorkingDirOverride string  `json:"workingDirOverride,omitempty"`
}

// ParsedDeepLink represents a parsed deep link from a maestro:// URL
type ParsedDeepLink struct {
	Action    string `json:"action"` // 'focus' | 'session' | 'group'
	SessionID string `json:"sessionId,omitempty"`
	TabID     string `json:"tabId,omitempty"`
	GroupID   string `json:"groupId,omitempty"`
}

// ProviderStats represents per-provider statistics breakdown
type ProviderStats struct {
	Sessions     int     `json:"sessions"`
	Messages     int     `json:"messages"`
	InputTokens  int     `json:"inputTokens"`
	OutputTokens int     `json:"outputTokens"`
	CostUSD      float64 `json:"costUsd"`
	HasCostData  bool    `json:"hasCostData"`
}

// GlobalAgentStats aggregated from all providers
type GlobalAgentStats struct {
	TotalSessions             int                      `json:"totalSessions"`
	TotalMessages             int                      `json:"totalMessages"`
	TotalInputTokens          int                      `json:"totalInputTokens"`
	TotalOutputTokens         int                      `json:"totalOutputTokens"`
	TotalCacheReadTokens      int                      `json:"totalCacheReadTokens"`
	TotalCacheCreationTokens  int                      `json:"totalCacheCreationTokens"`
	TotalCostUSD              float64                  `json:"totalCostUsd"`
	HasCostData               bool                     `json:"hasCostData"`
	TotalSizeBytes            int64                    `json:"totalSizeBytes"`
	IsComplete                bool                     `json:"isComplete"`
	ByProvider                map[string]ProviderStats `json:"byProvider"`
}

// ============================================================================
// Symphony Types
// ============================================================================

// SymphonyRegistry represents the Symphony registry
type SymphonyRegistry struct {
	SchemaVersion string                 `json:"schemaVersion"`
	LastUpdated   time.Time              `json:"lastUpdated"`
	Repositories  []RegisteredRepository `json:"repositories"`
}

// RegisteredRepository represents a repository in the Symphony program
type RegisteredRepository struct {
	Slug        string             `json:"slug"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	URL         string             `json:"url"`
	Category    string             `json:"category"`
	Tags        []string           `json:"tags,omitempty"`
	Maintainer  RepositoryMaintainer `json:"maintainer"`
	IsActive    bool               `json:"isActive"`
	Featured    bool               `json:"featured,omitempty"`
	AddedAt     time.Time          `json:"addedAt"`
	Stars       int                `json:"stars,omitempty"`
}

// RepositoryMaintainer represents a repository owner/maintainer
type RepositoryMaintainer struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`
}

// DocumentReference represents a reference to an Auto Run document
type DocumentReference struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	IsExternal bool   `json:"isExternal"`
}

// SymphonyLabel represents a GitHub label on an issue
type SymphonyLabel struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// SymphonyIssue represents a GitHub issue with the runmaestro.ai label
type SymphonyIssue struct {
	Number        int                 `json:"number"`
	Title         string              `json:"title"`
	Body          string              `json:"body"`
	URL           string              `json:"url"`
	HTMLURL       string              `json:"htmlUrl"`
	Author        string              `json:"author"`
	CreatedAt     time.Time           `json:"createdAt"`
	UpdatedAt     time.Time           `json:"updatedAt"`
	DocumentPaths []DocumentReference `json:"documentPaths"`
	Labels        []SymphonyLabel     `json:"labels"`
	Status        string              `json:"status"` // 'available' | 'in_progress' | 'completed'
	ClaimedByPR   *ClaimedByPR        `json:"claimedByPr,omitempty"`
}

// ClaimedByPR represents a PR working on an issue
type ClaimedByPR struct {
	Number  int    `json:"number"`
	URL     string `json:"url"`
	Author  string `json:"author"`
	IsDraft bool   `json:"isDraft"`
}

// ActiveContribution represents an active contribution in progress
type ActiveContribution struct {
	ID               string               `json:"id"`
	RepoSlug         string               `json:"repoSlug"`
	RepoName         string               `json:"repoName"`
	IssueNumber      int                  `json:"issueNumber"`
	IssueTitle       string               `json:"issueTitle"`
	LocalPath        string               `json:"localPath"`
	BranchName       string               `json:"branchName"`
	DraftPRNumber    int                  `json:"draftPrNumber,omitempty"`
	DraftPRURL       string               `json:"draftPrUrl,omitempty"`
	StartedAt        time.Time            `json:"startedAt"`
	Status           string               `json:"status"`
	Progress         ContributionProgress `json:"progress"`
	TokenUsage       ContributionTokenUsage `json:"tokenUsage"`
	TimeSpent        int64                `json:"timeSpent"`
	SessionID        string               `json:"sessionId"`
	AgentType        string               `json:"agentType"`
	Error            string               `json:"error,omitempty"`
	IsFork           bool                 `json:"isFork,omitempty"`
	ForkSlug         string               `json:"forkSlug,omitempty"`
	UpstreamSlug     string               `json:"upstreamSlug,omitempty"`
}

// ContributionProgress tracks contribution progress
type ContributionProgress struct {
	TotalDocuments     int    `json:"totalDocuments"`
	CompletedDocuments int    `json:"completedDocuments"`
	CurrentDocument    string `json:"currentDocument,omitempty"`
	TotalTasks         int    `json:"totalTasks"`
	CompletedTasks     int    `json:"completedTasks"`
}

// ContributionTokenUsage tracks token usage for a contribution
type ContributionTokenUsage struct {
	InputTokens   int     `json:"inputTokens"`
	OutputTokens  int     `json:"outputTokens"`
	EstimatedCost float64 `json:"estimatedCost"`
}

// SymphonySessionMetadata attached to agent sessions
type SymphonySessionMetadata struct {
	IsSymphonySession bool     `json:"isSymphonySession"`
	ContributionID    string   `json:"contributionId"`
	RepoSlug          string   `json:"repoSlug"`
	IssueNumber       int      `json:"issueNumber"`
	IssueTitle        string   `json:"issueTitle"`
	DraftPRNumber     int      `json:"draftPrNumber,omitempty"`
	DraftPRURL        string   `json:"draftPrUrl,omitempty"`
	DocumentPaths     []string `json:"documentPaths"`
	Status            string   `json:"status"`
}

// CompletedContribution represents a completed contribution
type CompletedContribution struct {
	ID                 string                 `json:"id"`
	RepoSlug           string                 `json:"repoSlug"`
	RepoName           string                 `json:"repoName"`
	IssueNumber        int                    `json:"issueNumber"`
	IssueTitle         string                 `json:"issueTitle"`
	StartedAt          time.Time              `json:"startedAt"`
	CompletedAt        time.Time              `json:"completedAt"`
	PRURL              string                 `json:"prUrl"`
	PRNumber           int                    `json:"prNumber"`
	TokenUsage         ContributionTokenUsage `json:"tokenUsage"`
	TimeSpent          int64                  `json:"timeSpent"`
	DocumentsProcessed int                    `json:"documentsProcessed"`
	TasksCompleted     int                    `json:"tasksCompleted"`
	WasMerged          bool                   `json:"wasMerged,omitempty"`
	MergedAt           *time.Time             `json:"mergedAt,omitempty"`
	WasClosed          bool                   `json:"wasClosed,omitempty"`
}

// ContributorStats for tracking achievements
type ContributorStats struct {
	TotalContributions      int      `json:"totalContributions"`
	TotalMerged             int      `json:"totalMerged"`
	TotalIssuesResolved     int      `json:"totalIssuesResolved"`
	TotalDocumentsProcessed int      `json:"totalDocumentsProcessed"`
	TotalTasksCompleted     int      `json:"totalTasksCompleted"`
	TotalTokensUsed         int      `json:"totalTokensUsed"`
	TotalTimeSpent          int64    `json:"totalTimeSpent"`
	EstimatedCostDonated    float64  `json:"estimatedCostDonated"`
	RepositoriesContributed []string `json:"repositoriesContributed"`
	UniqueMaintainersHelped int      `json:"uniqueMaintainersHelped"`
	CurrentStreak           int      `json:"currentStreak"`
	LongestStreak           int      `json:"longestStreak"`
	LastContributionDate    string   `json:"lastContributionDate,omitempty"`
	FirstContributionAt     string   `json:"firstContributionAt,omitempty"`
	LastContributionAt      string   `json:"lastContributionAt,omitempty"`
}

// AgentSessionInfo represents summary information about an agent session.
type AgentSessionInfo struct {
	SessionID           string    `json:"sessionId"`
	ProjectPath         string    `json:"projectPath"`
	Timestamp           string    `json:"timestamp"` // ISO 8601
	ModifiedAt          string    `json:"modifiedAt"` // ISO 8601
	FirstMessage        string    `json:"firstMessage"`
	MessageCount        int       `json:"messageCount"`
	SizeBytes           int64     `json:"sizeBytes"`
	CostUSD             float64   `json:"costUsd"`
	InputTokens         int       `json:"inputTokens"`
	OutputTokens        int       `json:"outputTokens"`
	CacheReadTokens     int       `json:"cacheReadTokens"`
	CacheCreationTokens int       `json:"cacheCreationTokens"`
	DurationSeconds     int       `json:"durationSeconds"`
}

// SessionMessagesResult represents the result of loading session messages.
type SessionMessagesResult struct {
	Messages           []OpenCodeMessage          `json:"messages"`
	Parts              map[string][]OpenCodePart  `json:"parts"`
	TotalInputTokens   int                        `json:"totalInputTokens"`
	TotalOutputTokens  int                        `json:"totalOutputTokens"`
	TotalCacheReadTokens int                      `json:"totalCacheReadTokens"`
	TotalCacheWriteTokens int                     `json:"totalCacheWriteTokens"`
	TotalCost          float64                    `json:"totalCost"`
}

// OpenCodeMessage represents a message in an OpenCode session.
type OpenCodeMessage struct {
	ID        string            `json:"id"`
	SessionID string            `json:"sessionId"`
	Role      string            `json:"role"`
	Time      *OpenCodeTime     `json:"time,omitempty"`
	Model     *OpenCodeModel    `json:"model,omitempty"`
	Agent     string            `json:"agent,omitempty"`
	Tokens    *OpenCodeTokens   `json:"tokens,omitempty"`
	Cost      float64           `json:"cost,omitempty"`
}

type OpenCodeTime struct {
	Created int64 `json:"created"`
}

type OpenCodeModel struct {
	ProviderID string `json:"providerId,omitempty"`
	ModelID    string `json:"modelId,omitempty"`
}

type OpenCodeTokens struct {
	Input     int `json:"input,omitempty"`
	Output    int `json:"output,omitempty"`
	Reasoning int `json:"reasoning,omitempty"`
	Cache     *OpenCodeCacheTokens `json:"cache,omitempty"`
}

type OpenCodeCacheTokens struct {
	Read  int `json:"read,omitempty"`
	Write int `json:"write,omitempty"`
}

// OpenCodePart represents a part of a message.
type OpenCodePart struct {
	ID        string      `json:"id"`
	MessageID string      `json:"messageId"`
	Type      string      `json:"type"`
	Text      string      `json:"text,omitempty"`
	Tool      string      `json:"tool,omitempty"`
	State     interface{} `json:"state,omitempty"`
}

// RemoteDirEntry represents a directory entry on a remote host.
type RemoteDirEntry struct {
	Name        string `json:"name"`
	IsDirectory bool   `json:"isDirectory"`
	IsSymlink   bool   `json:"isSymlink"`
}

// SymphonyState complete symphony state stored locally
type SymphonyState struct {
	Active  []ActiveContribution    `json:"active"`
	History []CompletedContribution `json:"history"`
	Stats   ContributorStats        `json:"stats"`
}
