package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
	"github.com/jules-autopilot/backend/services"
)

// Global WebSocket clients management
var (
	ActiveClients = make(map[*websocket.Conn]bool)
	ClientsMutex  sync.Mutex
)

// Broadcast sends a message to all connected WebSocket clients
func Broadcast(message interface{}) {
	ClientsMutex.Lock()
	defer ClientsMutex.Unlock()

	// Add a small artificial delay to avoid hammering the browser/socket 
	// during high-volume events (like startup sync)
	time.Sleep(50 * time.Millisecond)

	for client := range ActiveClients {
		if err := client.WriteJSON(message); err != nil {
			log.Printf("WebSocket broadcast error: %v", err)
			client.Close()
			delete(ActiveClients, client)
		}
	}
}

func getProjectRoot() string {
	candidates := []string{filepath.Clean("."), filepath.Clean("..")}
	for _, candidate := range candidates {
		if info, err := os.Stat(filepath.Join(candidate, "package.json")); err == nil && !info.IsDir() {
			return candidate
		}
	}
	return filepath.Clean("..")
}

func getVersion() string {
	versionPath := filepath.Clean(filepath.Join(getProjectRoot(), "VERSION"))
	content, err := os.ReadFile(versionPath)
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(content))
}

func getJulesClientForRequest(c *fiber.Ctx) *services.JulesClient {
	headerKey := strings.TrimSpace(c.Get("X-Jules-Api-Key"))
	if headerKey == "" {
		headerKey = strings.TrimSpace(c.Get("X-Goog-Api-Key"))
	}
	if headerKey == "" {
		headerKey = strings.TrimSpace(c.Get("X-Jules-Auth-Token"))
	}
	return services.NewJulesClient(headerKey)
}

func getPing(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok", "time": time.Now().Format(time.RFC3339)})
}

func getManifest(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"id":      "jules-autopilot-go-node-1",
		"name":    "Jules Autopilot Go Backend",
		"version": getVersion(),
		"capabilities": []string{
			"cloud_session_management",
			"semantic_rag_indexing",
			"queue_telemetry",
			"session_replay",
			"submodule_intelligence",
			"webhook_ingestion",
		},
		"endpoints": fiber.Map{
			"sessions":   "/api/sessions",
			"summary":    "/api/fleet/summary",
			"replay":     "/api/sessions/:id/replay",
			"submodules": "/api/system/submodules",
		},
		"borgCompatible": true,
	})
}

func getFleetSummary(c *fiber.Ctx) error {
	var sessions []models.JulesSession
	if err := db.DB.Find(&sessions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	statusCounts := map[string]int{}
	for _, session := range sessions {
		statusCounts[session.Status]++
	}

	var pendingCount, processingCount, chunkCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)
	db.DB.Model(&models.CodeChunk{}).Count(&chunkCount)

	var recentLogs []models.KeeperLog
	db.DB.Where("type = ?", "action").Order("created_at desc").Limit(5).Find(&recentLogs)

	actions := make([]fiber.Map, 0, len(recentLogs))
	for _, entry := range recentLogs {
		actions = append(actions, fiber.Map{
			"message": entry.Message,
			"time":    entry.CreatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"timestamp": time.Now().Format(time.RFC3339),
		"fleet": fiber.Map{
			"total":    len(sessions),
			"byStatus": statusCounts,
		},
		"orchestrator": fiber.Map{
			"queueDepth":              pendingCount + processingCount,
			"isActive":                processingCount > 0,
			"recentAutonomousActions": actions,
		},
		"knowledgeBase": fiber.Map{
			"totalChunks": chunkCount,
			"isIndexed":   chunkCount > 0,
		},
		"borgReady": true,
	})
}

func getSystemSubmodules(c *fiber.Ctx) error {
	cmd := exec.Command("git", "submodule", "status")
	cmd.Dir = filepath.Clean("..")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("failed to fetch submodules: %v", err)
		return c.JSON(fiber.Map{"submodules": []fiber.Map{}})
	}

	var submodules []fiber.Map
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		statusChar := string(line[0])
		fullHash := strings.TrimLeft(parts[0], " +-")
		pathValue := parts[1]
		ref := "unknown"
		if len(parts) > 2 {
			ref = strings.Trim(strings.Join(parts[2:], " "), "()")
		}
		status := "uninitialized"
		if statusChar == " " {
			status = "synced"
		} else if statusChar == "+" {
			status = "modified"
		}
		hash := fullHash
		if len(hash) > 7 {
			hash = hash[:7]
		}
		submodules = append(submodules, fiber.Map{
			"name":     filepath.Base(pathValue),
			"path":     pathValue,
			"hash":     hash,
			"fullHash": fullHash,
			"ref":      ref,
			"status":   status,
		})
	}

	return c.JSON(fiber.Map{"submodules": submodules})
}

func getSessionReplay(c *fiber.Ctx) error {
	id := c.Params("id")
	client := getJulesClientForRequest(c)

	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	activities, err := client.ListActivities(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	timeline := make([]fiber.Map, 0, len(activities))
	for _, activity := range activities {
		timeline = append(timeline, fiber.Map{
			"id":         activity.ID,
			"timestamp":  activity.CreatedAt,
			"role":       activity.Role,
			"type":       activity.Type,
			"content":    activity.Content,
			"hasDiff":    activity.Diff != "",
			"hasCommand": activity.BashOutput != "",
		})
	}

	return c.JSON(fiber.Map{
		"sessionId": id,
		"title":     session.Title,
		"status":    session.Status,
		"createdAt": session.CreatedAt,
		"timeline":  timeline,
	})
}

func getSession(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "critical-err" {
		return c.JSON(fiber.Map{"id": id, "title": "API Error Log", "status": "failed", "rawState": "FAILED"})
	}
	if strings.HasPrefix(id, "mock-") {
		return c.JSON(fiber.Map{"id": id, "title": "Mock Session", "status": "active", "rawState": "ACTIVE"})
	}

	client := getJulesClientForRequest(c)
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(session)
}

func postDebate(c *fiber.Ctx) error {
	var body services.DebateRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	result, err := services.RunDebate(body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}

func getDebateHistory(c *fiber.Ctx) error {
	var debates []models.Debate
	if err := db.DB.Order("created_at desc").Find(&debates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	items := make([]fiber.Map, 0, len(debates))
	for _, debate := range debates {
		summary := any(nil)
		if debate.Summary != nil {
			summary = *debate.Summary
		}
		items = append(items, fiber.Map{
			"id":        debate.ID,
			"topic":     debate.Topic,
			"summary":   summary,
			"createdAt": debate.CreatedAt,
		})
	}
	return c.JSON(items)
}

func getDebateByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var debate models.Debate
	if err := db.DB.First(&debate, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Debate not found"})
	}
	result, err := services.ParseStoredDebate(debate)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}

func deleteDebate(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.Debate{}, "id = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func getSessionActivities(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "critical-err" || strings.HasPrefix(id, "mock-") {
		return c.JSON(fiber.Map{"activities": []interface{}{}})
	}

	client := getJulesClientForRequest(c)
	activities, err := client.ListActivities(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(activities)
}

func getExport(c *fiber.Ctx) error {
	var keeperSettings []models.KeeperSettings
	var templates []models.SessionTemplate
	var debates []models.Debate
	var repoPaths []models.RepoPath

	_ = db.DB.Find(&keeperSettings).Error
	_ = db.DB.Find(&templates).Error
	_ = db.DB.Find(&debates).Error
	_ = db.DB.Find(&repoPaths).Error

	return c.JSON(fiber.Map{
		"version":        getVersion(),
		"exportedAt":     time.Now().Format(time.RFC3339),
		"keeperSettings": keeperSettings,
		"templates":      templates,
		"debates":        debates,
		"repoPaths":      repoPaths,
	})
}

func postImport(c *fiber.Ctx) error {
	var body struct {
		KeeperSettings []models.KeeperSettings  `json:"keeperSettings"`
		Templates      []models.SessionTemplate `json:"templates"`
		Debates        []models.Debate          `json:"debates"`
		RepoPaths      []models.RepoPath        `json:"repoPaths"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	for _, item := range body.KeeperSettings {
		item.UpdatedAt = time.Now()
		_ = db.DB.Save(&item).Error
	}
	for _, item := range body.Templates {
		item.UpdatedAt = time.Now()
		if item.ID == "" {
			item.ID = uuid.New().String()
		}
		_ = db.DB.Save(&item).Error
	}
	for _, item := range body.Debates {
		item.UpdatedAt = time.Now()
		if item.ID == "" {
			item.ID = uuid.New().String()
		}
		_ = db.DB.Save(&item).Error
	}
	for _, item := range body.RepoPaths {
		item.UpdatedAt = time.Now()
		_ = db.DB.Save(&item).Error
	}

	return c.JSON(fiber.Map{"success": true})
}

func postReview(c *fiber.Ctx) error {
	var body services.ReviewRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	content, err := services.RunCodeReview(body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"content": content})
}

func postRAGQuery(c *fiber.Ctx) error {
	var body struct {
		Query string `json:"query"`
		TopK  int    `json:"topK"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if strings.TrimSpace(body.Query) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query is required"})
	}

	settings, _ := services.GetSettingsForAPI()
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" && settings.SupervisorApiKey != nil {
		apiKey = strings.TrimSpace(*settings.SupervisorApiKey)
	}
	if apiKey == "" || apiKey == "placeholder" {
		return c.Status(401).JSON(fiber.Map{"error": "OpenAI API key is required for RAG"})
	}

	results, err := services.QueryCodebase(body.Query, apiKey, body.TopK)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"results": results})
}

