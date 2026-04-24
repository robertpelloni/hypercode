package services

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

const (
	defaultPlanRiskScore     = 50
	lowRiskApprovalThreshold = 40
	recentActivityWindow     = 30 * time.Second
	chunkLineLimit           = 150
	maxIndexedFileSizeBytes  = 500000
)

// Worker represents the SQLite Task Queue worker
type Worker struct {
	concurrency int
	isRunning   bool
	stopChan    chan struct{}
	mu          sync.Mutex
}

// NewWorker creates a new queue worker
func NewWorker(concurrency int) *Worker {
	if concurrency <= 0 {
		concurrency = 2
	}
	return &Worker{
		concurrency: concurrency,
	}
}

// AddJob inserts a new job into the queue
func AddJob(jobType string, payload interface{}, runAt ...time.Time) (*models.QueueJob, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	scheduledTime := time.Now()
	if len(runAt) > 0 {
		scheduledTime = runAt[0]
	}

	job := &models.QueueJob{
		ID:          uuid.New().String(),
		Type:        jobType,
		Payload:     string(payloadBytes),
		Status:      "pending",
		RunAt:       scheduledTime,
		Attempts:    0,
		MaxAttempts: 3,
	}

	if err := db.DB.Create(job).Error; err != nil {
		return nil, fmt.Errorf("failed to create queue job: %w", err)
	}

	return job, nil
}

// Start begins polling for jobs
func (w *Worker) Start() {
	w.mu.Lock()
	if w.isRunning {
		w.mu.Unlock()
		return
	}
	w.isRunning = true
	w.stopChan = make(chan struct{})
	stopChan := w.stopChan
	concurrency := w.concurrency
	w.mu.Unlock()

	log.Printf("[Queue] SQLite Task Queue worker started (concurrency: %d)", concurrency)

	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if w.IsRunning() {
					w.processJobs()
				}
			case <-stopChan:
				return
			}
		}
	}()
}

// Stop halts the polling for jobs
func (w *Worker) Stop() {
	w.mu.Lock()
	if !w.isRunning {
		w.mu.Unlock()
		return
	}
	w.isRunning = false
	stopChan := w.stopChan
	w.stopChan = nil
	w.mu.Unlock()
	if stopChan != nil {
		close(stopChan)
	}
	log.Println("[Queue] SQLite Task Queue worker stopped")
}

func (w *Worker) IsRunning() bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.isRunning
}

func (w *Worker) processJobs() {
	var jobs []models.QueueJob
	now := time.Now()

	// Find pending jobs that are ready to run
	err := db.DB.Where("status = ? AND run_at <= ? AND attempts < max_attempts", "pending", now).
		Order("run_at ASC").
		Limit(w.concurrency).
		Find(&jobs).Error

	if err != nil {
		log.Printf("[Queue] Failed to fetch jobs: %v", err)
		return
	}

	if len(jobs) == 0 {
		return
	}

	for _, job := range jobs {
		// Run in goroutine to respect concurrency if needed,
		// but simple loop with goroutines works for now
		go w.executeJob(job)
	}
}

func (w *Worker) executeJob(job models.QueueJob) {
	// Mark as processing
	now := time.Now()
	err := db.DB.Model(&job).Updates(map[string]interface{}{
		"status":     "processing",
		"started_at": &now,
		"attempts":   job.Attempts + 1,
	}).Error

	if err != nil {
		log.Printf("[Queue] Failed to update job %s to processing: %v", job.ID, err)
		return
	}

	var result string
	var executeErr error

	// Handle job based on type
	switch job.Type {
	case "check_session":
		result, executeErr = w.handleCheckSession(job.Payload)
	case "index_codebase":
		result, executeErr = w.handleIndexCodebase(job.Payload)
	case "sync_session_memory":
		result, executeErr = w.handleSyncSessionMemory(job.Payload)
	case "check_issues":
		result, executeErr = w.handleCheckIssues(job.Payload)
	case "decompose_task":
		result, executeErr = w.handleDecomposeTask(job.Payload)
	case "ci_auto_fix":
		result, executeErr = w.handleCIAutoFix(job.Payload)
	default:
		executeErr = fmt.Errorf("unknown job type: %s", job.Type)
	}

	if executeErr != nil {
		errMsg := executeErr.Error()
		log.Printf("[Queue] Job %s failed: %s", job.ID, errMsg)

		// Determine if we should mark as 'failed' or back to 'pending' for retry
		status := "pending"
		if job.Attempts+1 >= job.MaxAttempts {
			status = "failed"
		}

		db.DB.Model(&job).Updates(map[string]interface{}{
			"status":     status,
			"last_error": &errMsg,
		})
		return
	}

	// Mark as completed
	completedAt := time.Now()
	db.DB.Model(&job).Updates(map[string]interface{}{
		"status":       "completed",
		"completed_at": &completedAt,
	})

	log.Printf("[Queue] Job %s (%s) completed: %s", job.ID[:8], job.Type, result)
}

// Handlers are currently stubs to be implemented as functionality is ported to Go

var (
	globalWorker   *Worker
	globalWorkerMu sync.Mutex
)

// StartWorker initializes and starts the global queue worker
func StartWorker() {
	globalWorkerMu.Lock()
	defer globalWorkerMu.Unlock()
	if globalWorker == nil {
		globalWorker = NewWorker(2)
	}
	globalWorker.Start()
}

func StopWorker() {
	globalWorkerMu.Lock()
	worker := globalWorker
	globalWorkerMu.Unlock()
	if worker != nil {
		worker.Stop()
	}
}

