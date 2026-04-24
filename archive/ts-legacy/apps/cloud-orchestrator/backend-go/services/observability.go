package services

import (
	"encoding/json"
	"fmt"
	"runtime"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

var (
	observabilityMu     sync.Mutex
	lastSnapshotTime    time.Time
	snapshotInterval    = 5 * time.Minute
	lastAnomalyCheck    time.Time
	anomalyCheckInterval = 2 * time.Minute
)

// RecordTokenUsage logs an LLM token usage event
func RecordTokenUsage(sessionID *string, provider, model string, promptTokens, completionTokens int, requestType string, durationMs int64, success bool) error {
	database := db.DB
	if database == nil {
		return fmt.Errorf("database not initialized")
	}

	costCents := estimateCostCents(provider, model, promptTokens, completionTokens)

	usage := models.TokenUsage{
		ID:               uuid.New().String(),
		SessionID:        sessionID,
		Provider:         provider,
		Model:            model,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TotalTokens:      promptTokens + completionTokens,
		RequestType:      requestType,
		CostCents:        costCents,
		DurationMs:       durationMs,
		Success:          success,
	}

	return database.Create(&usage).Error
}

// estimateCostCents provides rough cost estimates in cents (USD)
func estimateCostCents(provider, model string, promptTokens, completionTokens int) float64 {
	// Cost per 1M tokens (simplified, in cents)
	var promptCostPer1M, completionCostPer1M float64

	switch provider {
	case "openai":
		switch model {
		case "gpt-4o":
			promptCostPer1M = 250       // $2.50/1M
			completionCostPer1M = 1000   // $10.00/1M
		case "gpt-4o-mini":
			promptCostPer1M = 15        // $0.15/1M
			completionCostPer1M = 60    // $0.60/1M
		case "o1", "o1-preview":
			promptCostPer1M = 1500      // $15.00/1M
			completionCostPer1M = 6000  // $60.00/1M
		default:
			promptCostPer1M = 250
			completionCostPer1M = 1000
		}
	case "anthropic":
		switch model {
		case "claude-3.5-sonnet", "claude-3-5-sonnet-20241022":
			promptCostPer1M = 300       // $3.00/1M
			completionCostPer1M = 1500  // $15.00/1M
		case "claude-3-opus", "claude-3-opus-20240229":
			promptCostPer1M = 1500      // $15.00/1M
			completionCostPer1M = 7500  // $75.00/1M
		default:
			promptCostPer1M = 300
			completionCostPer1M = 1500
		}
	case "gemini":
		promptCostPer1M = 125          // $1.25/1M
		completionCostPer1M = 500      // $5.00/1M
	default:
		promptCostPer1M = 250
		completionCostPer1M = 1000
	}

	promptCost := float64(promptTokens) / 1_000_000 * promptCostPer1M
	completionCost := float64(completionTokens) / 1_000_000 * completionCostPer1M
	return promptCost + completionCost
}

// CaptureHealthSnapshot captures current system state as a HealthSnapshot
func CaptureHealthSnapshot(healthData map[string]interface{}) error {
	database := db.DB
	if database == nil {
		return fmt.Errorf("database not initialized")
	}

	observabilityMu.Lock()
	defer observabilityMu.Unlock()

	// Rate-limit snapshots
	if time.Since(lastSnapshotTime) < snapshotInterval {
		return nil
	}
	lastSnapshotTime = time.Now()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	snapshot := models.HealthSnapshot{
		ID:               uuid.New().String(),
		Status:           getStr(healthData, "status"),
		DatabaseUp:       getNestedStr(healthData, "checks", "database", "status") == "ok",
		DaemonRunning:    getNestedBool(healthData, "checks", "daemon", "running"),
		WorkerRunning:    getNestedBool(healthData, "checks", "worker", "running"),
		SchedulerRunning: getNestedBool(healthData, "checks", "scheduler", "running"),
		PendingJobs:      getNestedInt(healthData, "queue", "pending"),
		ProcessingJobs:   getNestedInt(healthData, "queue", "processing"),
		WSClients:        getNestedInt(healthData, "realtime", "wsClients"),
		Sessions:         getNestedInt(healthData, "totals", "sessions"),
		CodeChunks:       getNestedInt(healthData, "totals", "codeChunks"),
		MemoryChunks:     getNestedInt(healthData, "totals", "memoryChunks"),
		Notifications:    getNestedInt(healthData, "totals", "notifications"),
		AuditEntries:     getNestedInt(healthData, "totals", "auditEntries"),
		MemoryUsageMB:    float64(m.Alloc) / 1024 / 1024,
		GoroutineCount:   runtime.NumGoroutine(),
	}

	return database.Create(&snapshot).Error
}

// GetHealthHistory returns recent health snapshots
func GetHealthHistory(hours int, limit int) ([]models.HealthSnapshot, error) {
	database := db.DB
	if database == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	var snapshots []models.HealthSnapshot
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)

	err := database.Where("created_at > ?", cutoff).
		Order("created_at DESC").
		Limit(limit).
		Find(&snapshots).Error

	return snapshots, err
}