func getFSList(c *fiber.Ctx) error {
	queryPath := c.Query("path", ".")
	projectRoot, err := filepath.Abs(getProjectRoot())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	targetPath, err := filepath.Abs(filepath.Join(projectRoot, queryPath))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if !strings.HasPrefix(targetPath, projectRoot) {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}

	entries, err := os.ReadDir(targetPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	files := make([]fiber.Map, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasPrefix(name, ".") || name == "node_modules" {
			continue
		}
		entryPath := filepath.Join(targetPath, name)
		rel, relErr := filepath.Rel(projectRoot, entryPath)
		if relErr != nil {
			rel = name
		}
		files = append(files, fiber.Map{
			"name":        name,
			"isDirectory": entry.IsDir(),
			"path":        filepath.ToSlash(rel),
		})
	}

	return c.JSON(fiber.Map{"files": files})
}

func getFSRead(c *fiber.Ctx) error {
	queryPath := c.Query("path")
	if strings.TrimSpace(queryPath) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Path required"})
	}
	projectRoot, err := filepath.Abs(getProjectRoot())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	targetPath, err := filepath.Abs(filepath.Join(projectRoot, queryPath))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if !strings.HasPrefix(targetPath, projectRoot) {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}
	info, err := os.Stat(targetPath)
	if err != nil || info.IsDir() {
		return c.Status(404).JSON(fiber.Map{"error": "File not found"})
	}

	content, err := os.ReadFile(targetPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"content": string(content)})
}

