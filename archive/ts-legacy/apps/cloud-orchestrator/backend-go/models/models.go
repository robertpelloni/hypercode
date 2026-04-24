package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

type KeeperSettingsDTO struct {
	ID                         string        `json:"id"`
	IsEnabled                  bool          `json:"isEnabled"`
	AutoSwitch                 bool          `json:"autoSwitch"`
	CheckIntervalSeconds       int           `json:"checkIntervalSeconds"`
	InactivityThresholdMinutes int           `json:"inactivityThresholdMinutes"`
	ActiveWorkThresholdMinutes int           `json:"activeWorkThresholdMinutes"`
	Messages                   []string      `json:"messages"`
	CustomMessages             []string      `json:"customMessages"`
	DebateEnabled              bool          `json:"debateEnabled"`
	DebateParticipants         []Participant `json:"debateParticipants"`
	SmartPilotEnabled          bool          `json:"smartPilotEnabled"`
	SupervisorProvider         string        `json:"supervisorProvider"`
	SupervisorApiKey           *string       `json:"supervisorApiKey"`
	JulesApiKey                *string       `json:"julesApiKey"`
	SupervisorModel            string        `json:"supervisorModel"`
	ContextMessageCount        int           `json:"contextMessageCount"`
	ResumePaused               bool          `json:"resumePaused"`
	UserID                     *string       `json:"userId"`
	UpdatedAt                  time.Time     `json:"updatedAt"`
}

type Participant struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	SystemPrompt string `json:"systemPrompt"`
	Provider     string `json:"provider"`
	Model        string `json:"model"`
	ApiKey       string `json:"apiKey,omitempty"`
}

func (s *KeeperSettings) ToDTO() KeeperSettingsDTO {
	dto := KeeperSettingsDTO{
		ID:                         s.ID,
		IsEnabled:                  s.IsEnabled,
		AutoSwitch:                 s.AutoSwitch,
		CheckIntervalSeconds:       s.CheckIntervalSeconds,
		InactivityThresholdMinutes: s.InactivityThresholdMinutes,
		ActiveWorkThresholdMinutes: s.ActiveWorkThresholdMinutes,
		DebateEnabled:              s.DebateEnabled,
		SmartPilotEnabled:          s.SmartPilotEnabled,
		SupervisorProvider:         s.SupervisorProvider,
		SupervisorApiKey:           s.SupervisorApiKey,
		JulesApiKey:                s.JulesApiKey,
		SupervisorModel:            s.SupervisorModel,
		ContextMessageCount:        s.ContextMessageCount,
		ResumePaused:               s.ResumePaused,
		UserID:                     s.UserID,
		UpdatedAt:                  s.UpdatedAt,
	}

	_ = json.Unmarshal([]byte(s.Messages), &dto.Messages)
	if len(dto.Messages) == 0 {
		dto.Messages = []string{}
	}
	_ = json.Unmarshal([]byte(s.CustomMessages), &dto.CustomMessages)
	if len(dto.CustomMessages) == 0 {
		dto.CustomMessages = []string{}
	}
	_ = json.Unmarshal([]byte(s.DebateParticipants), &dto.DebateParticipants)
	if len(dto.DebateParticipants) == 0 {
		dto.DebateParticipants = []Participant{}
	}

	return dto
}

func (dto *KeeperSettingsDTO) ToModel() KeeperSettings {
	s := KeeperSettings{
		ID:                         dto.ID,
		IsEnabled:                  dto.IsEnabled,
		AutoSwitch:                 dto.AutoSwitch,
		CheckIntervalSeconds:       dto.CheckIntervalSeconds,
		InactivityThresholdMinutes: dto.InactivityThresholdMinutes,
		ActiveWorkThresholdMinutes: dto.ActiveWorkThresholdMinutes,
		DebateEnabled:              dto.DebateEnabled,
		SmartPilotEnabled:          dto.SmartPilotEnabled,
		SupervisorProvider:         dto.SupervisorProvider,
		SupervisorApiKey:           dto.SupervisorApiKey,
		JulesApiKey:                dto.JulesApiKey,
		SupervisorModel:            dto.SupervisorModel,
		ContextMessageCount:        dto.ContextMessageCount,
		ResumePaused:               dto.ResumePaused,
		UserID:                     dto.UserID,
		UpdatedAt:                  dto.UpdatedAt,
	}

	msgs, _ := json.Marshal(dto.Messages)
	s.Messages = string(msgs)
	cmsgs, _ := json.Marshal(dto.CustomMessages)
	s.CustomMessages = string(cmsgs)
	parts, _ := json.Marshal(dto.DebateParticipants)
	s.DebateParticipants = string(parts)

	return s
}