func IsWorkerRunning() bool {
	globalWorkerMu.Lock()
	worker := globalWorker
	globalWorkerMu.Unlock()
	if worker == nil {
		return false
	}
	return worker.IsRunning()
}

func getSettings() (models.KeeperSettings, error) {
	var settings models.KeeperSettings
	err := db.DB.First(&settings, "id = ?", "default").Error

	// Override with environment variables if present (Env-First Architecture)
	if envKey := os.Getenv("JULES_API_KEY"); envKey != "" {
		settings.JulesApiKey = &envKey
		settings.IsEnabled = true // Auto-enable if key is provided via ENV
	}
	if supervisorKey := os.Getenv("SUPERVISOR_API_KEY"); supervisorKey != "" {
		settings.SupervisorApiKey = &supervisorKey
	}
	if supervisorProvider := os.Getenv("SUPERVISOR_PROVIDER"); supervisorProvider != "" {
		settings.SupervisorProvider = supervisorProvider
	}
	if supervisorModel := os.Getenv("SUPERVISOR_MODEL"); supervisorModel != "" {
		settings.SupervisorModel = supervisorModel
	}

	return settings, err
}

func GetSettingsForAPI() (models.KeeperSettings, error) {
	return getSettings()
}

func parseMessages(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}

	var messages []string
	if err := json.Unmarshal([]byte(raw), &messages); err == nil {
		return messages
	}

	for _, line := range strings.Split(raw, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			messages = append(messages, trimmed)
		}
	}

	return messages
}

func isRiskyPlan(plan string) int {
	score := 10
	lower := strings.ToLower(plan)
	riskyKeywords := []string{
		"delete", "drop table", "schema", "migration", "auth", "permission",
		"security", "database", "state management", "websocket", "queue", "billing",
	}

	for _, keyword := range riskyKeywords {
		if strings.Contains(lower, keyword) {
			score += 15
		}
	}

	if len(plan) > 2000 {
		score += 10
	}
	if strings.Count(plan, "\n") > 25 {
		score += 10
	}
	if score > 100 {
		return 100
	}
	return score
}

func chooseNudgeMessage(settings models.KeeperSettings) string {
	messages := append(parseMessages(settings.Messages), parseMessages(settings.CustomMessages)...)
	for _, message := range messages {
		if strings.TrimSpace(message) != "" {
			return strings.TrimSpace(message)
		}
	}
	return "Please continue working on this task."
}

func buildRAGContext(query string, settings models.KeeperSettings, topK int) string {
	apiKey := getSupervisorAPIKey("openai", settings.SupervisorApiKey)
	if strings.TrimSpace(apiKey) == "" || apiKey == "placeholder" {
		return ""
	}

	results, err := QueryCodebase(query, apiKey, topK)
	if err != nil || len(results) == 0 {
		return ""
	}

	var context strings.Builder
	context.WriteString("\n\n[LOCAL_CONTEXT] - I found these relevant patterns in your fleet's memory that might help:\n\n")
	for _, res := range results {
		originLabel := "CURRENT CODEBASE"
		if res.Origin == "history" {
			originLabel = "HISTORICAL SUCCESS"
		}
		context.WriteString(fmt.Sprintf("[%s] File/Source: %s\n```\n%s\n```\n\n", originLabel, res.Filepath, res.Content))
	}
	return context.String()
}

func getSupervisorState(sessionID string) (models.SupervisorState, error) {
	var state models.SupervisorState
	err := db.DB.First(&state, "session_id = ?", sessionID).Error
	if err == nil {
		return state, nil
	}
	return models.SupervisorState{SessionID: sessionID}, nil
}

func saveSupervisorState(state models.SupervisorState) error {
	state.UpdatedAt = time.Now()
	return db.DB.Save(&state).Error
}

type planDebateResult struct {
	Summary        string
	RiskScore      int
	ApprovalStatus string
	RoundsJSON     string
	HistoryJSON    string
}

func approvalStatusFromRisk(score int) string {
	if score < lowRiskApprovalThreshold {
		return "approved"
	}
	if score > 70 {
		return "rejected"
	}
	return "pending"
}