func postBorgWebhook(c *fiber.Ctx) error {
	var payload struct {
		Type   string                 `json:"type"`
		Source string                 `json:"source"`
		Data   map[string]interface{} `json:"data"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	logMessage := fmt.Sprintf("Received collective signal: %s from %s", payload.Type, payload.Source)
	if payload.Source == "" {
		logMessage = fmt.Sprintf("Received collective signal: %s", payload.Type)
	}

	entry := models.KeeperLog{
		ID:        fmt.Sprintf("hook-%d", time.Now().UnixNano()),
		SessionID: "global",
		Type:      "info",
		Message:   logMessage,
		CreatedAt: time.Now(),
	}
	db.DB.Create(&entry)
	Broadcast(fiber.Map{"type": "log_added", "data": fiber.Map{"log": entry}})
	Broadcast(fiber.Map{"type": "borg_signal_received", "data": fiber.Map{
		"type":      payload.Type,
		"source":    payload.Source,
		"data":      payload.Data,
		"timestamp": time.Now().Format(time.RFC3339),
	}})

	if payload.Type == "repo_updated" {
		_, _ = services.AddJob("index_codebase", map[string]string{})
	}
	if payload.Type == "dependency_alert" {
		log.Printf("[Webhooks] Borg Dependency Alert: %v", payload.Data)
	}
	if payload.Type == "fleet_command" {
		if action, ok := payload.Data["action"].(string); ok {
			if action == "reindex_all" {
				_, _ = services.AddJob("index_codebase", map[string]string{})
			} else if action == "clear_logs" {
				db.DB.Where("1 = 1").Delete(&models.KeeperLog{})
			}
		}
	}
	if payload.Type == "issue_detected" {
		if sourceID, ok := payload.Data["sourceId"].(string); ok && sourceID != "" {
			_, _ = services.AddJob("check_issues", map[string]string{"sourceId": sourceID})
		}
	}

	return c.JSON(fiber.Map{"success": true, "processed": true})
}

func postRAGReindex(c *fiber.Ctx) error {
	if _, err := services.AddJob("index_codebase", map[string]string{}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Codebase indexing job enqueued"})
}

// SetupRoutes registers all API routes
func SetupRoutes(app *fiber.App) {
	services.SetBroadcaster(Broadcast)

	app.Get("/metrics", getMetrics)
	app.Get("/healthz", getHealth)

	api := app.Group("/api")

	api.Get("/ping", getPing)
	api.Get("/health", getHealth)
	api.Get("/manifest", getManifest)
	api.Get("/export", getExport)
	api.Post("/import", postImport)
	api.Get("/fleet/summary", getFleetSummary)
	api.Get("/system/submodules", getSystemSubmodules)
	api.Get("/sessions/:id/replay", getSessionReplay)
	api.Get("/sessions/:id", getSession)
	api.Get("/sessions/:id/activities", getSessionActivities)
	api.Post("/debate", postDebate)
	api.Get("/debate/history", getDebateHistory)
	api.Get("/debate/:id", getDebateByID)
	api.Delete("/debate/:id", deleteDebate)
	api.Post("/review", postReview)
	api.Post("/local/review", postReview)
	api.Post("/rag/query", postRAGQuery)
	api.Post("/rag/reindex", postRAGReindex)
	api.Post("/webhooks/borg", postBorgWebhook)
	api.Post("/webhooks/hypercode", postBorgWebhook)
	api.Post("/webhooks/github", postGitHubWebhook)
	api.Post("/webhooks/slack", postSlackWebhook)
	api.Post("/webhooks/linear", postLinearWebhook)
	api.Post("/webhooks/generic", postGenericWebhook)

	// Webhook rule management
	api.Get("/webhooks/rules", getWebhookRulesAPI)
	api.Post("/webhooks/rules", addWebhookRuleAPI)
	api.Delete("/webhooks/rules/:id", deleteWebhookRuleAPI)
	api.Patch("/webhooks/rules/:id/toggle", toggleWebhookRuleAPI)

	// Swarm orchestration
	api.Post("/swarms", createSwarmAPI)
	api.Get("/swarms", listSwarmsAPI)
	api.Get("/swarms/:id", getSwarmAPI)
	api.Get("/swarms/:id/agents", getSwarmAgentsAPI)
	api.Get("/swarms/:id/events", getSwarmEventsAPI)
	api.Post("/swarms/:id/cancel", cancelSwarmAPI)
	api.Post("/swarms/:id/decompose", decomposeSwarmAPI)

	// Predictive cost optimizer
	api.Get("/cost/predict", predictCostAPI)
	api.Get("/cost/providers", getProviderProfilesAPI)
	api.Get("/cost/budget", getBudgetReportAPI)
	api.Get("/cost/trend", getSpendingTrendAPI)
	api.Get("/cost/optimize/:taskType", optimizeProviderAPI)

	// CI monitoring
	api.Post("/ci/monitor", runCIMonitorAPI)
	api.Get("/ci/failures", getCIFailuresAPI)

	// Plugin management
	api.Get("/plugins", listPluginsAPI)
	api.Get("/plugins/stats", getPluginStatsAPI)
	api.Get("/plugins/:id", getPluginAPI)
	api.Post("/plugins/install", installPluginAPI)
	api.Post("/plugins/:id/enable", enablePluginAPI)
	api.Post("/plugins/:id/disable", disablePluginAPI)
	api.Delete("/plugins/:id", uninstallPluginAPI)
	api.Patch("/plugins/:id/config", updatePluginConfigAPI)

	// Wasm sandbox
	api.Get("/sandbox/status", getSandboxStatusAPI)
	api.Post("/sandbox/warmup", warmupSandboxAPI)
	api.Post("/sandbox/execute/:pluginId", executePluginAPI)
	api.Post("/sandbox/validate", validateWasmAPI)

	// Workspace budget enforcement
	api.Get("/budget/status", getBudgetStatusesAPI)
	api.Get("/budget/stats", getBudgetStatsAPI)
	api.Get("/budget/:workspaceId", getBudgetStatusAPI)
	api.Post("/budget/:workspaceId", setBudgetAPI)
	api.Post("/budget/:workspaceId/check", checkBudgetAPI)
	api.Delete("/budget/:workspaceId", removeBudgetAPI)

	// Vector index
	api.Get("/rag/index/stats", getVectorIndexStatsAPI)
	api.Post("/rag/index/rebuild", rebuildVectorIndexAPI)

	// Metrics & SLA monitoring
	api.Get("/metrics/dashboard", getMetricsDashboardAPI)
	api.Get("/metrics/names", getMetricNamesAPI)
	api.Get("/metrics/:name", getMetricSummaryAPI)
	api.Get("/metrics/sla/targets", getSLATargetsAPI)
	api.Post("/metrics/sla/targets", registerSLATargetAPI)

	// Agent performance scoring
	api.Get("/agents/scores", getAgentScoresAPI)
	api.Get("/agents/leaderboard/:role", getAgentLeaderboardAPI)
	api.Get("/agents/leaderboards", getAllAgentLeaderboardsAPI)
	api.Get("/agents/stats", getAgentStatsAPI)
	api.Get("/agents/recommend/:role", recommendProviderAPI)
	api.Get("/agents/provider-efficiency", getProviderEfficiencyAPI)
	api.Post("/agents/record", recordAgentTaskAPI)
	api.Delete("/agents/:agentId", resetAgentScoreAPI)

	// AST modification tracking
	api.Post("/ast/analyze", analyzeASTAPI)
	api.Get("/ast/modifications", getASTModificationsAPI)
	api.Get("/ast/stats", getASTStatsAPI)

	// Workflow tracing
	api.Post("/traces", startTraceAPI)
	api.Get("/traces", listTracesAPI)
	api.Get("/traces/active", getActiveTracesAPI)
	api.Get("/traces/stats", getTraceStatsAPI)
	api.Get("/traces/:traceId", getTraceAPI)
	api.Post("/traces/:traceId/steps", addTraceStepAPI)
	api.Post("/traces/:traceId/steps/:stepId/complete", completeStepAPI)
	api.Post("/traces/:traceId/finish", finishTraceAPI)
	api.Post("/traces/:traceId/cancel", cancelTraceAPI)

	// Daemon routes
	api.Get("/daemon/status", getDaemonStatus)
	api.Post("/daemon/status", postDaemonStatus)

	// Settings routes
	api.Get("/settings/keeper", getKeeperSettings)
	api.Post("/settings/keeper", updateKeeperSettings)

	// Session routes
	api.Get("/sessions", getSessions)
	api.Patch("/sessions/:id", patchSession)
	api.Post("/sessions/:id/activities", createActivity)
	api.Post("/sessions/:idAndAction", handleSessionAction)
	api.Post("/sessions/:id/export-to-repo", exportSessionToRepo)
	api.Post("/sessions/:id/save-memory", saveSessionMemory)
	api.Post("/sessions/:id/nudge", nudgeSession)

	// Broadcast route
	api.Post("/broadcast", postBroadcast)

	// Fleet sync route
	api.Post("/fleet/sync", triggerFleetSync)

	// Template routes
	api.Get("/templates", listTemplates)
	api.Post("/templates", createTemplate)
	api.Put("/templates/:id", updateTemplate)
	api.Delete("/templates/:id", deleteTemplate)

	// Repo mapping routes
	api.Get("/repos/paths", getRepoPaths)
	api.Post("/repos/paths", updateRepoPath)

	// API Key routes
	api.Get("/keys", getApiKeys)
	api.Post("/keys", createApiKey)
	api.Delete("/keys/:id", deleteApiKey)

	// Scheduler routes
	api.Get("/scheduler", getSchedulerTasks)
	api.Post("/scheduler/:name/trigger", triggerSchedulerTask)

	// File system routes
	api.Get("/fs/list", getFSList)
	api.Get("/fs/read", getFSRead)

	// Notification routes
	api.Get("/notifications", getNotifications)
	api.Post("/notifications/:id/read", markNotificationRead)
	api.Post("/notifications/read-all", markAllNotificationsRead)
	api.Post("/notifications/:id/dismiss", dismissNotification)
	api.Post("/notifications/dismiss-all", dismissAllNotificationsAPI)
	api.Get("/notifications/unread-count", getUnreadNotificationCountAPI)

	// Audit routes
	api.Get("/audit", getAuditEntries)
	api.Get("/audit/stats", getAuditStatsAPI)

	// Observability routes (Deep Health)
	api.Get("/health/history", getHealthHistory)
	api.Get("/health/anomalies", getActiveAnomalies)
	api.Post("/health/anomalies/:id/resolve", resolveAnomalyAPI)
	api.Get("/health/anomalies/history", getAnomalyHistory)

	// Token usage routes
	api.Get("/tokens/usage", getTokenUsageStats)
	api.Get("/tokens/session/:id", getSessionTokenUsage)

	// Shadow Pilot routes
	api.Get("/shadow-pilot/status", getShadowPilotStatus)
	api.Post("/shadow-pilot/start", startShadowPilotAPI)
	api.Post("/shadow-pilot/stop", stopShadowPilotAPI)

	// Dependency checks
	api.Get("/health/dependencies", getDependencyChecks)
	api.Get("/health/trend", getHealthTrend)
	api.Get("/system/info", getSystemInfoAPI)

	// Scheduled tasks CRUD
	api.Get("/scheduler/tasks", getScheduledTasks)
	api.Post("/scheduler/tasks", createScheduledTask)
	api.Delete("/scheduler/tasks/:name", deleteScheduledTask)
}

func triggerFleetSync(c *fiber.Ctx) error {
	client := getJulesClientForRequest(c)
	sessions, err := client.ListSessions()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sessions: " + err.Error()})
	}

	syncCount := 0
	sourceIDs := map[string]struct{}{}
	for _, s := range sessions {
		if strings.TrimSpace(s.SourceID) != "" {
			sourceIDs[s.SourceID] = struct{}{}
		}

		// Only sync active or recently completed sessions
		if s.Status == "active" || s.Status == "completed" || s.Status == "awaiting_approval" {
			payload := map[string]string{
				"sessionId": s.ID,
			}
			_, err := services.AddJob("sync_session_memory", payload)
			if err == nil {
				syncCount++
			}
		}
	}

	var repoPaths []models.RepoPath
	if err := db.DB.Find(&repoPaths).Error; err == nil {
		for _, path := range repoPaths {
			if strings.TrimSpace(path.SourceID) != "" {
				sourceIDs[path.SourceID] = struct{}{}
			}
		}
	}

	issueCount := 0
	for sourceID := range sourceIDs {
		_, err := services.AddJob("check_issues", map[string]string{"sourceId": sourceID})
		if err == nil {
			issueCount++
		}
	}

	_, _ = services.AddJob("index_codebase", map[string]string{})

	return c.JSON(fiber.Map{
		"success":            true,
		"message":            fmt.Sprintf("Enqueued %d memory sync jobs, %d issue-check jobs, and a codebase indexing job", syncCount, issueCount),
		"syncJobCount":       syncCount,
		"issueCheckJobCount": issueCount,
	})
}

type sessionTemplateResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Prompt      string    `json:"prompt"`
	Title       *string   `json:"title,omitempty"`
	IsFavorite  bool      `json:"isFavorite,omitempty"`
	IsPrebuilt  bool      `json:"isPrebuilt,omitempty"`
	Tags        []string  `json:"tags,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func parseTemplateTags(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw), &tags); err == nil {
		return tags
	}
	for _, part := range strings.Split(raw, ",") {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			tags = append(tags, trimmed)
		}
	}
	return tags
}