// Account represents the Account model from Prisma
type Account struct {
	ID                string         `gorm:"primaryKey" json:"id"`
	UserID            string         `json:"userId"`
	Type              string         `json:"type"`
	Provider          string         `gorm:"uniqueIndex:idx_provider_providerAccountId" json:"provider"`
	ProviderAccountID string         `gorm:"uniqueIndex:idx_provider_providerAccountId" json:"providerAccountId"`
	RefreshToken      *string        `json:"refresh_token"`
	AccessToken       *string        `json:"access_token"`
	ExpiresAt         *int           `json:"expires_at"`
	TokenType         *string        `json:"token_type"`
	Scope             *string        `json:"scope"`
	IDToken           *string        `json:"id_token"`
	SessionState      *string        `json:"session_state"`
	User              User           `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// ApiKey represents the ApiKey model from Prisma
type ApiKey struct {
	ID           string         `gorm:"primaryKey" json:"id"`
	Name         string         `json:"name"`
	KeyHash      string         `gorm:"uniqueIndex" json:"keyHash"`
	KeyPrefix    string         `gorm:"default:''" json:"keyPrefix"`
	Scopes       string         `json:"scopes"`
	IsActive     bool           `gorm:"default:true" json:"isActive"`
	RateLimit    int            `gorm:"default:100" json:"rateLimit"`
	ExpiresAt    *time.Time     `json:"expiresAt"`
	QuotaCents   *int           `json:"quotaCents"`
	UsedCents    int            `gorm:"default:0" json:"usedCents"`
	RequestCount int            `gorm:"default:0" json:"requestCount"`
	LastUsedAt   *time.Time     `json:"lastUsedAt"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	WorkspaceID  *string        `json:"workspaceId"`
	Workspace    *Workspace     `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"workspace"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// Debate represents the Debate model from Prisma
type Debate struct {
	ID               string         `gorm:"primaryKey" json:"id"`
	Topic            string         `json:"topic"`
	Summary          *string        `json:"summary"`
	Rounds           string         `json:"rounds"`
	History          string         `json:"history"`
	Metadata         *string        `json:"metadata"`
	PromptTokens     int            `gorm:"default:0" json:"promptTokens"`
	CompletionTokens int            `gorm:"default:0" json:"completionTokens"`
	TotalTokens      int            `gorm:"default:0" json:"totalTokens"`
	WorkspaceID      *string        `json:"workspaceId"`
	Workspace        *Workspace     `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"workspace"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// KeeperLog represents the KeeperLog model from Prisma
type KeeperLog struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	SessionID string    `json:"sessionId"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	Metadata  *string   `json:"metadata"`
	CreatedAt time.Time `json:"createdAt"`
}

// KeeperSettings represents the KeeperSettings model from Prisma
type KeeperSettings struct {
	ID                         string         `gorm:"primaryKey;default:default" json:"id"`
	IsEnabled                  bool           `gorm:"default:false" json:"isEnabled"`
	AutoSwitch                 bool           `gorm:"default:false" json:"autoSwitch"`
	CheckIntervalSeconds       int            `gorm:"default:60" json:"checkIntervalSeconds"`
	InactivityThresholdMinutes int            `gorm:"default:10" json:"inactivityThresholdMinutes"`
	ActiveWorkThresholdMinutes int            `gorm:"default:5" json:"activeWorkThresholdMinutes"`
	Messages                   string         `json:"messages"`
	CustomMessages             string         `json:"customMessages"`
	DebateEnabled              bool           `gorm:"default:false" json:"debateEnabled"`
	DebateParticipants         string         `json:"debateParticipants"`
	SmartPilotEnabled          bool           `gorm:"default:false" json:"smartPilotEnabled"`
	SupervisorProvider         string         `gorm:"default:openai" json:"supervisorProvider"`
	SupervisorApiKey           *string        `json:"supervisorApiKey"`
	JulesApiKey                *string        `json:"julesApiKey"`
	SupervisorModel            string         `gorm:"default:gpt-4o" json:"supervisorModel"`
	ContextMessageCount        int            `gorm:"default:10" json:"contextMessageCount"`
	ResumePaused               bool           `gorm:"default:false" json:"resumePaused"`
	UserID                     *string        `json:"userId"`
	User                       *User          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user"`
	UpdatedAt                  time.Time      `json:"updatedAt"`
	DeletedAt                  gorm.DeletedAt `gorm:"index" json:"-"`
}