func persistDebateRecord(session models.JulesSession, result planDebateResult) {
	summary := result.Summary
	metadataValue, _ := json.Marshal(map[string]interface{}{
		"sessionId":        session.ID,
		"sessionTitle":     session.Title,
		"riskScore":        result.RiskScore,
		"approvalStatus":   result.ApprovalStatus,
		"sourceId":         session.SourceID,
		"supervisorOrigin": "go",
	})
	metadata := string(metadataValue)
	workspaceID := "default"
	debate := models.Debate{
		ID:          uuid.New().String(),
		Topic:       fmt.Sprintf("Review Plan for Session %s", session.ID),
		Summary:     &summary,
		Rounds:      result.RoundsJSON,
		History:     result.HistoryJSON,
		Metadata:    &metadata,
		WorkspaceID: &workspaceID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_ = db.DB.Create(&debate).Error
}

func reviewPlanWithCouncil(session models.JulesSession, planText string, settings models.KeeperSettings) (planDebateResult, error) {
	provider := normalizeProvider(settings.SupervisorProvider)
	apiKey := getSupervisorAPIKey(provider, settings.SupervisorApiKey)
	if apiKey == "" {
		riskScore := isRiskyPlan(planText)
		return planDebateResult{
			Summary:        "Council debate unavailable because no supervisor API key is configured. Falling back to conservative heuristic risk handling.",
			RiskScore:      riskScore,
			ApprovalStatus: approvalStatusFromRisk(riskScore),
			RoundsJSON:     "[]",
			HistoryJSON:    "[]",
		}, nil
	}

	model := resolveModel(provider, settings.SupervisorModel)
	participants := []struct {
		ID, Name, Role, SystemPrompt string
	}{
		{
			ID:           "security-architect",
			Name:         "Security Architect",
			Role:         "Security & Architecture Reviewer",
			SystemPrompt: "You are a strict security architect. Review the proposed implementation plan for vulnerabilities, data leaks, unsafe migrations, architectural flaws, and missing verification. If the plan modifies core logic without adequate testing, say so clearly.",
		},
		{
			ID:           "senior-engineer",
			Name:         "Senior Engineer",
			Role:         "Code Quality Reviewer",
			SystemPrompt: "You are a senior frontend/backend engineer. Review the plan for code quality, edge cases, scope control, testability, and practical execution detail. Call out missing steps and suggest improvements.",
		},
	}

	conversation := []LLMMessage{{
		Role:    "user",
		Content: fmt.Sprintf("Please review the following implementation plan for session %s.\n\n%s", session.ID, planText),
	}}
	turns := make([]map[string]string, 0, len(participants))

	for _, participant := range participants {
		systemPrompt := fmt.Sprintf("You are %s, acting as a %s. Review the conversation history and provide concise, concrete review feedback.\n\n%s", participant.Name, participant.Role, participant.SystemPrompt)
		result, err := generateLLMText(provider, apiKey, model, systemPrompt, conversation)
		if err != nil {
			turns = append(turns, map[string]string{
				"participantId":   participant.ID,
				"participantName": participant.Name,
				"role":            participant.Role,
				"content":         fmt.Sprintf("[Error: %s]", err.Error()),
			})
			continue
		}

		turns = append(turns, map[string]string{
			"participantId":   participant.ID,
			"participantName": participant.Name,
			"role":            participant.Role,
			"content":         result.Content,
		})
		conversation = append(conversation, LLMMessage{
			Role:    "assistant",
			Content: fmt.Sprintf("[%s (%s)]: %s", participant.Name, participant.Role, result.Content),
		})
	}

	summaryPrompt := "You are the moderator and judge of this technical review debate. Summarize the strongest arguments, identify consensus/disagreement, and provide a final recommendation in Markdown."
	summaryResult, summaryErr := generateLLMText(provider, apiKey, model, summaryPrompt, conversation)
	summary := "Debate completed, but auto-summary generation failed."
	if summaryErr == nil && strings.TrimSpace(summaryResult.Content) != "" {
		summary = summaryResult.Content
	}

	riskScore := generateRiskScore(provider, apiKey, model, fmt.Sprintf("Review Plan for Session %s", session.ID), summary, isRiskyPlan(planText))

	roundsJSONBytes, _ := json.Marshal([]map[string]interface{}{{
		"roundNumber": 1,
		"turns":       turns,
	}})
	historyJSONBytes, _ := json.Marshal(conversation)

	result := planDebateResult{
		Summary:        summary,
		RiskScore:      riskScore,
		ApprovalStatus: approvalStatusFromRisk(riskScore),
		RoundsJSON:     string(roundsJSONBytes),
		HistoryJSON:    string(historyJSONBytes),
	}
	persistDebateRecord(session, result)
	return result, nil
}

func (w *Worker) handleCheckSession(payload string) (string, error) {
	var data struct {
		Session models.JulesSession `json:"session"`
	}
	if err := json.Unmarshal([]byte(payload), &data); err != nil {
		return "fail", fmt.Errorf("failed to parse check_session payload: %w", err)
	}

	if data.Session.ID == "" {
		return "none", fmt.Errorf("missing session in payload")
	}

	settings, err := getSettings()
	if err != nil {
		return "none", err
	}

	client := NewJulesClient()
	session, err := client.GetSession(data.Session.ID)
	if err != nil {
		return "fail", fmt.Errorf("failed to refresh session %s: %w", data.Session.ID, err)
	}

	lastActivityTime := session.UpdatedAt
	if session.LastActivityAt != nil {
		lastActivityTime = *session.LastActivityAt
	}

	supervisorState, _ := getSupervisorState(session.ID)
	if supervisorState.LastProcessedActivityTimestamp != nil {
		if t, err := time.Parse(time.RFC3339, *supervisorState.LastProcessedActivityTimestamp); err == nil {
			if lastActivityTime.After(t) {
				emitDaemonEvent("activities_updated", map[string]interface{}{"sessionId": session.ID})
			}
		}
	} else {
		emitDaemonEvent("activities_updated", map[string]interface{}{"sessionId": session.ID})
	}

	if session.RawState == "AWAITING_PLAN_APPROVAL" && settings.SmartPilotEnabled {
		activities, err := client.ListActivities(session.ID)
		if err == nil {
			for _, activity := range activities {
				if activity.Type != "plan" {
					continue
				}

				riskScore := isRiskyPlan(activity.Content)
				addKeeperLog(fmt.Sprintf("Plan Risk Score for %s is %d/100", session.ID[:8], riskScore), "info", session.ID, map[string]interface{}{
					"event":     "session_plan_risk_scored",
					"riskScore": riskScore,
				})

				if riskScore < lowRiskApprovalThreshold {
					if err := client.ApprovePlan(session.ID); err != nil {
						return "fail", err
					}
					addKeeperLog("Auto-approved low-risk plan from Go backend.", "action", session.ID, map[string]interface{}{
						"event":     "session_approved",
						"sessionId": session.ID,
					})
					emitDaemonEvent("activities_updated", map[string]interface{}{"sessionId": session.ID})
					emitDaemonEvent("session_approved", map[string]interface{}{"sessionId": session.ID, "sessionTitle": session.Title})
					return "plan_approved", nil
				}

				addKeeperLog("Plan risk is high. Escalating to council debate review path in Go backend.", "info", session.ID, map[string]interface{}{
					"event":     "session_debate_escalated",
					"riskScore": riskScore,
				})
				emitDaemonEvent("session_debate_escalated", map[string]interface{}{
					"sessionId":    session.ID,
					"sessionTitle": session.Title,
					"riskScore":    riskScore,
				})

				debateResult, debateErr := reviewPlanWithCouncil(session, activity.Content, settings)
				if debateErr != nil {
					return "fail", debateErr
				}

				addKeeperLog(fmt.Sprintf("Council debate concluded. Final Risk Score: %d", debateResult.RiskScore), "info", session.ID, map[string]interface{}{
					"event":          "session_debate_resolved",
					"riskScore":      debateResult.RiskScore,
					"approvalStatus": debateResult.ApprovalStatus,
					"summary":        debateResult.Summary,
				})
				emitDaemonEvent("session_debate_resolved", map[string]interface{}{
					"sessionId":      session.ID,
					"sessionTitle":   session.Title,
					"riskScore":      debateResult.RiskScore,
					"approvalStatus": debateResult.ApprovalStatus,
					"summary":        debateResult.Summary,
				})

				if debateResult.RiskScore < lowRiskApprovalThreshold || debateResult.ApprovalStatus == "approved" {
					if err := client.ApprovePlan(session.ID); err != nil {
						return "fail", err
					}
					_, _ = client.CreateActivity(session.ID, CreateActivityRequest{
						Content: fmt.Sprintf("Council Supervisor Debate Summary:\n\n%s\n\nThe plan has been approved. Proceed with implementation.", debateResult.Summary),
						Type:    "message",
						Role:    "user",
					})
					addKeeperLog("Council approved plan after debate. Auto-approving from Go backend.", "action", session.ID, map[string]interface{}{
						"event":          "session_approved",
						"sessionId":      session.ID,
						"riskScore":      debateResult.RiskScore,
						"approvalStatus": debateResult.ApprovalStatus,
					})
					emitDaemonEvent("activities_updated", map[string]interface{}{"sessionId": session.ID})
					emitDaemonEvent("session_approved", map[string]interface{}{"sessionId": session.ID, "sessionTitle": session.Title})
					return "plan_approved_by_council", nil
				}

				_, _ = client.CreateActivity(session.ID, CreateActivityRequest{
					Content: fmt.Sprintf("The Council Supervisor flagged the implementation plan as high-risk.\n\nDebate Summary:\n%s\n\nPlease revise the plan addressing these concerns and submit it for approval again.", debateResult.Summary),
					Type:    "message",
					Role:    "user",
				})
				addKeeperLog("Council rejected or flagged plan after debate. Manual revision required.", "error", session.ID, map[string]interface{}{
					"event":          "session_plan_flagged",
					"riskScore":      debateResult.RiskScore,
					"approvalStatus": debateResult.ApprovalStatus,
				})
				return "plan_flagged_by_council", nil
			}
		}
	}

	if session.RawState == "FAILED" && settings.SmartPilotEnabled {
		alreadyProcessedFailure := false
		if supervisorState.LastProcessedActivityTimestamp != nil {
			if t, err := time.Parse(time.RFC3339, *supervisorState.LastProcessedActivityTimestamp); err == nil && !lastActivityTime.After(t) {
				alreadyProcessedFailure = true
			}
		}

		if !alreadyProcessedFailure {
			activities, _ := client.ListActivities(session.ID)
			if hasRecentRecoveryGuidance(activities) || hasRecentRecoveryCompletionLog(session.ID, lastActivityTime) {
				timestamp := lastActivityTime.Format(time.RFC3339)
				supervisorState.LastProcessedActivityTimestamp = &timestamp
				_ = saveSupervisorState(supervisorState)
				addKeeperLog("Skipped duplicate recovery guidance because a recent recovery instruction is already present.", "skip", session.ID, map[string]interface{}{
					"event":        "session_recovery_skipped",
					"sessionTitle": session.Title,
				})
				return "recovery_already_present", nil
			}
			emitDaemonEvent("session_recovery_started", map[string]interface{}{
				"sessionId":    session.ID,
				"sessionTitle": session.Title,
			})
			addKeeperLog("Detected failed session. Generating recovery guidance from Go backend.", "info", session.ID, map[string]interface{}{
				"event":        "session_recovery_started",
				"sessionTitle": session.Title,
			})

			recoveryMessage := buildRecoveryMessage(session, activities, settings)
			if ragContext := buildRAGContext(session.Title, settings, 2); ragContext != "" {
				recoveryMessage += ragContext
			}

			if _, err := client.CreateActivity(session.ID, CreateActivityRequest{
				Content: recoveryMessage,
				Type:    "message",
				Role:    "user",
			}); err != nil {
				return "fail", err
			}

			addKeeperLog("Sent recovery guidance to failed session from Go backend.", "action", session.ID, map[string]interface{}{
				"event":        "session_recovery_completed",
				"sessionTitle": session.Title,
				"summary":      recoveryMessage,
			})
			emitDaemonEvent("session_recovery_completed", map[string]interface{}{
				"sessionId":    session.ID,
				"sessionTitle": session.Title,
				"summary":      recoveryMessage,
			})

			timestamp := lastActivityTime.Format(time.RFC3339)
			supervisorState.LastProcessedActivityTimestamp = &timestamp
			_ = saveSupervisorState(supervisorState)
			return "recovery_sent", nil
		}
	}

	if session.RawState == "COMPLETED" && settings.SmartPilotEnabled {
		var existing models.MemoryChunk
		if err := db.DB.First(&existing, "session_id = ?", session.ID).Error; err != nil {
			if _, addErr := AddJob("sync_session_memory", map[string]string{"sessionId": session.ID}); addErr == nil {
				addKeeperLog("Queued session memory sync from Go backend.", "info", session.ID, map[string]interface{}{"event": "session_memory_sync_enqueued"})
			}
		}
	}

	thresholdMinutes := settings.InactivityThresholdMinutes
	if session.RawState == "IN_PROGRESS" {
		thresholdMinutes = settings.ActiveWorkThresholdMinutes
		if time.Since(lastActivityTime) < recentActivityWindow {
			return "none", nil
		}
	}

	if time.Since(lastActivityTime) > time.Duration(thresholdMinutes)*time.Minute && session.RawState != "AWAITING_PLAN_APPROVAL" {
		message := chooseNudgeMessage(settings)
		ragContext := ""
		if settings.SmartPilotEnabled {
			query := session.Title
			if strings.TrimSpace(query) == "" {
				query = "recent development activity"
			}
			ragContext = buildRAGContext(query, settings, 3)
		}
		finalMessage := message + ragContext
		if _, err := client.CreateActivity(session.ID, CreateActivityRequest{
			Content: finalMessage,
			Type:    "message",
			Role:    "user",
		}); err != nil {
			return "fail", err
		}

		addKeeperLog(
			fmt.Sprintf("Sending nudge to %s (%dm inactive)", session.ID[:8], int(time.Since(lastActivityTime).Minutes())),
			"action",
			session.ID,
			map[string]interface{}{
				"event":           "session_nudged",
				"sessionTitle":    session.Title,
				"inactiveMinutes": int(time.Since(lastActivityTime).Minutes()),
				"nudgeMessage":    message,
				"usedRAG":         ragContext != "",
			},
		)
		emitDaemonEvent("activities_updated", map[string]interface{}{"sessionId": session.ID})
		emitDaemonEvent("session_nudged", map[string]interface{}{
			"sessionId":       session.ID,
			"sessionTitle":    session.Title,
			"inactiveMinutes": int(time.Since(lastActivityTime).Minutes()),
			"message":         message,
		})

		timestamp := lastActivityTime.Format(time.RFC3339)
		supervisorState.LastProcessedActivityTimestamp = &timestamp
		_ = saveSupervisorState(supervisorState)
		return "nudged", nil
	}

	timestamp := lastActivityTime.Format(time.RFC3339)
	supervisorState.LastProcessedActivityTimestamp = &timestamp
	_ = saveSupervisorState(supervisorState)
	return "none", nil
}

func hasRecentRecoveryGuidance(activities []models.JulesActivity) bool {
	limit := 6
	if len(activities) < limit {
		limit = len(activities)
	}
	for i := len(activities) - 1; i >= 0 && i >= len(activities)-limit; i-- {
		activity := activities[i]
		if activity.Role == "user" && strings.Contains(activity.Content, "Recovery Guidance:") {
			return true
		}
	}
	return false
}

func hasRecentRecoveryCompletionLog(sessionID string, since time.Time) bool {
	var count int64
	_ = db.DB.Model(&models.KeeperLog{}).
		Where("session_id = ? AND message = ? AND created_at >= ?", sessionID, "Sent recovery guidance to failed session from Go backend.", since.Add(-2*time.Minute)).
		Count(&count).Error
	return count > 0
}

func buildRecoveryMessage(session models.JulesSession, activities []models.JulesActivity, settings models.KeeperSettings) string {
	provider := strings.TrimSpace(settings.SupervisorProvider)
	if provider == "" {
		provider = "openai"
	}
	apiKey := getSupervisorAPIKey(provider, settings.SupervisorApiKey)

	recentActivities := activities
	if len(recentActivities) > 6 {
		recentActivities = recentActivities[len(recentActivities)-6:]
	}

	var activityContext strings.Builder
	for _, activity := range recentActivities {
		role := strings.ToUpper(activity.Role)
		if role == "" {
			role = "SYSTEM"
		}
		activityContext.WriteString(fmt.Sprintf("%s [%s]: %s\n\n", role, activity.Type, activity.Content))
	}

	basePrompt := fmt.Sprintf("A Jules session has entered the FAILED state.\nSession: %s\nTitle: %s\n\nRecent activity:\n%s\nProvide a concise recovery plan and direct next-step instruction for the coding agent. Keep it practical and actionable.", session.ID, session.Title, activityContext.String())

	if strings.TrimSpace(apiKey) != "" && apiKey != "placeholder" {
		result, err := generateLLMText(provider, apiKey, settings.SupervisorModel, "You are a recovery supervisor helping an AI coding agent recover from a failed execution. Be concise, practical, and specific.", []LLMMessage{{
			Role:    "user",
			Content: basePrompt,
		}})
		if err == nil && strings.TrimSpace(result.Content) != "" {
			return "Recovery Guidance:\n\n" + result.Content
		}
	}

	return "Recovery Guidance:\n\nThe session appears to have failed. Review the most recent error, identify the last successful step, fix the immediate cause, and continue with a revised plan. If a prior assumption was wrong, state it explicitly before proceeding."
}

func getProjectRoot() string {
	candidates := []string{filepath.Clean("."), filepath.Clean("..")}
	for _, candidate := range candidates {
		if info, err := os.Stat(filepath.Join(candidate, "src")); err == nil && info.IsDir() {
			return candidate
		}
	}
	return filepath.Clean("..")
}

func getIndexRoot(dir string) string {
	root := getProjectRoot()
	candidate := filepath.Clean(filepath.Join(root, dir))
	if info, err := os.Stat(candidate); err == nil && info.IsDir() {
		return candidate
	}
	return candidate
}

func shouldIndexFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".ts", ".tsx", ".js", ".jsx", ".md":
		return true
	default:
		return false
	}
}

