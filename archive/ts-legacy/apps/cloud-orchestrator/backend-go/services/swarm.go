package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// SwarmStrategy defines how a swarm distributes work
type SwarmStrategy string

const (
	SwarmStrategySequential SwarmStrategy = "sequential"
	SwarmStrategyParallel   SwarmStrategy = "parallel"
	SwarmStrategyPipeline   SwarmStrategy = "pipeline"
)

// SwarmAgentRole defines agent roles
type SwarmAgentRole string

const (
	SwarmRoleArchitect   SwarmAgentRole = "architect"
	SwarmRoleEngineer    SwarmAgentRole = "engineer"
	SwarmRoleAuditor     SwarmAgentRole = "auditor"
	SwarmRoleCoordinator SwarmAgentRole = "coordinator"
)

// SwarmStatus tracks lifecycle state
type SwarmStatus string

const (
	SwarmStatusPending   SwarmStatus = "pending"
	SwarmStatusPlanning  SwarmStatus = "planning"
	SwarmStatusRunning   SwarmStatus = "running"
	SwarmStatusComplete  SwarmStatus = "complete"
	SwarmStatusFailed    SwarmStatus = "failed"
	SwarmStatusCancelled SwarmStatus = "cancelled"
)

// CreateSwarmRequest is the API request to create a new swarm
type CreateSwarmRequest struct {
	Title       string        `json:"title"`
	Description string        `json:"description"`
	SourceRepo  string        `json:"sourceRepo,omitempty"`
	Strategy    SwarmStrategy `json:"strategy"`
	RootTask    string        `json:"rootTask"`
}

// DecomposeTaskRequest asks an LLM to decompose a task
type DecomposeTaskRequest struct {
	Task        string `json:"task"`
	Context     string `json:"context,omitempty"`
	MaxSubtasks int    `json:"maxSubtasks,omitempty"`
}

// SubTask represents a decomposed sub-task from an LLM
type SubTask struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Role        string   `json:"role"`
	DependsOn   []string `json:"dependsOn,omitempty"`
	Priority    int      `json:"priority"`
}

// DecompositionResult is the LLM output from task decomposition
type DecompositionResult struct {
	Analysis string    `json:"analysis"`
	SubTasks []SubTask `json:"subTasks"`
	Strategy string    `json:"recommendedStrategy"`
}

var swarmMu sync.Mutex