func formatTemplateTags(tags []string) string {
	if len(tags) == 0 {
		return "[]"
	}
	payload, err := json.Marshal(tags)
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func mapTemplateResponse(template models.SessionTemplate) sessionTemplateResponse {
	return sessionTemplateResponse{
		ID:          template.ID,
		Name:        template.Name,
		Description: template.Description,
		Prompt:      template.Prompt,
		Title:       template.Title,
		IsFavorite:  template.IsFavorite,
		IsPrebuilt:  template.IsPrebuilt,
		Tags:        parseTemplateTags(template.Tags),
		CreatedAt:   template.CreatedAt,
		UpdatedAt:   template.UpdatedAt,
	}
}

func listTemplates(c *fiber.Ctx) error {
	var templates []models.SessionTemplate
	if err := db.DB.Order("updated_at desc").Find(&templates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	response := make([]sessionTemplateResponse, 0, len(templates))
	for _, template := range templates {
		response = append(response, mapTemplateResponse(template))
	}
	return c.JSON(response)
}

func createTemplate(c *fiber.Ctx) error {
	var body struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Prompt      string   `json:"prompt"`
		Title       string   `json:"title"`
		Tags        []string `json:"tags"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if strings.TrimSpace(body.Name) == "" || strings.TrimSpace(body.Prompt) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name and prompt are required"})
	}

	now := time.Now()
	workspaceID := "default"
	var titlePtr *string
	if strings.TrimSpace(body.Title) != "" {
		title := strings.TrimSpace(body.Title)
		titlePtr = &title
	}
	template := models.SessionTemplate{
		ID:          uuid.New().String(),
		Name:        body.Name,
		Description: body.Description,
		Prompt:      body.Prompt,
		Title:       titlePtr,
		Tags:        formatTemplateTags(body.Tags),
		WorkspaceID: &workspaceID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := db.DB.Create(&template).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(mapTemplateResponse(template))
}

func updateTemplate(c *fiber.Ctx) error {
	id := c.Params("id")
	var template models.SessionTemplate
	if err := db.DB.First(&template, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Template not found"})
	}

	var body struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Prompt      *string  `json:"prompt"`
		Title       *string  `json:"title"`
		Tags        []string `json:"tags"`
		IsFavorite  *bool    `json:"isFavorite"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.Name != nil {
		template.Name = *body.Name
	}
	if body.Description != nil {
		template.Description = *body.Description
	}
	if body.Prompt != nil {
		template.Prompt = *body.Prompt
	}
	if body.Title != nil {
		trimmed := strings.TrimSpace(*body.Title)
		if trimmed == "" {
			template.Title = nil
		} else {
			template.Title = &trimmed
		}
	}
	if body.Tags != nil {
		template.Tags = formatTemplateTags(body.Tags)
	}
	if body.IsFavorite != nil {
		template.IsFavorite = *body.IsFavorite
	}
	template.UpdatedAt = time.Now()

	if err := db.DB.Save(&template).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(mapTemplateResponse(template))
}

func deleteTemplate(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.SessionTemplate{}, "id = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func getRepoPaths(c *fiber.Ctx) error {
	var paths []models.RepoPath
	db.DB.Find(&paths)
	return c.JSON(paths)
}

func updateRepoPath(c *fiber.Ctx) error {
	var body models.RepoPath
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.SourceID == "" || body.LocalPath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "sourceId and localPath are required"})
	}

	var existing models.RepoPath
	result := db.DB.Where("source_id = ?", body.SourceID).First(&existing)
	if result.Error == nil {
		existing.LocalPath = body.LocalPath
		db.DB.Save(&existing)
		return c.JSON(existing)
	}

	db.DB.Create(&body)
	return c.JSON(body)
}

func handleSessionAction(c *fiber.Ctx) error {
	idAndAction := c.Params("idAndAction")
	parts := strings.Split(idAndAction, ":")
	if len(parts) != 2 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action format"})
	}

	id := parts[0]
	action := parts[1]

	client := getJulesClientForRequest(c)

	if action == "sendMessage" {
		var body struct {
			Prompt string `json:"prompt"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		result, err := client.CreateActivity(id, services.CreateActivityRequest{
			Content: body.Prompt,
			Type:    "message",
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
	}

	if action == "approvePlan" {
		if err := client.ApprovePlan(id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		_, _ = services.AddJob("check_session", map[string]interface{}{
			"session": models.JulesSession{ID: id},
		})
		return c.JSON(fiber.Map{"success": true})
	}

	return c.Status(400).JSON(fiber.Map{"error": "Unsupported action: " + action})
}

func patchSession(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Status string `json:"status"`
		Title  string `json:"title"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	updates := map[string]interface{}{}
	updateMaskParts := make([]string, 0, 2)
	if body.Status != "" {
		stateMap := map[string]string{
			"active":            "ACTIVE",
			"paused":            "PAUSED",
			"completed":         "COMPLETED",
			"failed":            "FAILED",
			"awaiting_approval": "AWAITING_PLAN_APPROVAL",
		}
		if mapped, ok := stateMap[body.Status]; ok {
			updates["state"] = mapped
			updateMaskParts = append(updateMaskParts, "state")
		}
	}
	if body.Title != "" {
		updates["title"] = body.Title
		updateMaskParts = append(updateMaskParts, "title")
	}
	if len(updateMaskParts) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No supported updates provided"})
	}

	client := getJulesClientForRequest(c)
	updated, err := client.UpdateSession(id, updates, strings.Join(updateMaskParts, ","))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

func createActivity(c *fiber.Ctx) error {
	id := c.Params("id")
	var req services.CreateActivityRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	client := getJulesClientForRequest(c)
	result, err := client.CreateActivity(id, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
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

func exportSessionToRepo(c *fiber.Ctx) error {
	id := c.Params("id")
	client := getJulesClientForRequest(c)

	// 1. Get session details for header
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get session details: " + err.Error()})
	}

	// 2. Get all activities
	activities, err := client.ListActivities(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to list activities: " + err.Error()})
	}

	// 3. Format as Markdown
	var md strings.Builder
	md.WriteString(fmt.Sprintf("# %s\n\n", session.Title))
	md.WriteString(fmt.Sprintf("**Session ID:** %s\n", session.ID))
	md.WriteString(fmt.Sprintf("**Date:** %s\n", session.CreatedAt.Format(time.RFC1123)))
	md.WriteString(fmt.Sprintf("**Status:** %s\n", session.Status))
	md.WriteString(fmt.Sprintf("**Source:** %s\n", session.SourceID))
	md.WriteString(fmt.Sprintf("**Branch:** %s\n\n", session.Branch))

	md.WriteString("## Activity Log\n\n")

	for _, a := range activities {
		role := "Agent"
		if a.Role == "user" {
			role = "User"
		}
		md.WriteString(fmt.Sprintf("### %s (%s)\n\n", role, a.CreatedAt.Format(time.RFC1123)))
		md.WriteString(a.Content + "\n\n")

		if a.BashOutput != "" {
			md.WriteString(fmt.Sprintf("**Terminal Output:**\n```bash\n%s\n```\n\n", a.BashOutput))
		}
		if a.Diff != "" {
			md.WriteString(fmt.Sprintf("**Code Diff:**\n```diff\n%s\n```\n\n", a.Diff))
		}
		md.WriteString("---\n\n")
	}

	// 4. Resolve destination and save
	basePath := resolveRepoPath(session.SourceID)
	dir := fmt.Sprintf("%s/.jules/sessions", basePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create directory: " + err.Error()})
	}

	filename := fmt.Sprintf("%s/%s.md", dir, id)
	if err := os.WriteFile(filename, []byte(md.String()), 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to write file: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"path":    filename,
	})
}

func saveSessionMemory(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	client := getJulesClientForRequest(c)
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get session details: " + err.Error()})
	}

	basePath := resolveRepoPath(session.SourceID)
	dir := fmt.Sprintf("%s/.jules/memory", basePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create directory: " + err.Error()})
	}

	filename := fmt.Sprintf("%s/architecture.md", dir)
	if err := os.WriteFile(filename, []byte(body.Content), 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to write memory file: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"path":    filename,
	})
}

func getDaemonStatus(c *fiber.Ctx) error {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Settings not found"})
	}

	var logs []models.KeeperLog
	db.DB.Order("created_at desc").Limit(50).Find(&logs)

	var pendingCount, processingCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)

	ClientsMutex.Lock()
	wsCount := len(ActiveClients)
	ClientsMutex.Unlock()

	return c.JSON(fiber.Map{
		"isEnabled": settings.IsEnabled,
		"logs":      logs,
		"wsClients": wsCount,
		"queue": fiber.Map{
			"pending":    pendingCount,
			"processing": processingCount,
		},
	})
}