func collectIndexFiles(dir string) ([]string, error) {
	root := getIndexRoot(dir)
	var files []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() {
			name := info.Name()
			if name == "node_modules" || name == "dist" || strings.HasPrefix(name, ".") {
				return filepath.SkipDir
			}
			return nil
		}

		if !shouldIndexFile(path) {
			return nil
		}

		rel, relErr := filepath.Rel(getProjectRoot(), path)
		if relErr != nil {
			rel = path
		}
		files = append(files, filepath.ToSlash(rel))
		return nil
	})

	return files, err
}

func computeChecksum(content string) string {
	sum := sha256.Sum256([]byte(content))
	return fmt.Sprintf("%x", sum)
}

func fetchEmbedding(input, apiKey string) ([]byte, error) {
	payload, _ := json.Marshal(map[string]string{
		"input": input,
		"model": "text-embedding-3-small",
	})

	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/embeddings", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("embedding request failed with status %d", resp.StatusCode)
	}

	var body struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	if len(body.Data) == 0 {
		return nil, fmt.Errorf("embedding response contained no vectors")
	}

	buf := new(bytes.Buffer)
	for _, value := range body.Data[0].Embedding {
		if err := binary.Write(buf, binary.LittleEndian, float32(value)); err != nil {
			return nil, err
		}
	}

	return buf.Bytes(), nil
}