// CreateSwarm creates a new swarm and begins the planning phase
func CreateSwarm(req CreateSwarmRequest) (*models.Swarm, error) {
	if req.RootTask == "" {
		return nil, fmt.Errorf("rootTask is required")
	}
	if req.Strategy == "" {
		req.Strategy = SwarmStrategyParallel
	}

	swarm := &models.Swarm{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Description: req.Description,
		SourceRepo:  req.SourceRepo,
		Strategy:    string(req.Strategy),
		Status:      string(SwarmStatusPlanning),
		RootTask:    req.RootTask,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(swarm).Error; err != nil {
		return nil, fmt.Errorf("failed to create swarm: %w", err)
	}

	recordSwarmEvent(swarm.ID, "", "swarm_created", fmt.Sprintf("Swarm created: %s", req.Title))

	// Enqueue decomposition job
	if _, err := AddJob("decompose_task", map[string]interface{}{
		"swarmId": swarm.ID,
		"task":    req.RootTask,
		"context": req.Description,
	}); err != nil {
		log.Printf("[Swarm] Failed to enqueue decomposition: %v", err)
	}

	return swarm, nil
}

// DecomposeTask uses an LLM to break down a task into subtasks
func DecomposeTask(req DecomposeTaskRequest) (*DecompositionResult, error) {
	if req.MaxSubtasks <= 0 {
		req.MaxSubtasks = 5
	}

	provider := getSupervisorProvider()
	apiKey := getSupervisorAPIKey(provider, nil)
	model := resolveModel(provider, "")

	if apiKey == "" {
		return heuristicDecompose(req.Task)
	}

	systemPrompt := `You are a senior software architect. Decompose the given task into concrete, actionable subtasks.
Each subtask should be independently executable by a coding agent.

Respond with JSON only:
{
  "analysis": "Brief analysis",
  "subTasks": [
    {"id": "sub-1", "title": "Short title", "description": "What to implement", "role": "engineer", "dependsOn": [], "priority": 1}
  ],
  "recommendedStrategy": "parallel"
}`

	contextStr := ""
	if req.Context != "" {
		contextStr = fmt.Sprintf("\n\nContext: %s", req.Context)
	}

	var result DecompositionResult
	if err := generateStructuredJSON(provider, apiKey, model, systemPrompt, []LLMMessage{{
		Role:    "user",
		Content: fmt.Sprintf("Decompose into at most %d subtasks:\n\n%s%s", req.MaxSubtasks, req.Task, contextStr),
	}}, &result); err != nil {
		log.Printf("[Swarm] LLM decomposition failed, using heuristic: %v", err)
		return heuristicDecompose(req.Task)
	}

	return &result, nil
}

func heuristicDecompose(task string) (*DecompositionResult, error) {
	return &DecompositionResult{
		Analysis: "Heuristic decomposition (LLM unavailable).",
		SubTasks: []SubTask{{
			ID:          "sub-1",
			Title:       "Execute Task",
			Description: task,
			Role:        "engineer",
			DependsOn:   []string{},
			Priority:    1,
		}},
		Strategy: "sequential",
	}, nil
}

// AssignSwarmAgents creates agents from a decomposition and starts execution
func AssignSwarmAgents(swarmID string, decomp *DecompositionResult) error {
	swarmMu.Lock()
	defer swarmMu.Unlock()

	var swarm models.Swarm
	if err := db.DB.Where("id = ?", swarmID).First(&swarm).Error; err != nil {
		return fmt.Errorf("swarm not found: %w", err)
	}

	decompJSON, _ := json.Marshal(decomp.SubTasks)
	swarm.Decomposition = string(decompJSON)
	if decomp.Strategy != "" {
		swarm.Strategy = decomp.Strategy
	}
	swarm.Status = string(SwarmStatusRunning)
	swarm.UpdatedAt = time.Now()
	db.DB.Save(&swarm)

	recordSwarmEvent(swarmID, "", "swarm_decomposed", fmt.Sprintf("Decomposed into %d subtasks", len(decomp.SubTasks)))

	for _, subtask := range decomp.SubTasks {
		depsJSON, _ := json.Marshal(subtask.DependsOn)
		agent := models.SwarmAgent{
			ID:        uuid.New().String(),
			SwarmID:   swarmID,
			Role:      subtask.Role,
			Task:      fmt.Sprintf("%s: %s", subtask.Title, subtask.Description),
			Status:    "pending",
			DependsOn: string(depsJSON),
			Provider:  getSupervisorProvider(),
			Model:     resolveModel(getSupervisorProvider(), ""),
			CreatedAt: time.Now(),
		}
		db.DB.Create(&agent)
		recordSwarmEvent(swarmID, agent.ID, "agent_created", fmt.Sprintf("Agent: %s (%s)", subtask.Title, agent.Role))
	}

	go executeSwarmAgents(swarmID, SwarmStrategy(swarm.Strategy))
	return nil
}

func executeSwarmAgents(swarmID string, strategy SwarmStrategy) {
	switch strategy {
	case SwarmStrategySequential, SwarmStrategyPipeline:
		executeSequentialAgents(swarmID, strategy == SwarmStrategyPipeline)
	default:
		executeParallelAgents(swarmID)
	}
}

func executeSequentialAgents(swarmID string, pipeline bool) {
	agents := getAgentsForSwarm(swarmID)
	accumulatedContext := ""

	for i := range agents {
		output, err := executeSwarmAgent(&agents[i], accumulatedContext)
		if err != nil {
			log.Printf("[Swarm] Agent %s failed: %v", agents[i].ID, err)
			updateAgentStatus(agents[i].ID, "failed", "")
			recordSwarmEvent(swarmID, agents[i].ID, "agent_failed", err.Error())
			FailSwarm(swarmID, fmt.Sprintf("Agent %s failed", agents[i].ID))
			return
		}
		updateAgentStatus(agents[i].ID, "complete", output)
		recordSwarmEvent(swarmID, agents[i].ID, "agent_completed", "Agent completed")
		if pipeline {
			accumulatedContext = output
		}
	}
	CompleteSwarm(swarmID)
}

func executeParallelAgents(swarmID string) {
	agents := getAgentsForSwarm(swarmID)
	var wg sync.WaitGroup
	var failMu sync.Mutex
	failed := false

	for i := range agents {
		if failed {
			break
		}
		wg.Add(1)
		go func(agent *models.SwarmAgent) {
			defer wg.Done()
			output, err := executeSwarmAgent(agent, "")
			if err != nil {
				log.Printf("[Swarm] Agent %s failed: %v", agent.ID, err)
				updateAgentStatus(agent.ID, "failed", "")
				recordSwarmEvent(swarmID, agent.ID, "agent_failed", err.Error())
				failMu.Lock()
				failed = true
				failMu.Unlock()
				return
			}
			updateAgentStatus(agent.ID, "complete", output)
			recordSwarmEvent(swarmID, agent.ID, "agent_completed", "Agent completed")
		}(&agents[i])
	}
	wg.Wait()

	if failed {
		FailSwarm(swarmID, "One or more agents failed")
	} else {
		CompleteSwarm(swarmID)
	}
}

func executeSwarmAgent(agent *models.SwarmAgent, context string) (string, error) {
	now := time.Now()
	agent.Status = "running"
	agent.StartedAt = &now
	db.DB.Save(agent)
	recordSwarmEvent(agent.SwarmID, agent.ID, "agent_started", agent.Task)

	// Try Jules session first
	client := NewJulesClient()
	if client.isConfigured() {
		var swarm models.Swarm
		if err := db.DB.Where("id = ?", agent.SwarmID).First(&swarm).Error; err == nil && swarm.SourceRepo != "" {
			prompt := agent.Task
			if context != "" {
				prompt += "\n\nPrevious output:\n" + context
			}
			session, err := client.CreateSession(swarm.SourceRepo, prompt, fmt.Sprintf("[Swarm %s] %s", agent.Role, agent.ID[:8]))
			if err == nil {
				sid := session.ID
				agent.SessionID = &sid
				db.DB.Save(agent)
				recordSwarmEvent(agent.SwarmID, agent.ID, "agent_session_created", sid)
				return fmt.Sprintf("Jules session %s created", sid), nil
			}
			log.Printf("[Swarm] Jules session failed, falling back to LLM: %v", err)
		}
	}

	// Fallback: direct LLM execution
	return executeAgentViaLLM(agent, context)
}

func executeAgentViaLLM(agent *models.SwarmAgent, context string) (string, error) {
	provider := getSupervisorProvider()
	apiKey := getSupervisorAPIKey(provider, nil)
	model := resolveModel(provider, agent.Model)

	if apiKey == "" {
		return "", fmt.Errorf("no API key available")
	}

	rolePrompt := getRolePrompt(SwarmAgentRole(agent.Role))
	if context != "" {
		rolePrompt += "\n\nPrevious step output:\n" + context
	}

	result, err := generateLLMText(provider, apiKey, model, rolePrompt, []LLMMessage{{
		Role:    "user",
		Content: agent.Task,
	}})
	if err != nil {
		return "", err
	}
	return result.Content, nil
}

func getRolePrompt(role SwarmAgentRole) string {
	switch role {
	case SwarmRoleArchitect:
		return "You are a senior software architect. Analyze and provide a detailed implementation plan."
	case SwarmRoleEngineer:
		return "You are an expert software engineer. Implement the requested changes with production-quality code."
	case SwarmRoleAuditor:
		return "You are a strict code auditor. Review for correctness, security, performance, and style."
	case SwarmRoleCoordinator:
		return "You are a project coordinator. Summarize work and provide a status report."
	default:
		return "You are an expert software engineer. Complete the assigned task."
	}
}

// GetSwarm retrieves a swarm by ID
func GetSwarm(id string) (*models.Swarm, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}
	var swarm models.Swarm
	if err := db.DB.Where("id = ?", id).First(&swarm).Error; err != nil {
		return nil, err
	}
	return &swarm, nil
}