func getHealth(c *fiber.Ctx) error {
	status := "ok"
	databaseStatus := "ok"
	var databaseError string

	sqlDB, err := db.DB.DB()
	if err != nil {
		status = "degraded"
		databaseStatus = "error"
		databaseError = err.Error()
	} else if pingErr := sqlDB.Ping(); pingErr != nil {
		status = "degraded"
		databaseStatus = "error"
		databaseError = pingErr.Error()
	}

	var settings models.KeeperSettings
	settingsFound := db.DB.First(&settings, "id = ?", "default").Error == nil
	var pendingCount, processingCount, codeChunkCount, memoryChunkCount, templateCount, debateCount, sessionCount, notificationCount, auditCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)
	db.DB.Model(&models.CodeChunk{}).Count(&codeChunkCount)
	db.DB.Model(&models.MemoryChunk{}).Count(&memoryChunkCount)
	db.DB.Model(&models.SessionTemplate{}).Count(&templateCount)
	db.DB.Model(&models.Debate{}).Count(&debateCount)
	db.DB.Model(&models.JulesSession{}).Count(&sessionCount)
	db.DB.Model(&models.Notification{}).Where("is_read = ? AND is_dismissed = ?", false, false).Count(&notificationCount)
	db.DB.Model(&models.AuditEntry{}).Count(&auditCount)

	ClientsMutex.Lock()
	wsCount := len(ActiveClients)
	ClientsMutex.Unlock()

	julesConfigured := strings.TrimSpace(os.Getenv("JULES_API_KEY")) != "" || strings.TrimSpace(os.Getenv("GOOGLE_API_KEY")) != ""
	if !julesConfigured && settingsFound && settings.JulesApiKey != nil {
		julesConfigured = strings.TrimSpace(*settings.JulesApiKey) != "" && strings.TrimSpace(*settings.JulesApiKey) != "placeholder"
	}

	result := c.JSON(fiber.Map{
		"status":    status,
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   getVersion(),
		"checks": fiber.Map{
			"database": fiber.Map{
				"status": databaseStatus,
				"error":  databaseError,
			},
			"daemon": fiber.Map{
				"running": services.GetDaemon().IsRunning(),
				"enabled": settingsFound && settings.IsEnabled,
			},
			"worker": fiber.Map{
				"running": services.IsWorkerRunning(),
			},
			"scheduler": fiber.Map{
				"running": true, // Global scheduler is always started for now
			},
			"credentials": fiber.Map{
				"julesConfigured": julesConfigured,
			},
		},
		"queue": fiber.Map{
			"pending":    pendingCount,
			"processing": processingCount,
		},
		"totals": fiber.Map{
			"sessions":      sessionCount,
			"codeChunks":    codeChunkCount,
			"memoryChunks":  memoryChunkCount,
			"templates":     templateCount,
			"debates":       debateCount,
			"notifications": notificationCount,
			"auditEntries":  auditCount,
		},
		"realtime": fiber.Map{
			"wsClients": wsCount,
		},
	})

	// Capture health snapshot for trend analysis (fire-and-forget)
	go func() {
		_ = services.CaptureHealthSnapshot(map[string]interface{}{
			"status": status,
			"checks": fiber.Map{
				"database": fiber.Map{"status": databaseStatus},
				"daemon":   fiber.Map{"running": services.GetDaemon().IsRunning()},
				"worker":   fiber.Map{"running": services.IsWorkerRunning()},
				"scheduler": fiber.Map{"running": true},
			},
			"queue": fiber.Map{
				"pending":    pendingCount,
				"processing": processingCount,
			},
			"totals": fiber.Map{
				"sessions":      sessionCount,
				"codeChunks":    codeChunkCount,
				"memoryChunks":  memoryChunkCount,
				"notifications": notificationCount,
				"auditEntries":  auditCount,
			},
			"realtime": fiber.Map{
				"wsClients": wsCount,
			},
		})
		// Run anomaly detection alongside health capture
		_, _ = services.DetectAnomalies()
	}()

	return result
}

func getMetrics(c *fiber.Ctx) error {
	var settings models.KeeperSettings
	settingsFound := db.DB.First(&settings, "id = ?", "default").Error == nil

	var pendingCount, processingCount, codeChunkCount, memoryChunkCount, templateCount, debateCount, sessionCount, notificationCount, auditCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)
	db.DB.Model(&models.CodeChunk{}).Count(&codeChunkCount)
	db.DB.Model(&models.MemoryChunk{}).Count(&memoryChunkCount)
	db.DB.Model(&models.SessionTemplate{}).Count(&templateCount)
	db.DB.Model(&models.Debate{}).Count(&debateCount)
	db.DB.Model(&models.JulesSession{}).Count(&sessionCount)
	db.DB.Model(&models.Notification{}).Where("is_read = ? AND is_dismissed = ?", false, false).Count(&notificationCount)
	db.DB.Model(&models.AuditEntry{}).Count(&auditCount)

	ClientsMutex.Lock()
	wsCount := len(ActiveClients)
	ClientsMutex.Unlock()

	databaseUp := 0
	if sqlDB, err := db.DB.DB(); err == nil {
		if pingErr := sqlDB.Ping(); pingErr == nil {
			databaseUp = 1
		}
	}

	julesConfigured := 0
	if strings.TrimSpace(os.Getenv("JULES_API_KEY")) != "" || strings.TrimSpace(os.Getenv("GOOGLE_API_KEY")) != "" {
		julesConfigured = 1
	} else if settingsFound && settings.JulesApiKey != nil {
		value := strings.TrimSpace(*settings.JulesApiKey)
		if value != "" && value != "placeholder" {
			julesConfigured = 1
		}
	}

	var body bytes.Buffer
	fmt.Fprintf(&body, "# HELP jules_autopilot_build_info Build and version information.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_build_info gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_build_info{version=%q} 1\n", getVersion())
	fmt.Fprintf(&body, "# HELP jules_autopilot_database_up Database connectivity status.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_database_up gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_database_up %d\n", databaseUp)
	fmt.Fprintf(&body, "# HELP jules_autopilot_daemon_running Whether the Go daemon loop is running.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_daemon_running gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_daemon_running %d\n", boolToMetric(services.GetDaemon().IsRunning()))
	fmt.Fprintf(&body, "# HELP jules_autopilot_worker_running Whether the Go queue worker is running.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_worker_running gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_worker_running %d\n", boolToMetric(services.IsWorkerRunning()))
	fmt.Fprintf(&body, "# HELP jules_autopilot_scheduler_running Whether the Go scheduler is running.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_scheduler_running gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_scheduler_running %d\n", 1)
	fmt.Fprintf(&body, "# HELP jules_autopilot_keeper_enabled Whether Keeper is enabled.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_keeper_enabled gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_keeper_enabled %d\n", boolToMetric(settingsFound && settings.IsEnabled))
	fmt.Fprintf(&body, "# HELP jules_autopilot_jules_configured Whether a Jules API key is configured.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_jules_configured gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_jules_configured %d\n", julesConfigured)
	fmt.Fprintf(&body, "# HELP jules_autopilot_queue_jobs Queue jobs by status.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_queue_jobs gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_queue_jobs{status=%q} %d\n", "pending", pendingCount)
	fmt.Fprintf(&body, "jules_autopilot_queue_jobs{status=%q} %d\n", "processing", processingCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_sessions_total Persisted session records.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_sessions_total gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_sessions_total %d\n", sessionCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_code_chunks_total Indexed code chunks.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_code_chunks_total gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_code_chunks_total %d\n", codeChunkCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_memory_chunks_total Stored memory chunks.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_memory_chunks_total gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_memory_chunks_total %d\n", memoryChunkCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_templates_total Stored templates.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_templates_total gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_templates_total %d\n", templateCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_debates_total Stored debates.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_debates_total gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_debates_total %d\n", debateCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_ws_clients WebSocket clients connected to the Go backend.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_ws_clients gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_ws_clients %d\n", wsCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_notifications_unread Unread notifications.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_notifications_unread gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_notifications_unread %d\n", notificationCount)
	fmt.Fprintf(&body, "# HELP jules_autopilot_audit_entries_total Total audit trail entries.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_audit_entries_total gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_audit_entries_total %d\n", auditCount)

	// Token usage metrics
	var totalTokensUsed int64
	var totalCostCents float64
	var failedRequests int64
	db.DB.Model(&models.TokenUsage{}).Select("COALESCE(SUM(total_tokens), 0)").Row().Scan(&totalTokensUsed)
	db.DB.Model(&models.TokenUsage{}).Select("COALESCE(SUM(cost_cents), 0)").Row().Scan(&totalCostCents)
	db.DB.Model(&models.TokenUsage{}).Where("success = ?", false).Count(&failedRequests)

	fmt.Fprintf(&body, "# HELP jules_autopilot_tokens_used_total Total LLM tokens consumed.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_tokens_used_total counter\n")
	fmt.Fprintf(&body, "jules_autopilot_tokens_used_total %d\n", totalTokensUsed)
	fmt.Fprintf(&body, "# HELP jules_autopilot_cost_cents_total Total LLM cost in cents.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_cost_cents_total counter\n")
	fmt.Fprintf(&body, "jules_autopilot_cost_cents_total %.2f\n", totalCostCents)
	fmt.Fprintf(&body, "# HELP jules_autopilot_llm_failures_total Total failed LLM requests.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_llm_failures_total counter\n")
	fmt.Fprintf(&body, "jules_autopilot_llm_failures_total %d\n", failedRequests)

	// Anomaly metrics
	var activeAnomalies int64
	db.DB.Model(&models.AnomalyRecord{}).Where("is_resolved = ?", false).Count(&activeAnomalies)
	fmt.Fprintf(&body, "# HELP jules_autopilot_active_anomalies Currently active anomalies.\n")
	fmt.Fprintf(&body, "# TYPE jules_autopilot_active_anomalies gauge\n")
	fmt.Fprintf(&body, "jules_autopilot_active_anomalies %d\n", activeAnomalies)

	c.Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	return c.SendString(body.String())
}