func (w *Worker) handleIndexCodebase(payload string) (string, error) {
	return IndexCodebase()
}

func IndexCodebase() (string, error) {
	settings, err := getSettings()
	if err != nil {
		return "skip", err
	}

	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" && settings.SupervisorApiKey != nil {
		apiKey = strings.TrimSpace(*settings.SupervisorApiKey)
	}
	if apiKey == "" || apiKey == "placeholder" {
		return "skip", nil
	}

	addKeeperLog("Starting Go codebase indexing run.", "info", "global", map[string]interface{}{"event": "codebase_index_started"})
	emitDaemonEvent("codebase_index_started", map[string]interface{}{
		"scope": "default",
	})

	directories := []string{"src", "lib", "server", "components", "packages"}
	var allFiles []string
	for _, dir := range directories {
		files, err := collectIndexFiles(dir)
		if err != nil {
			continue
		}
		allFiles = append(allFiles, files...)
	}

	newChunks := 0
	for _, relativePath := range allFiles {
		fullPath := filepath.Join(getProjectRoot(), filepath.FromSlash(relativePath))

		contentBytes, err := os.ReadFile(fullPath)
		if err != nil || len(contentBytes) > maxIndexedFileSizeBytes {
			continue
		}

		content := string(contentBytes)
		lines := strings.Split(content, "\n")
		for i := 0; i < len(lines); i += chunkLineLimit {
			endIndex := i + chunkLineLimit
			if endIndex > len(lines) {
				endIndex = len(lines)
			}

			chunkText := strings.Join(lines[i:endIndex], "\n")
			startLine := i + 1
			endLine := endIndex
			checksum := computeChecksum(chunkText)
			chunkID := fmt.Sprintf("chunk-%s-%d", relativePath, startLine)

			var existing models.CodeChunk
			if err := db.DB.First(&existing, "id = ?", chunkID).Error; err == nil && existing.Checksum == checksum {
				continue
			}

			embedding, err := fetchEmbedding(chunkText, apiKey)
			if err != nil {
				continue
			}

			chunk := models.CodeChunk{
				ID:          chunkID,
				WorkspaceID: "default",
				Filepath:    relativePath,
				StartLine:   startLine,
				EndLine:     endLine,
				Content:     chunkText,
				Embedding:   embedding,
				Checksum:    checksum,
			}

			if err := db.DB.Where("id = ?", chunkID).Assign(chunk).FirstOrCreate(&chunk).Error; err == nil {
				newChunks++
			}
			time.Sleep(100 * time.Millisecond)
		}
	}

	addKeeperLog("Completed Go codebase indexing run.", "info", "global", map[string]interface{}{
		"event":             "codebase_index_completed",
		"newChunks":         newChunks,
		"totalFilesScanned": len(allFiles),
	})
	emitDaemonEvent("codebase_index_completed", map[string]interface{}{
		"newChunks":         newChunks,
		"totalFilesScanned": len(allFiles),
	})
	return fmt.Sprintf("indexed:%d", newChunks), nil
}