// ListSwarms returns all swarms with optional status filter
func ListSwarms(status string, limit int) ([]models.Swarm, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}
	var swarms []models.Swarm
	query := db.DB.Order("created_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	return swarms, query.Find(&swarms).Error
}

// GetSwarmAgents returns all agents for a swarm
func GetSwarmAgents(swarmID string) ([]models.SwarmAgent, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}
	var agents []models.SwarmAgent
	return agents, db.DB.Where("swarm_id = ?", swarmID).Order("created_at ASC").Find(&agents).Error
}

func getAgentsForSwarm(swarmID string) []models.SwarmAgent {
	agents, _ := GetSwarmAgents(swarmID)
	return agents
}

// GetSwarmEvents returns the event timeline for a swarm
func GetSwarmEvents(swarmID string) ([]models.SwarmEvent, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}
	var events []models.SwarmEvent
	return events, db.DB.Where("swarm_id = ?", swarmID).Order("created_at ASC").Find(&events).Error
}

// CompleteSwarm marks a swarm as complete
func CompleteSwarm(swarmID string) {
	if db.DB == nil {
		return
	}
	now := time.Now()
	db.DB.Model(&models.Swarm{}).Where("id = ?", swarmID).Updates(map[string]interface{}{
		"status": string(SwarmStatusComplete), "updated_at": now, "completed_at": now,
	})
	recordSwarmEvent(swarmID, "", "swarm_completed", "Swarm completed successfully")
	CreateNotification("success", "system", fmt.Sprintf("Swarm Complete: %s", swarmID[:8]), "All agents completed successfully", WithPriority(2))
}