// GetTokenUsageStats returns aggregate token usage statistics
func GetTokenUsageStats(opts ...TokenUsageOpt) (*TokenUsageReport, error) {
	database := db.DB
	if database == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	o := &TokenUsageOptions{}
	for _, opt := range opts {
		opt(o)
	}

	query := database.Model(&models.TokenUsage{})
	if o.Since != nil {
		query = query.Where("created_at > ?", *o.Since)
	}
	if o.Provider != "" {
		query = query.Where("provider = ?", o.Provider)
	}
	if o.SessionID != "" {
		query = query.Where("session_id = ?", o.SessionID)
	}

	var totalUsage []models.TokenUsage
	if err := query.Find(&totalUsage).Error; err != nil {
		return nil, err
	}

	report := &TokenUsageReport{
		ByProvider:   make(map[string]ProviderStats),
		ByRequestType: make(map[string]RequestTypeStats),
	}

	for _, u := range totalUsage {
		report.TotalRequests++
		report.TotalPromptTokens += u.PromptTokens
		report.TotalCompletionTokens += u.CompletionTokens
		report.TotalTokens += u.TotalTokens
		report.TotalCostCents += u.CostCents
		if !u.Success {
			report.FailedRequests++
		}

		ps, ok := report.ByProvider[u.Provider]
		if !ok {
			ps = ProviderStats{}
		}
		ps.Requests++
		ps.PromptTokens += u.PromptTokens
		ps.CompletionTokens += u.CompletionTokens
		ps.TotalTokens += u.TotalTokens
		ps.CostCents += u.CostCents
		report.ByProvider[u.Provider] = ps

		rs, ok := report.ByRequestType[u.RequestType]
		if !ok {
			rs = RequestTypeStats{}
		}
		rs.Requests++
		rs.TotalTokens += u.TotalTokens
		rs.CostCents += u.CostCents
		report.ByRequestType[u.RequestType] = rs
	}

	return report, nil
}

// TokenUsageOptions for filtering token usage queries
type TokenUsageOptions struct {
	Since     *time.Time
	Provider  string
	SessionID string
}

type TokenUsageOpt func(*TokenUsageOptions)

func WithTokenSince(t time.Time) TokenUsageOpt {
	return func(o *TokenUsageOptions) { o.Since = &t }
}

func WithTokenProvider(p string) TokenUsageOpt {
	return func(o *TokenUsageOptions) { o.Provider = p }
}

func WithTokenSession(id string) TokenUsageOpt {
	return func(o *TokenUsageOptions) { o.SessionID = id }
}