func (w *Worker) handleSyncSessionMemory(payload string) (string, error) {
	var data struct {
		SessionID string `json:"sessionId"`
	}
	json.Unmarshal([]byte(payload), &data)

	client := NewJulesClient()

	// 1. Send memory request prompt
	prompt := "Please provide a comprehensive summary of everything you've learned about this project's architecture, patterns, and decisions in Markdown format. Start your response with [PROJECT_MEMORY]."
	_, err := client.CreateActivity(data.SessionID, CreateActivityRequest{
		Content: prompt,
		Role:    "user",
		Type:    "message",
	})
	if err != nil {
		return "fail", fmt.Errorf("failed to send sync prompt: %v", err)
	}

	// 2. Poll for agent response (max 30 seconds)
	var memoryContent string
	for i := 0; i < 6; i++ {
		time.Sleep(5 * time.Second)
		activities, err := client.ListActivities(data.SessionID)
		if err != nil {
			continue
		}

		// Find the response to our prompt
		if len(activities) > 0 {
			last := activities[len(activities)-1]
			if last.Role == "agent" && strings.Contains(last.Content, "[PROJECT_MEMORY]") {
				memoryContent = strings.Replace(last.Content, "[PROJECT_MEMORY]", "", 1)
				memoryContent = strings.TrimSpace(memoryContent)
				break
			}
		}
	}

	if memoryContent == "" {
		return "fail", fmt.Errorf("agent did not provide [PROJECT_MEMORY] response in time")
	}

	// 3. Resolve path and save memory
	session, _ := client.GetSession(data.SessionID)
	basePath := resolveRepoPath(session.SourceID)

	memDir := fmt.Sprintf("%s/.jules/memory", basePath)
	os.MkdirAll(memDir, 0755)
	os.WriteFile(fmt.Sprintf("%s/architecture.md", memDir), []byte(memoryContent), 0644)

	// 4. Also perform full chat export
	activities, _ := client.ListActivities(data.SessionID)
	var md strings.Builder
	md.WriteString(fmt.Sprintf("# %s\n\n", session.Title))
	md.WriteString(fmt.Sprintf("**Session ID:** %s\n", session.ID))
	md.WriteString(fmt.Sprintf("**Source:** %s\n\n", session.SourceID))
	md.WriteString("## Activity Log\n\n")

	for _, a := range activities {
		role := "Agent"
		if a.Role == "user" {
			role = "User"
		}
		md.WriteString(fmt.Sprintf("### %s (%s)\n\n", role, a.CreatedAt.Format(time.RFC1123)))
		md.WriteString(a.Content + "\n\n---\n\n")
	}

	sessDir := fmt.Sprintf("%s/.jules/sessions", basePath)
	os.MkdirAll(sessDir, 0755)
	os.WriteFile(fmt.Sprintf("%s/%s.md", sessDir, data.SessionID), []byte(md.String()), 0644)

	return "done", nil
}