func boolToMetric(value bool) int {
	if value {
		return 1
	}
	return 0
}

func postDaemonStatus(c *fiber.Ctx) error {
	type Request struct {
		Action string `json:"action"` // "start" or "stop"
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Action == "start" {
		services.StartDaemon()
		services.StartWorker()
	} else if req.Action == "stop" {
		services.StopDaemon()
		services.StopWorker()
	} else {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}

	return c.JSON(fiber.Map{"success": true})
}

func getKeeperSettings(c *fiber.Ctx) error {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Settings not found"})
	}
	return c.JSON(settings.ToDTO())
}

func updateKeeperSettings(c *fiber.Ctx) error {
	var dto models.KeeperSettingsDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body: " + err.Error()})
	}

	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		// If not found, create new one
		settings = dto.ToModel()
		settings.ID = "default"
		if err := db.DB.Create(&settings).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	} else {
		updated := dto.ToModel()
		updated.ID = "default"
		updated.UpdatedAt = time.Now()
		if err := db.DB.Save(&updated).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		settings = updated
	}
	return c.JSON(settings.ToDTO())
}

func getMockSessions() []models.JulesSession {
	now := time.Now()
	return []models.JulesSession{
		{
			ID:        "mock-1",
			Title:     "Fix broken auth",
			Status:    "active",
			RawState:  "ACTIVE",
			CreatedAt: now,
			UpdatedAt: now,
			SourceID:  "google/jules",
			Branch:    "main",
		},
	}
}

func getApiKeys(c *fiber.Ctx) error {
	var keys []models.ApiKey
	if err := db.DB.Order("created_at desc").Find(&keys).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(keys)
}

func createApiKey(c *fiber.Ctx) error {
	var body struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if strings.TrimSpace(body.Name) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	workspaceID := "default"
	prefix := "jp_"
	key := uuid.New().String()
	apiKey := models.ApiKey{
		ID:          uuid.New().String(),
		KeyHash:     key, // Placeholder for actual hash
		KeyPrefix:   prefix,
		Name:        body.Name,
		Scopes:      "*",
		IsActive:    true,
		WorkspaceID: &workspaceID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(&apiKey).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(apiKey)
}

func deleteApiKey(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.ApiKey{}, "id = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func getSchedulerTasks(c *fiber.Ctx) error {
	tasks := services.GetScheduler().GetTasks()
	return c.JSON(tasks)
}

func triggerSchedulerTask(c *fiber.Ctx) error {
	name := c.Params("name")
	if err := services.GetScheduler().Trigger(name); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Task triggered manually"})
}

func getSessions(c *fiber.Ctx) error {
	client := getJulesClientForRequest(c)
	liveSessions, err := client.ListSessions()
	if err == nil && len(liveSessions) > 0 {
		return c.JSON(fiber.Map{"sessions": liveSessions})
	}

	if err != nil {
		log.Printf("Failed to fetch live sessions: %v", err)
		// Return 200 with error session + mocks to prevent UI crash, mirroring Bun.
		return c.JSON(fiber.Map{
			"sessions": append([]models.JulesSession{
				{
					ID:        "critical-err",
					Title:     "API Error: " + err.Error(),
					Status:    "failed",
					RawState:  "FAILED",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
					SourceID:  "system",
					Branch:    "none",
				},
			}, getMockSessions()...),
		})
	}

	// No live sessions and no error (e.g. empty) - check DB
	var sessions []models.JulesSession
	if err := db.DB.Find(&sessions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if len(sessions) == 0 {
		return c.JSON(fiber.Map{"sessions": getMockSessions()})
	}

	return c.JSON(fiber.Map{"sessions": sessions})
}

func nudgeSession(c *fiber.Ctx) error {
	id := c.Params("id")
	client := getJulesClientForRequest(c)
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	message := "Please continue working on this task."
	if _, err := client.CreateActivity(id, services.CreateActivityRequest{
		Content: message,
		Type:    "message",
		Role:    "user",
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	_, _ = services.AddJob("check_session", map[string]interface{}{
		"session": session,
	})
	Broadcast(fiber.Map{"type": "activities_updated", "data": fiber.Map{"sessionId": id}})
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Session " + id + " nudged",
	})
}

func postBroadcast(c *fiber.Ctx) error {
	var msg interface{}
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	Broadcast(msg)
	return c.Status(200).JSON(fiber.Map{"success": true})
}

// Notification handlers

func getNotifications(c *fiber.Ctx) error {
	filter := services.NotificationFilter{
		Category:         c.Query("category"),
		Type:             c.Query("type"),
		SessionID:        c.Query("sessionId"),
		IncludeRead:      c.Query("includeRead") == "true",
		IncludeDismissed: c.Query("includeDismissed") == "true",
	}
	if limit := c.QueryInt("limit"); limit > 0 {
		filter.Limit = limit
	}
	if offset := c.QueryInt("offset"); offset > 0 {
		filter.Offset = offset
	}

	notifications, total, err := services.GetNotifications(filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"notifications": notifications,
		"total":        total,
	})
}

func markNotificationRead(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.MarkNotificationRead(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func markAllNotificationsRead(c *fiber.Ctx) error {
	if err := services.MarkAllNotificationsRead(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func dismissNotification(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.DismissNotification(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func dismissAllNotificationsAPI(c *fiber.Ctx) error {
	if err := services.DismissAllNotifications(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func getUnreadNotificationCountAPI(c *fiber.Ctx) error {
	count, err := services.GetUnreadNotificationCount()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"count": count})
}

// Audit handlers

func getAuditEntries(c *fiber.Ctx) error {
	filter := services.AuditFilter{
		Action:       c.Query("action"),
		Actor:        c.Query("actor"),
		ResourceType: c.Query("resourceType"),
		ResourceID:   c.Query("resourceId"),
		Status:       c.Query("status"),
		From:         c.Query("from"),
		To:           c.Query("to"),
	}
	if limit := c.QueryInt("limit"); limit > 0 {
		filter.Limit = limit
	}
	if offset := c.QueryInt("offset"); offset > 0 {
		filter.Offset = offset
	}

	entries, total, err := services.GetAuditEntries(filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"entries": entries,
		"total":   total,
	})
}

func getAuditStatsAPI(c *fiber.Ctx) error {
	stats, err := services.GetAuditStats()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

// Deep Observability: Health History
func getHealthHistory(c *fiber.Ctx) error {
	hours := c.QueryInt("hours", 24)
	limit := c.QueryInt("limit", 100)

	snapshots, err := services.GetHealthHistory(hours, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"snapshots": snapshots,
		"total":     len(snapshots),
	})
}

// Anomaly Detection: Active anomalies
func getActiveAnomalies(c *fiber.Ctx) error {
	anomalies, err := services.GetActiveAnomalies()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"anomalies": anomalies,
		"total":     len(anomalies),
	})
}

// Anomaly Detection: Resolve an anomaly
func resolveAnomalyAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.ResolveAnomaly(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "resolved"})
}

// Anomaly Detection: History of resolved anomalies
func getAnomalyHistory(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	anomalies, err := services.GetAnomalyHistory(limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"anomalies": anomalies,
		"total":     len(anomalies),
	})
}

// Token Usage: Aggregate stats
func getTokenUsageStats(c *fiber.Ctx) error {
	opts := []services.TokenUsageOpt{}

	if provider := c.Query("provider"); provider != "" {
		opts = append(opts, services.WithTokenProvider(provider))
	}
	if sessionID := c.Query("sessionId"); sessionID != "" {
		opts = append(opts, services.WithTokenSession(sessionID))
	}
	if since := c.Query("since"); since != "" {
		if t, err := time.Parse(time.RFC3339, since); err == nil {
			opts = append(opts, services.WithTokenSince(t))
		}
	}

	report, err := services.GetTokenUsageStats(opts...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(report)
}

// Token Usage: Per-session breakdown
func getSessionTokenUsage(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	report, err := services.GetTokenUsageStats(services.WithTokenSession(sessionID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(report)
}

// Shadow Pilot: Status
func getShadowPilotStatus(c *fiber.Ctx) error {
	return c.JSON(services.GetShadowPilotStatus())
}

// Shadow Pilot: Start
func startShadowPilotAPI(c *fiber.Ctx) error {
	services.StartShadowPilot()
	return c.JSON(fiber.Map{"status": "started"})
}

// Shadow Pilot: Stop
func stopShadowPilotAPI(c *fiber.Ctx) error {
	services.StopShadowPilot()
	return c.JSON(fiber.Map{"status": "stopped"})
}

func getDependencyChecks(c *fiber.Ctx) error {
	report := services.RunDependencyChecks()
	return c.JSON(report)
}

func getHealthTrend(c *fiber.Ctx) error {
	checkName := c.Query("check", "")
	hours := c.QueryInt("hours", 24)
	limit := c.QueryInt("limit", 100)

	since := time.Now().Add(-time.Duration(hours) * time.Hour)
	snapshots, err := services.GetHealthTrend(checkName, since, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"check":      checkName,
		"since":      since,
		"snapshots":  snapshots,
		"count":      len(snapshots),
	})
}

func getSystemInfoAPI(c *fiber.Ctx) error {
	info := services.GetSystemInfo()
	return c.JSON(info)
}

func getScheduledTasks(c *fiber.Ctx) error {
	tasks := services.GetScheduler().GetTasks()
	customTasks := services.GetCustomTasks()
	return c.JSON(fiber.Map{
		"builtInTasks": tasks,
		"customTasks":  customTasks,
	})
}

func createScheduledTask(c *fiber.Ctx) error {
	var req struct {
		Name       string                 `json:"name"`
		IntervalMs int64                  `json:"intervalMs"`
		JobType    string                 `json:"jobType"`
		Payload    map[string]interface{} `json:"payload"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Name == "" || req.JobType == "" || req.IntervalMs <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "name, jobType, and intervalMs are required"})
	}
	if err := services.CreateCustomTask(req.Name, req.IntervalMs, req.JobType, req.Payload); err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "created", "name": req.Name})
}

func deleteScheduledTask(c *fiber.Ctx) error {
	name := c.Params("name")
	if err := services.DeleteCustomTask(name); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "deleted", "name": name})
}

func postGitHubWebhook(c *fiber.Ctx) error {
	eventType := c.Get("X-GitHub-Event", "push")
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
	}
	event := services.ProcessGitHubWebhook(eventType, body)
	if err := services.ProcessWebhook(event); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "processed", "event": eventType})
}

func postSlackWebhook(c *fiber.Ctx) error {
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
	}
	event := services.ProcessSlackWebhook(body)
	if err := services.ProcessWebhook(event); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "processed"})
}

func postLinearWebhook(c *fiber.Ctx) error {
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
	}
	event := services.ProcessLinearWebhook(body)
	if err := services.ProcessWebhook(event); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "processed"})
}

func postGenericWebhook(c *fiber.Ctx) error {
	var body struct {
		Provider  string                 `json:"provider"`
		EventType string                 `json:"eventType"`
		Data      map[string]interface{} `json:"data"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
	}
	provider := services.WebhookProviderGeneric
	if body.Provider != "" {
		provider = services.WebhookProvider(body.Provider)
	}
	event := services.WebhookEvent{
		Provider:  provider,
		EventType: body.EventType,
		RawBody:   body.Data,
	}
	if err := services.ProcessWebhook(event); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "processed"})
}

func getWebhookRulesAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetWebhookRules())
}