// Session represents the Session model from Prisma
type Session struct {
	ID           string         `gorm:"primaryKey" json:"id"`
	SessionToken string         `gorm:"uniqueIndex" json:"sessionToken"`
	UserID       string         `json:"userId"`
	Expires      time.Time      `json:"expires"`
	User         User           `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// SessionTemplate represents the SessionTemplate model from Prisma
type SessionTemplate struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Prompt      string         `json:"prompt"`
	Title       *string        `json:"title"`
	IsFavorite  bool           `gorm:"default:false" json:"isFavorite"`
	IsPrebuilt  bool           `gorm:"default:false" json:"isPrebuilt"`
	Tags        string         `json:"tags"`
	WorkspaceID *string        `json:"workspaceId"`
	Workspace   *Workspace     `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"workspace"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// SupervisorState represents the SupervisorState model from Prisma
type SupervisorState struct {
	SessionID                      string    `gorm:"primaryKey" json:"sessionId"`
	LastProcessedActivityTimestamp *string   `json:"lastProcessedActivityTimestamp"`
	History                        *string   `json:"history"`
	OpenaiThreadID                 *string   `json:"openaiThreadId"`
	OpenaiAssistantID              *string   `json:"openaiAssistantId"`
	UpdatedAt                      time.Time `json:"updatedAt"`
}

// User represents the User model from Prisma
type User struct {
	ID             string            `gorm:"primaryKey" json:"id"`
	Name           *string           `json:"name"`
	Email          *string           `gorm:"uniqueIndex" json:"email"`
	EmailVerified  *time.Time        `json:"emailVerified"`
	Image          *string           `json:"image"`
	Accounts       []Account         `gorm:"foreignKey:UserID" json:"accounts"`
	KeeperSettings []KeeperSettings  `gorm:"foreignKey:UserID" json:"keeperSettings"`
	Sessions       []Session         `gorm:"foreignKey:UserID" json:"sessions"`
	Memberships    []WorkspaceMember `gorm:"foreignKey:UserID" json:"memberships"`
	DeletedAt      gorm.DeletedAt    `gorm:"index" json:"-"`
}

// VerificationToken represents the VerificationToken model from Prisma
type VerificationToken struct {
	Identifier string    `gorm:"uniqueIndex:idx_identifier_token" json:"identifier"`
	Token      string    `gorm:"uniqueIndex;uniqueIndex:idx_identifier_token" json:"token"`
	Expires    time.Time `json:"expires"`
}

// Workspace represents the Workspace model from Prisma
type Workspace struct {
	ID                        string            `gorm:"primaryKey" json:"id"`
	Name                      string            `json:"name"`
	Slug                      string            `gorm:"uniqueIndex" json:"slug"`
	MaxPluginExecutionsPerDay int               `gorm:"default:100" json:"maxPluginExecutionsPerDay"`
	MonthlyBudget             float64           `gorm:"default:100.00" json:"monthlyBudget"`
	CreatedAt                 time.Time         `json:"createdAt"`
	UpdatedAt                 time.Time         `json:"updatedAt"`
	ApiKeys                   []ApiKey          `gorm:"foreignKey:WorkspaceID" json:"apiKeys"`
	Debates                   []Debate          `gorm:"foreignKey:WorkspaceID" json:"debates"`
	Templates                 []SessionTemplate `gorm:"foreignKey:WorkspaceID" json:"templates"`
	Members                   []WorkspaceMember `gorm:"foreignKey:WorkspaceID" json:"members"`
	DeletedAt                 gorm.DeletedAt    `gorm:"index" json:"-"`
}

// WorkspaceMember represents the WorkspaceMember model from Prisma
type WorkspaceMember struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	WorkspaceID string         `json:"workspaceId"`
	UserID      string         `json:"userId"`
	Role        string         `gorm:"default:member" json:"role"`
	User        User           `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user"`
	Workspace   Workspace      `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"workspace"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// CodeChunk represents the CodeChunk model from Prisma
type CodeChunk struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	WorkspaceID string         `gorm:"index:idx_workspaceid_filepath" json:"workspaceId"`
	Filepath    string         `gorm:"index:idx_workspaceid_filepath" json:"filepath"`
	Content     string         `json:"content"`
	StartLine   int            `json:"startLine"`
	EndLine     int            `json:"endLine"`
	Embedding   []byte         `json:"embedding"` // Stored as Float32Array blob
	Checksum    string         `json:"checksum"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// MemoryChunk represents the MemoryChunk model from Prisma
type MemoryChunk struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	SessionID string         `gorm:"index" json:"sessionId"`
	Type      string         `json:"type"`
	Content   string         `json:"content"`
	Embedding []byte         `json:"embedding"`
	Metadata  *string        `json:"metadata"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// JulesSession represents the Session model from Jules API
type JulesSession struct {
	ID             string               `gorm:"primaryKey" json:"id"`
	SourceID       string               `json:"sourceId"`
	Title          string               `json:"title"`
	Status         string               `json:"status"` // 'active', 'completed', 'failed', 'paused', 'awaiting_approval'
	RawState       string               `json:"rawState"`
	Branch         string               `json:"branch"`
	Outputs        []JulesSessionOutput `json:"outputs,omitempty" gorm:"-"`
	LastActivityAt *time.Time           `json:"lastActivityAt"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt       `gorm:"index" json:"-"`
}