func resolveRepoPath(sourceId string) string {
	var mapping models.RepoPath
	result := db.DB.Where("source_id = ?", sourceId).First(&mapping)
	if result.Error == nil && mapping.LocalPath != "" {
		return mapping.LocalPath
	}

	// Default to C:/Users/hyper/workspace/[reponame]
	repoName := sourceId
	if strings.Contains(sourceId, "/") {
		parts := strings.Split(sourceId, "/")
		repoName = parts[len(parts)-1]
	}

	return "C:/Users/hyper/workspace/" + repoName
}

type issueEvaluation struct {
	IsFixable      bool   `json:"isFixable"`
	Confidence     int    `json:"confidence"`
	SuggestedTitle string `json:"suggestedTitle"`
	Reasoning      string `json:"reasoning"`
}

func heuristicIssueEvaluation(issue GitHubIssue) issueEvaluation {
	content := strings.ToLower(issue.Title + "\n" + issue.Body)
	score := 45

	positiveSignals := []string{"bug", "fix", "error", "broken", "failing", "feature", "add", "implement", "support", "regression"}
	for _, signal := range positiveSignals {
		if strings.Contains(content, signal) {
			score += 8
		}
	}

	negativeSignals := []string{"question", "discussion", "investigate", "maybe", "unclear", "wip", "research", "spike"}
	for _, signal := range negativeSignals {
		if strings.Contains(content, signal) {
			score -= 12
		}
	}

	if len(strings.TrimSpace(issue.Body)) > 80 {
		score += 10
	}
	if len(strings.TrimSpace(issue.Title)) > 12 {
		score += 5
	}
	if strings.Contains(content, "steps to reproduce") || strings.Contains(content, "expected") || strings.Contains(content, "actual") {
		score += 10
	}

	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return issueEvaluation{
		IsFixable:      score >= 70,
		Confidence:     score,
		SuggestedTitle: fmt.Sprintf("Issue #%d: %s", issue.Number, issue.Title),
		Reasoning:      "Heuristic issue triage based on clarity, specificity, and likely code-only scope.",
	}
}

func evaluateIssueWithProvider(issue GitHubIssue, sourceID string, settings models.KeeperSettings, apiKey string) (issueEvaluation, error) {
	provider := normalizeProvider(settings.SupervisorProvider)
	model := resolveModel(provider, settings.SupervisorModel)

	prompt := fmt.Sprintf(`Evaluate if the following GitHub issue is "Self-Healable" by an AI coding agent.
Target Repository: %s
Issue Title: %s
Issue Body: %s

Criteria for "Self-Healable":
1. Clear bug description or feature request.
2. Non-ambiguous requirements.
3. Does not require complex multi-step human interaction.

Respond with JSON only:
{
  "isFixable": true,
  "confidence": 0,
  "suggestedTitle": "Short descriptive title for the session",
  "reasoning": "Short explanation"
}`,
		sourceID,
		issue.Title,
		issue.Body,
	)

	var evaluation issueEvaluation
	if err := generateStructuredJSON(provider, apiKey, model, "You are a technical lead evaluating project issues for autonomous coding agents. Respond with JSON only.", []LLMMessage{{
		Role:    "user",
		Content: prompt,
	}}, &evaluation); err != nil {
		return issueEvaluation{}, err
	}
	if evaluation.SuggestedTitle == "" {
		evaluation.SuggestedTitle = fmt.Sprintf("Issue #%d: %s", issue.Number, issue.Title)
	}
	return evaluation, nil
}

func evaluateIssue(issue GitHubIssue, sourceID string, settings models.KeeperSettings) issueEvaluation {
	apiKey := getSupervisorAPIKey(settings.SupervisorProvider, settings.SupervisorApiKey)
	if apiKey != "" && apiKey != "placeholder" {
		if evaluation, err := evaluateIssueWithProvider(issue, sourceID, settings, apiKey); err == nil {
			return evaluation
		}
	}

	return heuristicIssueEvaluation(issue)
}