func addWebhookRuleAPI(c *fiber.Ctx) error {
	var rule services.WebhookRule
	if err := c.BodyParser(&rule); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if rule.Name == "" || rule.Action == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name and action are required"})
	}
	if err := services.AddWebhookRule(rule); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "created"})
}

func deleteWebhookRuleAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.RemoveWebhookRule(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "deleted"})
}

func toggleWebhookRuleAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if err := services.ToggleWebhookRule(id, req.Enabled); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

func createSwarmAPI(c *fiber.Ctx) error {
	var req services.CreateSwarmRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if req.RootTask == "" {
		return c.Status(400).JSON(fiber.Map{"error": "rootTask is required"})
	}
	swarm, err := services.CreateSwarm(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(swarm)
}

func listSwarmsAPI(c *fiber.Ctx) error {
	status := c.Query("status", "")
	limit := c.QueryInt("limit", 50)
	swarms, err := services.ListSwarms(status, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(swarms)
}

func getSwarmAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	swarm, err := services.GetSwarm(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Swarm not found"})
	}
	return c.JSON(swarm)
}

func getSwarmAgentsAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	agents, err := services.GetSwarmAgents(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(agents)
}

func getSwarmEventsAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	events, err := services.GetSwarmEvents(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(events)
}

func cancelSwarmAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.CancelSwarm(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "cancelled"})
}

func decomposeSwarmAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Task    string `json:"task"`
		Context string `json:"context"`
	}
	c.BodyParser(&req)
	swarm, err := services.GetSwarm(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Swarm not found"})
	}
	result, err := services.DecomposeTask(services.DecomposeTaskRequest{
		Task:    req.Task,
		Context: req.Context,
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if err := services.AssignSwarmAgents(swarm.ID, result); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}

func predictCostAPI(c *fiber.Ctx) error {
	taskType := c.Query("task", "check_session")
	prediction := services.PredictCost(taskType)
	return c.JSON(prediction)
}

func getProviderProfilesAPI(c *fiber.Ctx) error {
	profiles := services.GetProviderCostProfiles()
	return c.JSON(profiles)
}

func getBudgetReportAPI(c *fiber.Ctx) error {
	dailyBudget := float64(c.QueryInt("dailyBudgetCents", 100))
	report := services.GetBudgetReport(dailyBudget)
	return c.JSON(report)
}

func getSpendingTrendAPI(c *fiber.Ctx) error {
	days := c.QueryInt("days", 30)
	trend, err := services.GetSpendingTrend(days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(trend)
}

func optimizeProviderAPI(c *fiber.Ctx) error {
	taskType := c.Params("taskType")
	provider, model, strategy := services.OptimizeProviderSelection(taskType)
	return c.JSON(fiber.Map{
		"taskType": taskType,
		"provider": provider,
		"model":    model,
		"strategy": strategy,
	})
}

func runCIMonitorAPI(c *fiber.Ctx) error {
	services.RunCIMonitor()
	return c.JSON(fiber.Map{"status": "monitoring_complete"})
}

func getCIFailuresAPI(c *fiber.Ctx) error {
	if db.DB == nil {
		return c.JSON([]interface{}{})
	}
	var anomalies []models.AnomalyRecord
	db.DB.Where("type LIKE ?", "ci_failure_%").Order("created_at DESC").Limit(50).Find(&anomalies)
	return c.JSON(anomalies)
}

func listPluginsAPI(c *fiber.Ctx) error {
	status := c.Query("status", "")
	plugins, err := services.ListPlugins(status)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(plugins)
}

func getPluginStatsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetPluginStats())
}

func getPluginAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	plugin, err := services.GetPlugin(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Plugin not found"})
	}
	return c.JSON(plugin)
}

func installPluginAPI(c *fiber.Ctx) error {
	var req services.InstallPluginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	plugin, err := services.InstallPluginFromURL(req)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(plugin)
}

func enablePluginAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.EnablePlugin(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "enabled"})
}

func disablePluginAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.DisablePlugin(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "disabled"})
}

func uninstallPluginAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := services.UninstallPlugin(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "uninstalled"})
}