// JulesSessionOutput represents individual session artifacts
type JulesSessionOutput struct {
	PullRequest *PullRequestInfo `json:"pullRequest,omitempty"`
}

// PullRequestInfo represents basic GitHub PR details
type PullRequestInfo struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// JulesActivity represents an activity record from the Jules API
type JulesActivity struct {
	ID         string                 `json:"id"`
	SessionID  string                 `json:"sessionId"`
	Type       string                 `json:"type"` // 'message', 'plan', 'progress', 'result', 'error', 'debate'
	Role       string                 `json:"role"` // 'user', 'agent'
	Content    string                 `json:"content"`
	Diff       string                 `json:"diff,omitempty"`
	BashOutput string                 `json:"bashOutput,omitempty"`
	Media      *JulesMedia            `json:"media,omitempty"`
	CreatedAt  time.Time              `json:"createdAt"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// JulesMedia represents media artifacts in an activity
type JulesMedia struct {
	Data     string `json:"data"`
	MimeType string `json:"mimeType"`
}

// RepoPath maps a remote source ID to a local filesystem path
type RepoPath struct {
	ID        uint           `gorm:"primaryKey"`
	SourceID  string         `gorm:"uniqueIndex" json:"sourceId"` // e.g. robertpelloni/borg
	LocalPath string         `json:"localPath"`                   // e.g. C:/users/hyper/workspace/borg
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Notification represents a user-facing notification in the system
type Notification struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	Type        string         `gorm:"index" json:"type"` // 'info', 'success', 'warning', 'error', 'action'
	Category    string         `gorm:"index" json:"category"` // 'session', 'debate', 'recovery', 'indexing', 'issues', 'circuit_breaker', 'scheduler', 'webhook', 'system'
	Title       string         `json:"title"`
	Message     string         `json:"message"`
	SessionID   *string        `gorm:"index" json:"sessionId,omitempty"`
	SourceID    *string        `json:"sourceId,omitempty"`
	Metadata    *string        `json:"metadata,omitempty"`
	IsRead      bool           `gorm:"default:false;index" json:"isRead"`
	IsDismissed bool           `gorm:"default:false;index" json:"isDismissed"`
	Priority    int            `gorm:"default:0" json:"priority"` // 0=normal, 1=high, 2=critical
	CreatedAt   time.Time      `gorm:"index" json:"createdAt"`
	ReadAt      *time.Time     `json:"readAt,omitempty"`
	DismissedAt *time.Time     `json:"dismissedAt,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// AuditEntry represents an immutable audit trail entry
// Every orchestrator action is recorded here for compliance and debugging
 type AuditEntry struct {
	ID           string         `gorm:"primaryKey" json:"id"`
	Action       string         `gorm:"index" json:"action"` // e.g. 'session_nudged', 'plan_approved', 'recovery_sent'
	Actor        string         `gorm:"index" json:"actor"` // 'daemon', 'scheduler', 'circuit_breaker', 'operator', 'system'
	ResourceType string         `gorm:"index" json:"resourceType"` // 'session', 'debate', 'codebase', 'issue', 'job'
	ResourceID   string         `gorm:"index" json:"resourceId"`
	Status       string         `json:"status"` // 'success', 'failure', 'skipped'
	Summary      string         `json:"summary"`
	Details      *string        `json:"details,omitempty"`
	Provider     *string        `json:"provider,omitempty"`
	Model        *string        `json:"model,omitempty"`
	TokenUsage   *int           `json:"tokenUsage,omitempty"`
	DurationMs   *int64         `json:"durationMs,omitempty"`
	CreatedAt    time.Time      `gorm:"index" json:"createdAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// HealthSnapshot captures a point-in-time system health reading
// Used for trend analysis and anomaly detection
type HealthSnapshot struct {
	ID                string         `gorm:"primaryKey" json:"id"`
	Status            string         `json:"status"` // 'ok', 'degraded', 'down'
	DatabaseUp        bool           `json:"databaseUp"`
	DaemonRunning     bool           `json:"daemonRunning"`
	WorkerRunning     bool           `json:"workerRunning"`
	SchedulerRunning  bool           `json:"schedulerRunning"`
	PendingJobs       int            `json:"pendingJobs"`
	ProcessingJobs    int            `json:"processingJobs"`
	WSClients         int            `json:"wsClients"`
	Sessions          int            `json:"sessions"`
	CodeChunks        int            `json:"codeChunks"`
	MemoryChunks      int            `json:"memoryChunks"`
	Notifications     int            `json:"notifications"`
	AuditEntries      int            `json:"auditEntries"`
	ResponseTimeMs    int            `json:"responseTimeMs"`
	MemoryUsageMB     float64        `json:"memoryUsageMB"`
	GoroutineCount    int            `json:"goroutineCount"`
	CheckName         string         `json:"checkName,omitempty"` // Per-check dependency name
	Message           string         `json:"message,omitempty"`   // Per-check message
	Latency           int64          `json:"latency"`             // Per-check latency in ms
	CreatedAt         time.Time      `gorm:"index" json:"createdAt"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// TokenUsage tracks LLM token consumption per session and provider
type TokenUsage struct {
	ID               string         `gorm:"primaryKey" json:"id"`
	SessionID        *string        `gorm:"index" json:"sessionId,omitempty"`
	Provider         string         `gorm:"index" json:"provider"` // 'openai', 'anthropic', 'gemini'
	Model            string         `json:"model"`
	PromptTokens     int            `json:"promptTokens"`
	CompletionTokens int            `json:"completionTokens"`
	TotalTokens      int            `json:"totalTokens"`
	RequestType      string         `gorm:"index" json:"requestType"` // 'nudge', 'review', 'debate', 'risk_score', 'recovery', 'issue_eval', 'embedding', 'other'
	CostCents        float64        `json:"costCents"`
	DurationMs       int64          `json:"durationMs"`
	Success          bool           `json:"success"`
	CreatedAt        time.Time      `gorm:"index" json:"createdAt"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// AnomalyRecord represents a detected anomaly in the system
type AnomalyRecord struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	Type        string         `gorm:"index" json:"type"` // 'session_stuck', 'error_spike', 'token_overuse', 'queue_backlog', 'worker_down', 'circuit_breaker'
	Severity    string         `json:"severity"` // 'low', 'medium', 'high', 'critical'
	Title       string         `json:"title"`
	Description string         `json:"description"`
	SessionID   *string        `gorm:"index" json:"sessionId,omitempty"`
	Metadata    *string        `json:"metadata,omitempty"`
	IsResolved  bool           `gorm:"default:false;index" json:"isResolved"`
	ResolvedAt  *time.Time     `json:"resolvedAt,omitempty"`
	CreatedAt   time.Time      `gorm:"index" json:"createdAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// QueueJob represents the QueueJob model from Prisma

type ScheduledTask struct {
	ID         string      `gorm:"primaryKey" json:"id"`
	Name       string      `gorm:"uniqueIndex" json:"name"`
	IntervalMs int64       `json:"intervalMs"`
	JobType    string      `json:"jobType"`
	Payload    interface{} `gorm:"type:text" json:"payload"`
	IsEnabled  bool        `gorm:"default:true" json:"isEnabled"`
	LastRunAt  *time.Time  `json:"lastRunAt,omitempty"`
	NextRunAt  *time.Time  `json:"nextRunAt,omitempty"`
	CreatedAt  time.Time   `json:"createdAt"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

type QueueJob struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	Type        string         `json:"type"`
	Payload     string         `json:"payload"`
	Status      string         `gorm:"default:pending;index:idx_status_runat" json:"status"`
	Attempts    int            `gorm:"default:0" json:"attempts"`
	MaxAttempts int            `gorm:"default:3" json:"maxAttempts"`
	LastError   *string        `json:"lastError"`
	RunAt       time.Time      `gorm:"default:CURRENT_TIMESTAMP;index:idx_status_runat" json:"runAt"`
	StartedAt   *time.Time     `json:"startedAt"`
	CompletedAt *time.Time     `json:"completedAt"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Swarm represents a coordinated group of agents
type Swarm struct {
	ID            string     `gorm:"primaryKey" json:"id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	SourceRepo    string     `json:"sourceRepo,omitempty"`
	Strategy      string     `json:"strategy"`
	Status        string     `gorm:"index" json:"status"`
	ParentSwarmID *string    `json:"parentSwarmId,omitempty"`
	RootTask      string     `json:"rootTask"`
	Decomposition string     `json:"decomposition,omitempty"`
	SharedContext string     `json:"sharedContext,omitempty"`
	Metadata      string     `json:"metadata,omitempty"`
	CreatedAt     time.Time  `gorm:"index" json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}

// SwarmAgent represents a single agent in a swarm
type SwarmAgent struct {
	ID          string     `gorm:"primaryKey" json:"id"`
	SwarmID     string     `gorm:"index" json:"swarmId"`
	Role        string     `json:"role"`
	SessionID   *string    `json:"sessionId,omitempty"`
	Task        string     `json:"task"`
	Status      string     `gorm:"index" json:"status"`
	Output      string     `json:"output,omitempty"`
	Provider    string     `json:"provider,omitempty"`
	Model       string     `json:"model,omitempty"`
	DependsOn   string     `json:"dependsOn,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	StartedAt   *time.Time `json:"startedAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

// SwarmEvent records state changes in a swarm
type SwarmEvent struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	SwarmID   string    `gorm:"index" json:"swarmId"`
	AgentID   string    `json:"agentId,omitempty"`
	EventType string    `json:"eventType"`
	Message   string    `json:"message"`
	Data      string    `json:"data,omitempty"`
	CreatedAt time.Time `gorm:"index" json:"createdAt"`
}

// Plugin represents an installed plugin
type Plugin struct {
	ID           string         `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"uniqueIndex:idx_plugin_name_version" json:"name"`
	Version      string         `gorm:"uniqueIndex:idx_plugin_name_version" json:"version"`
	Author       string         `json:"author,omitempty"`
	Description  string         `json:"description,omitempty"`
	SourceURL    string         `json:"sourceUrl"`
	Signature    string         `json:"signature,omitempty"`
	Status       string         `gorm:"index" json:"status"`
	Capabilities string         `json:"capabilities,omitempty"` // JSON array
	Config       string         `json:"config,omitempty"`
	Size         int            `json:"size"`
	InstalledAt  time.Time      `gorm:"index" json:"installedAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