func (w *Worker) handleCheckIssues(payload string) (string, error) {
	var data struct {
		SourceID string `json:"sourceId"`
	}
	if err := json.Unmarshal([]byte(payload), &data); err != nil {
		return "fail", fmt.Errorf("failed to parse check_issues payload: %w", err)
	}
	if strings.TrimSpace(data.SourceID) == "" {
		return "none", fmt.Errorf("missing sourceId in check_issues payload")
	}

	settings, err := getSettings()
	if err != nil {
		return "none", err
	}

	client := NewJulesClient()
	addKeeperLog(fmt.Sprintf("Checking GitHub issues for %s...", data.SourceID), "info", "global", map[string]interface{}{
		"event":    "issue_check_started",
		"sourceId": data.SourceID,
	})
	emitDaemonEvent("issue_check_started", map[string]interface{}{
		"sourceId": data.SourceID,
	})

	issues, err := client.ListIssues(data.SourceID)
	if err != nil {
		return "fail", err
	}
	if len(issues) == 0 {
		return "none", nil
	}

	sessions, err := client.ListSessions()
	if err != nil {
		return "fail", err
	}
	activeTitles := make([]string, 0, len(sessions))
	for _, session := range sessions {
		activeTitles = append(activeTitles, strings.ToLower(session.Title))
	}

	for _, issue := range issues {
		issueTitleLower := strings.ToLower(issue.Title)
		duplicate := false
		for _, title := range activeTitles {
			if strings.Contains(title, issueTitleLower) || strings.Contains(issueTitleLower, title) {
				duplicate = true
				break
			}
		}
		if duplicate {
			continue
		}

		evaluation := evaluateIssue(issue, data.SourceID, settings)
		addKeeperLog(fmt.Sprintf("Evaluated issue #%d for %s (confidence=%d)", issue.Number, data.SourceID, evaluation.Confidence), "info", "global", map[string]interface{}{
			"event":       "issue_evaluated",
			"sourceId":    data.SourceID,
			"issueNumber": issue.Number,
			"issueTitle":  issue.Title,
			"confidence":  evaluation.Confidence,
			"isFixable":   evaluation.IsFixable,
		})
		emitDaemonEvent("issue_evaluated", map[string]interface{}{
			"sourceId":    data.SourceID,
			"issueNumber": issue.Number,
			"issueTitle":  issue.Title,
			"confidence":  evaluation.Confidence,
			"isFixable":   evaluation.IsFixable,
		})

		if !evaluation.IsFixable || evaluation.Confidence <= 70 {
			continue
		}

		prompt := fmt.Sprintf("Fix issue #%d: %s\n\nContext:\n%s", issue.Number, issue.Title, issue.Body)
		newSession, err := client.CreateSession(data.SourceID, prompt, evaluation.SuggestedTitle)
		if err != nil {
			return "fail", err
		}

		addKeeperLog(fmt.Sprintf("Autonomous session spawn for issue: %s", issue.Title), "action", "global", map[string]interface{}{
			"event":        "issue_session_spawned",
			"sourceId":     data.SourceID,
			"issueNumber":  issue.Number,
			"issueTitle":   issue.Title,
			"sessionId":    newSession.ID,
			"sessionTitle": newSession.Title,
		})
		emitDaemonEvent("issue_session_spawned", map[string]interface{}{
			"sourceId":     data.SourceID,
			"issueNumber":  issue.Number,
			"issueTitle":   issue.Title,
			"sessionId":    newSession.ID,
			"sessionTitle": newSession.Title,
		})
		emitDaemonEvent("sessions_list_updated", map[string]interface{}{})
		return fmt.Sprintf("session_spawned:%s", newSession.ID), nil
	}

	return "none", nil
}

func (w *Worker) handleDecomposeTask(payload string) (string, error) {
	var p struct {
		SwarmID string `json:"swarmId"`
		Task    string `json:"task"`
		Context string `json:"context"`
	}
	if err := json.Unmarshal([]byte(payload), &p); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	result, err := DecomposeTask(DecomposeTaskRequest{
		Task:        p.Task,
		Context:     p.Context,
		MaxSubtasks: 5,
	})
	if err != nil {
		return "", err
	}

	if err := AssignSwarmAgents(p.SwarmID, result); err != nil {
		return "", err
	}

	return fmt.Sprintf("decomposed:%d_subtasks", len(result.SubTasks)), nil
}

func (w *Worker) handleCIAutoFix(payload string) (string, error) {
	var p struct {
		FailureID   string `json:"failureId"`
		RepoPath    string `json:"repoPath"`
		SourceID    string `json:"sourceId"`
		Stage       string `json:"stage"`
		FixStrategy string `json:"fixStrategy"`
	}
	if err := json.Unmarshal([]byte(payload), &p); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	// For now, log the auto-fix attempt and record the analysis
	addKeeperLog(fmt.Sprintf("CI auto-fix attempted for %s (%s)", p.SourceID, p.Stage), "action", "global", map[string]interface{}{
		"event":       "ci_auto_fix",
		"sourceId":    p.SourceID,
		"stage":       p.Stage,
		"fixStrategy": p.FixStrategy,
	})

	// In a full implementation, this would:
	// 1. Check out the branch
	// 2. Apply the suggested fix
	// 3. Run tests
	// 4. Commit and push if tests pass

	return fmt.Sprintf("ci_auto_fix_analyzed:%s", p.Stage), nil
}