// TokenUsageReport is the aggregate token usage report
type TokenUsageReport struct {
	TotalRequests       int                           `json:"totalRequests"`
	TotalPromptTokens   int                           `json:"totalPromptTokens"`
	TotalCompletionTokens int                         `json:"totalCompletionTokens"`
	TotalTokens         int                           `json:"totalTokens"`
	TotalCostCents      float64                       `json:"totalCostCents"`
	FailedRequests      int                           `json:"failedRequests"`
	ByProvider          map[string]ProviderStats      `json:"byProvider"`
	ByRequestType       map[string]RequestTypeStats   `json:"byRequestType"`
}

// ProviderStats tracks per-provider aggregate stats
type ProviderStats struct {
	Requests         int     `json:"requests"`
	PromptTokens     int     `json:"promptTokens"`
	CompletionTokens int     `json:"completionTokens"`
	TotalTokens      int     `json:"totalTokens"`
	CostCents        float64 `json:"costCents"`
}

// RequestTypeStats tracks per-request-type aggregate stats
type RequestTypeStats struct {
	Requests  int     `json:"requests"`
	TotalTokens int   `json:"totalTokens"`
	CostCents  float64 `json:"costCents"`
}

// DetectAnomalies checks for system anomalies and creates records
func DetectAnomalies() ([]models.AnomalyRecord, error) {
	database := db.DB
	if database == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	observabilityMu.Lock()
	if time.Since(lastAnomalyCheck) < anomalyCheckInterval {
		observabilityMu.Unlock()
		return nil, nil
	}
	lastAnomalyCheck = time.Now()
	observabilityMu.Unlock()

	var anomalies []models.AnomalyRecord

	// Check 1: Queue backlog (too many pending jobs)
	var pendingCount int64
	database.Model(&models.QueueJob{}).Where("status = ? AND run_at < ?", "pending", time.Now().Add(-30*time.Minute)).Count(&pendingCount)
	if pendingCount > 10 {
		anomalies = append(anomalies, createAnomaly("queue_backlog", "high",
			"Queue backlog detected",
			fmt.Sprintf("%d jobs have been pending for over 30 minutes", pendingCount), nil))
	}

	// Check 2: Recent error spike in token usage
	var recentFailures int64
	recentCutoff := time.Now().Add(-1 * time.Hour)
	database.Model(&models.TokenUsage{}).Where("success = ? AND created_at > ?", false, recentCutoff).Count(&recentFailures)
	if recentFailures > 5 {
		anomalies = append(anomalies, createAnomaly("error_spike", "medium",
			"LLM error spike detected",
			fmt.Sprintf("%d failed LLM requests in the last hour", recentFailures), nil))
	}

	// Check 3: Token overuse (> $10 in last 24h)
	var dailyCost float64
	dailyCutoff := time.Now().Add(-24 * time.Hour)
	database.Model(&models.TokenUsage{}).Where("created_at > ?", dailyCutoff).Select("COALESCE(SUM(cost_cents), 0)").Row().Scan(&dailyCost)
	if dailyCost > 1000 { // $10.00 in cents
		anomalies = append(anomalies, createAnomaly("token_overuse", "high",
			"Token budget overuse detected",
			fmt.Sprintf("$%.2f spent in the last 24 hours (threshold: $10.00)", dailyCost/100), nil))
	}

	// Check 4: Stuck sessions (active for > 4 hours)
	var stuckSessions []models.JulesSession
	database.Where("status = ? AND updated_at < ?", "active", time.Now().Add(-4*time.Hour)).Limit(10).Find(&stuckSessions)
	for _, s := range stuckSessions {
		metaBytes, _ := json.Marshal(map[string]string{"sessionId": s.ID, "title": s.Title})
		_ = metaBytes
		anomalies = append(anomalies, createAnomaly("session_stuck", "medium",
			"Potentially stuck session",
			fmt.Sprintf("Session '%s' has been active for over 4 hours without update", s.Title), &s.ID))
	}

	// Check 5: Circuit breaker trips from recent audit entries
	var cbTrips int64
	database.Model(&models.AuditEntry{}).Where("action = ? AND created_at > ?", "circuit_breaker_tripped", time.Now().Add(-1*time.Hour)).Count(&cbTrips)
	if cbTrips > 3 {
		anomalies = append(anomalies, createAnomaly("circuit_breaker", "critical",
			"Circuit breaker instability",
			fmt.Sprintf("%d circuit breaker trips in the last hour", cbTrips), nil))
	}

	// Persist new anomalies (skip duplicates within last 30 min)
	for i := range anomalies {
		var existing int64
		database.Model(&models.AnomalyRecord{}).Where(
			"type = ? AND title = ? AND is_resolved = ? AND created_at > ?",
			anomalies[i].Type, anomalies[i].Title, false, time.Now().Add(-30*time.Minute),
		).Count(&existing)
		if existing == 0 {
			database.Create(&anomalies[i])
		}
	}

	return anomalies, nil
}