func updatePluginConfigAPI(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Config string `json:"config"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if err := services.UpdatePluginConfig(id, req.Config); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

func getSandboxStatusAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetSandboxStatus())
}

func warmupSandboxAPI(c *fiber.Ctx) error {
	services.WarmupSandbox()
	return c.JSON(fiber.Map{"status": "warmed_up"})
}

func executePluginAPI(c *fiber.Ctx) error {
	pluginID := c.Params("pluginId")
	result, err := services.GetWasmSandbox().ExecutePlugin(pluginID, c.Body())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error(), "result": result})
	}
	return c.JSON(result)
}

func validateWasmAPI(c *fiber.Ctx) error {
	if err := services.ValidateWasmBinary(c.Body()); err != nil {
		return c.Status(400).JSON(fiber.Map{"valid": false, "error": err.Error()})
	}
	return c.JSON(fiber.Map{"valid": true})
}

func getBudgetStatusesAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetAllBudgetStatuses())
}

func getBudgetStatsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetBudgetStats())
}

func getBudgetStatusAPI(c *fiber.Ctx) error {
	workspaceID := c.Params("workspaceId")
	return c.JSON(services.GetBudgetStatus(workspaceID))
}

func setBudgetAPI(c *fiber.Ctx) error {
	workspaceID := c.Params("workspaceId")
	var budget services.WorkspaceBudget
	if err := c.BodyParser(&budget); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	budget.WorkspaceID = workspaceID
	if err := services.SetWorkspaceBudget(budget); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "set"})
}

func checkBudgetAPI(c *fiber.Ctx) error {
	workspaceID := c.Params("workspaceId")
	var req struct {
		EstimatedCostCents float64 `json:"estimatedCostCents"`
	}
	c.BodyParser(&req)
	allowed, reason := services.CheckBudgetAllowance(workspaceID, req.EstimatedCostCents)
	return c.JSON(fiber.Map{"allowed": allowed, "reason": reason})
}

func removeBudgetAPI(c *fiber.Ctx) error {
	workspaceID := c.Params("workspaceId")
	services.RemoveWorkspaceBudget(workspaceID)
	return c.JSON(fiber.Map{"status": "removed"})
}

func getVectorIndexStatsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetVectorIndex().Stats())
}

func rebuildVectorIndexAPI(c *fiber.Ctx) error {
	if err := services.GetVectorIndex().Rebuild(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(services.GetVectorIndex().Stats())
}

func getMetricsDashboardAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetMetricsDashboard())
}

func getMetricNamesAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetMetricsCollector().GetMetricNames())
}

func getMetricSummaryAPI(c *fiber.Ctx) error {
	name := c.Params("name")
	windowMin := c.QueryFloat("window", 15)
	summary := services.GetMetricsCollector().GetSummary(name, time.Duration(windowMin)*time.Minute)
	return c.JSON(summary)
}

func getSLATargetsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetMetricsCollector().GetSLATargets())
}

func registerSLATargetAPI(c *fiber.Ctx) error {
	var target services.SLATarget
	if err := c.BodyParser(&target); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	services.GetMetricsCollector().RegisterSLA(target)
	return c.JSON(fiber.Map{"status": "registered"})
}

func getAgentScoresAPI(c *fiber.Ctx) error {
	agentID := c.Query("agentId")
	if agentID != "" {
		score, found := services.GetAgentPerformanceTracker().GetAgentScore(agentID)
		if !found {
			return c.Status(404).JSON(fiber.Map{"error": "Agent not found"})
		}
		return c.JSON(score)
	}
	// Return all scores
	stats := services.GetAgentPerformanceTracker().GetAgentStats()
	return c.JSON(stats)
}

func getAgentLeaderboardAPI(c *fiber.Ctx) error {
	role := services.AgentRole(c.Params("role"))
	return c.JSON(services.GetAgentPerformanceTracker().GetLeaderboard(role))
}

func getAllAgentLeaderboardsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetAgentPerformanceTracker().GetAllLeaderboards())
}

func getAgentStatsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetAgentPerformanceTracker().GetAgentStats())
}

func recommendProviderAPI(c *fiber.Ctx) error {
	role := services.AgentRole(c.Params("role"))
	provider := services.GetAgentPerformanceTracker().RecommendProvider(role)
	return c.JSON(fiber.Map{"role": role, "recommendedProvider": provider})
}

func getProviderEfficiencyAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetAgentPerformanceTracker().GetProviderEfficiency())
}

func recordAgentTaskAPI(c *fiber.Ctx) error {
	var task struct {
		AgentID    string  `json:"agentId"`
		Role       string  `json:"role"`
		Provider   string  `json:"provider"`
		TaskType   string  `json:"taskType"`
		Success    bool    `json:"success"`
		LatencyMs  float64 `json:"latencyMs"`
		TokensUsed int     `json:"tokensUsed"`
		CostCents  float64 `json:"costCents"`
	}
	if err := c.BodyParser(&task); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	services.RecordSwarmAgentTask(task.AgentID, services.AgentRole(task.Role), task.Provider, task.TaskType, task.Success, task.LatencyMs, task.TokensUsed, task.CostCents)
	return c.JSON(fiber.Map{"status": "recorded"})
}

func resetAgentScoreAPI(c *fiber.Ctx) error {
	agentID := c.Params("agentId")
	services.GetAgentPerformanceTracker().ResetAgentScore(agentID)
	return c.JSON(fiber.Map{"status": "reset"})
}

func analyzeASTAPI(c *fiber.Ctx) error {
	var req struct {
		FilePath   string `json:"filePath"`
		SessionID  string `json:"sessionId"`
		OldContent string `json:"oldContent"`
		NewContent string `json:"newContent"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if req.FilePath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "filePath is required"})
	}
	diff := services.AnalyzeDiff(req.FilePath, req.SessionID, req.OldContent, req.NewContent)
	return c.JSON(diff)
}

func getASTModificationsAPI(c *fiber.Ctx) error {
	sessionID := c.Query("sessionId")
	limit := c.QueryInt("limit", 50)
	return c.JSON(services.GetASTModifications(sessionID, limit))
}

func getASTStatsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetASTModificationStats())
}

func startTraceAPI(c *fiber.Ctx) error {
	var req struct {
		SessionID string   `json:"sessionId"`
		Name      string   `json:"name"`
		Tags      []string `json:"tags"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}
	trace := services.GetWorkflowTracer().StartTrace(req.SessionID, req.Name, req.Tags)
	return c.JSON(trace)
}

func listTracesAPI(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	sessionID := c.Query("sessionId")
	if sessionID != "" {
		return c.JSON(services.GetWorkflowTracer().GetTracesForSession(sessionID))
	}
	return c.JSON(services.GetWorkflowTracer().GetAllTraces(limit))
}

func getActiveTracesAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetWorkflowTracer().GetActiveTraces())
}

func getTraceStatsAPI(c *fiber.Ctx) error {
	return c.JSON(services.GetWorkflowTracer().GetTraceStats())
}

func getTraceAPI(c *fiber.Ctx) error {
	traceID := c.Params("traceId")
	trace, err := services.GetWorkflowTracer().GetTrace(traceID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(trace)
}

func addTraceStepAPI(c *fiber.Ctx) error {
	traceID := c.Params("traceId")
	var req struct {
		Name     string                 `json:"name"`
		Type     string                 `json:"type"`
		ParentID string                 `json:"parentId"`
		Input    map[string]interface{} `json:"input"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	step, err := services.GetWorkflowTracer().AddStep(traceID, req.Name, req.Type, req.ParentID, req.Input)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(step)
}

func completeStepAPI(c *fiber.Ctx) error {
	traceID := c.Params("traceId")
	stepID := c.Params("stepId")
	var req struct {
		Output map[string]interface{} `json:"output"`
		Error  string                 `json:"error"`
	}
	c.BodyParser(&req)
	var stepErr error
	if req.Error != "" {
		stepErr = fmt.Errorf("%s", req.Error)
	}
	if err := services.GetWorkflowTracer().CompleteStep(traceID, stepID, req.Output, stepErr); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "completed"})
}

func finishTraceAPI(c *fiber.Ctx) error {
	traceID := c.Params("traceId")
	var req struct {
		Error string `json:"error"`
	}
	c.BodyParser(&req)
	var traceErr error
	if req.Error != "" {
		traceErr = fmt.Errorf("%s", req.Error)
	}
	if err := services.GetWorkflowTracer().FinishTrace(traceID, traceErr); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "finished"})
}

func cancelTraceAPI(c *fiber.Ctx) error {
	traceID := c.Params("traceId")
	if err := services.GetWorkflowTracer().CancelTrace(traceID); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "cancelled"})
}