// FailSwarm marks a swarm as failed
func FailSwarm(swarmID string, reason string) {
	if db.DB == nil {
		return
	}
	db.DB.Model(&models.Swarm{}).Where("id = ?", swarmID).Updates(map[string]interface{}{
		"status": string(SwarmStatusFailed), "updated_at": time.Now(),
	})
	recordSwarmEvent(swarmID, "", "swarm_failed", reason)
	CreateNotification("error", "system", fmt.Sprintf("Swarm Failed: %s", swarmID[:8]), reason, WithPriority(1))
}

// CancelSwarm cancels a running swarm
func CancelSwarm(swarmID string) error {
	if db.DB == nil {
		return fmt.Errorf("database not available")
	}
	result := db.DB.Model(&models.Swarm{}).Where("id = ? AND status IN ?", swarmID,
		[]string{string(SwarmStatusPlanning), string(SwarmStatusRunning)}).
		Updates(map[string]interface{}{"status": string(SwarmStatusCancelled), "updated_at": time.Now()})
	if result.RowsAffected == 0 {
		return fmt.Errorf("swarm not found or not cancellable")
	}
	recordSwarmEvent(swarmID, "", "swarm_cancelled", "Cancelled by operator")
	return nil
}

func updateAgentStatus(agentID, status, output string) {
	updates := map[string]interface{}{"status": status, "updated_at": time.Now()}
	if output != "" {
		updates["output"] = output
	}
	if status == "complete" || status == "failed" {
		now := time.Now()
		updates["completed_at"] = now
	}
	db.DB.Model(&models.SwarmAgent{}).Where("id = ?", agentID).Updates(updates)
}

func recordSwarmEvent(swarmID, agentID, eventType, message string, data ...interface{}) {
	if db.DB == nil {
		return
	}
	var dataStr string
	if len(data) > 0 {
		b, _ := json.Marshal(data[0])
		dataStr = string(b)
	}
	db.DB.Create(&models.SwarmEvent{
		ID:        uuid.New().String(),
		SwarmID:   swarmID,
		AgentID:   agentID,
		EventType: eventType,
		Message:   message,
		Data:      dataStr,
		CreatedAt: time.Now(),
	})
	emitDaemonEvent("swarm_event", map[string]interface{}{
		"swarmId":   swarmID,
		"agentId":   agentID,
		"eventType": eventType,
		"message":   message,
	})
}