func createAnomaly(anomalyType, severity, title, description string, sessionID *string) models.AnomalyRecord {
	return models.AnomalyRecord{
		ID:          uuid.New().String(),
		Type:        anomalyType,
		Severity:    severity,
		Title:       title,
		Description: description,
		SessionID:   sessionID,
		IsResolved:  false,
	}
}

// GetActiveAnomalies returns all unresolved anomalies
func GetActiveAnomalies() ([]models.AnomalyRecord, error) {
	database := db.DB
	if database == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	var anomalies []models.AnomalyRecord
	err := database.Where("is_resolved = ?", false).
		Order("created_at DESC").
		Find(&anomalies).Error
	return anomalies, err
}

// ResolveAnomaly marks an anomaly as resolved
func ResolveAnomaly(id string) error {
	database := db.DB
	if database == nil {
		return fmt.Errorf("database not initialized")
	}

	now := time.Now()
	return database.Model(&models.AnomalyRecord{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_resolved": true,
			"resolved_at": now,
		}).Error
}

// GetAnomalyHistory returns resolved anomalies
func GetAnomalyHistory(limit int) ([]models.AnomalyRecord, error) {
	database := db.DB
	if database == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	var anomalies []models.AnomalyRecord
	err := database.Where("is_resolved = ?", true).
		Order("resolved_at DESC").
		Limit(limit).
		Find(&anomalies).Error
	return anomalies, err
}

// Helper functions for nested map access
func getStr(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return "unknown"
}

func getNestedStr(m map[string]interface{}, keys ...string) string {
	current := m
	for i, key := range keys {
		if i == len(keys)-1 {
			if v, ok := current[key]; ok {
				if s, ok := v.(string); ok {
					return s
				}
			}
			return ""
		}
		if v, ok := current[key]; ok {
			if nested, ok := v.(map[string]interface{}); ok {
				current = nested
			} else {
				return ""
			}
		} else {
			return ""
		}
	}
	return ""
}

func getNestedBool(m map[string]interface{}, keys ...string) bool {
	current := m
	for i, key := range keys {
		if i == len(keys)-1 {
			if v, ok := current[key]; ok {
				switch val := v.(type) {
				case bool:
					return val
				case string:
					return val == "ok" || val == "true" || val == "running"
				}
			}
			return false
		}
		if v, ok := current[key]; ok {
			if nested, ok := v.(map[string]interface{}); ok {
				current = nested
			} else {
				return false
			}
		} else {
			return false
		}
	}
	return false
}

func getNestedInt(m map[string]interface{}, keys ...string) int {
	current := m
	for i, key := range keys {
		if i == len(keys)-1 {
			if v, ok := current[key]; ok {
				switch val := v.(type) {
				case int:
					return val
				case int64:
					return int(val)
				case float64:
					return int(val)
				}
			}
			return 0
		}
		if v, ok := current[key]; ok {
			if nested, ok := v.(map[string]interface{}); ok {
				current = nested
			} else {
				return 0
			}
		} else {
			return 0
		}
	}
	return 0
}
