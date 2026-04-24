package services

import (
	"fmt"
	"math"
	"sort"
	"sync"
	"time"
)

// AgentRole represents a role in the agent symphony
type AgentRole string

const (
	RoleArchitect AgentRole = "architect"
	RoleEngineer  AgentRole = "engineer"
	RoleAuditor   AgentRole = "auditor"
	RoleWorker    AgentRole = "worker"
)

// AgentPerformanceScore tracks performance metrics for an agent role/provider
type AgentPerformanceScore struct {
	AgentID         string    `json:"agentId"`
	Role            AgentRole `json:"role"`
	Provider        string    `json:"provider"`
	TotalTasks      int       `json:"totalTasks"`
	SuccessTasks    int       `json:"successTasks"`
	FailedTasks     int       `json:"failedTasks"`
	SuccessRate     float64   `json:"successRate"`
	AvgLatencyMs    float64   `json:"avgLatencyMs"`
	AvgTokenCost    float64   `json:"avgTokenCost"`
	CompositeScore  float64   `json:"compositeScore"` // 0-100 weighted score
	LastTaskAt      time.Time `json:"lastTaskAt"`
	Streak          int       `json:"streak"`          // Consecutive successes
	BestStreak      int       `json:"bestStreak"`      // Best consecutive success streak
	TotalTokensUsed int64     `json:"totalTokensUsed"`
	Rank            int       `json:"rank"`            // Rank among agents with same role
}

// AgentTaskRecord represents a single task execution by an agent
type AgentTaskRecord struct {
	ID         string    `json:"id"`
	AgentID    string    `json:"agentId"`
	Role       AgentRole `json:"role"`
	Provider   string    `json:"provider"`
	TaskType   string    `json:"taskType"`
	Success    bool      `json:"success"`
	LatencyMs  float64   `json:"latencyMs"`
	TokensUsed int       `json:"tokensUsed"`
	CostCents  float64   `json:"costCents"`
	Error      string    `json:"error,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}

// AgentLeaderboard is a ranked list of agent scores
type AgentLeaderboard struct {
	Role     AgentRole              `json:"role"`
	Agents   []AgentPerformanceScore `json:"agents"`
	UpdatedAt time.Time              `json:"updatedAt"`
}

// AgentPerformanceTracker manages agent scoring and leaderboard
type AgentPerformanceTracker struct {
	scores map[string]*AgentPerformanceScore
	mu     sync.RWMutex
}

var (
	agentTracker  *AgentPerformanceTracker
	trackerOnce   sync.Once
)

// GetAgentPerformanceTracker returns the singleton tracker
func GetAgentPerformanceTracker() *AgentPerformanceTracker {
	trackerOnce.Do(func() {
		agentTracker = &AgentPerformanceTracker{
			scores: make(map[string]*AgentPerformanceScore),
		}
	})
	return agentTracker
}

// RecordAgentTask records a task execution and updates the agent's score
func (apt *AgentPerformanceTracker) RecordAgentTask(task AgentTaskRecord) {
	apt.mu.Lock()
	defer apt.mu.Unlock()

	key := task.AgentID

	score, exists := apt.scores[key]
	if !exists {
		score = &AgentPerformanceScore{
			AgentID:  task.AgentID,
			Role:     task.Role,
			Provider: task.Provider,
		}
		apt.scores[key] = score
	}

	score.TotalTasks++
	score.LastTaskAt = task.Timestamp

	if task.Success {
		score.SuccessTasks++
		score.Streak++
		if score.Streak > score.BestStreak {
			score.BestStreak = score.Streak
		}
	} else {
		score.FailedTasks++
		score.Streak = 0
	}

	score.TotalTokensUsed += int64(task.TokensUsed)

	// Recompute derived metrics
	if score.TotalTasks > 0 {
		score.SuccessRate = float64(score.SuccessTasks) / float64(score.TotalTasks) * 100
	}

	// Update running average latency
	if score.TotalTasks == 1 {
		score.AvgLatencyMs = task.LatencyMs
	} else {
		score.AvgLatencyMs = (score.AvgLatencyMs*float64(score.TotalTasks-1) + task.LatencyMs) / float64(score.TotalTasks)
	}

	// Update running average token cost
	if score.TotalTasks == 1 {
		score.AvgTokenCost = task.CostCents
	} else {
		score.AvgTokenCost = (score.AvgTokenCost*float64(score.TotalTasks-1) + task.CostCents) / float64(score.TotalTasks)
	}

	// Compute composite score (weighted)
	// Success rate: 40%, Latency: 30%, Cost efficiency: 30%
	successNorm := score.SuccessRate / 100.0

	// Latency normalization: 0ms = 1.0, 5000ms+ = 0.0
	latencyNorm := math.Max(0, 1.0-score.AvgLatencyMs/5000.0)

	// Cost normalization: 0 cents = 1.0, 100 cents+ = 0.0
	costNorm := math.Max(0, 1.0-score.AvgTokenCost/100.0)

	// Streak bonus: up to 10% extra for long streaks
	streakBonus := math.Min(0.1, float64(score.Streak)*0.01)

	score.CompositeScore = (successNorm*40 + latencyNorm*30 + costNorm*30 + streakBonus*100)
	if score.CompositeScore > 100 {
		score.CompositeScore = 100
	}

	// Audit log for notable events
	if task.Success && score.Streak == 10 {
		AuditAction("agent_streak", task.AgentID, "agent", task.AgentID, "info",
			fmt.Sprintf("Agent %s hit 10-task success streak (role: %s, provider: %s)",
				task.AgentID, task.Role, task.Provider))
	}
	if !task.Success && score.TotalTasks > 5 && score.SuccessRate < 50 {
		AuditAction("agent_struggling", task.AgentID, "agent", task.AgentID, "warning",
			fmt.Sprintf("Agent %s success rate dropped to %.0f%% (role: %s)",
				task.AgentID, score.SuccessRate, task.Role))
		CreateNotification("warning", "system",
			fmt.Sprintf("Agent %s struggling", task.AgentID),
			fmt.Sprintf("Success rate: %.0f%% over %d tasks", score.SuccessRate, score.TotalTasks),
			WithPriority(2))
	}
}

// GetAgentScore returns the score for a specific agent
func (apt *AgentPerformanceTracker) GetAgentScore(agentID string) (*AgentPerformanceScore, bool) {
	apt.mu.RLock()
	defer apt.mu.RUnlock()

	score, ok := apt.scores[agentID]
	if !ok {
		return nil, false
	}
	// Return a copy
	copy := *score
	return &copy, true
}

// GetLeaderboard returns agents ranked by composite score for a given role
func (apt *AgentPerformanceTracker) GetLeaderboard(role AgentRole) AgentLeaderboard {
	apt.mu.RLock()
	defer apt.mu.RUnlock()

	var agents []AgentPerformanceScore
	for _, score := range apt.scores {
		if score.Role == role {
			agents = append(agents, *score)
		}
	}

	// Sort by composite score descending
	sort.Slice(agents, func(i, j int) bool {
		return agents[i].CompositeScore > agents[j].CompositeScore
	})

	// Assign ranks
	for i := range agents {
		agents[i].Rank = i + 1
	}

	return AgentLeaderboard{
		Role:      role,
		Agents:    agents,
		UpdatedAt: time.Now(),
	}
}

// GetAllLeaderboards returns leaderboards for all roles
func (apt *AgentPerformanceTracker) GetAllLeaderboards() map[AgentRole]AgentLeaderboard {
	result := make(map[AgentRole]AgentLeaderboard)
	for _, role := range []AgentRole{RoleArchitect, RoleEngineer, RoleAuditor, RoleWorker} {
		result[role] = apt.GetLeaderboard(role)
	}
	return result
}

// GetTopAgent returns the best-performing agent for a given role
func (apt *AgentPerformanceTracker) GetTopAgent(role AgentRole) *AgentPerformanceScore {
	lb := apt.GetLeaderboard(role)
	if len(lb.Agents) == 0 {
		return nil
	}
	return &lb.Agents[0]
}

// GetAgentStats returns aggregate stats across all agents
func (apt *AgentPerformanceTracker) GetAgentStats() map[string]interface{} {
	apt.mu.RLock()
	defer apt.mu.RUnlock()

	totalTasks := 0
	totalSuccess := 0
	totalFailed := 0
	agentCount := len(apt.scores)
	var bestScore float64
	bestAgent := ""
	var totalTokens int64

	for _, score := range apt.scores {
		totalTasks += score.TotalTasks
		totalSuccess += score.SuccessTasks
		totalFailed += score.FailedTasks
		totalTokens += score.TotalTokensUsed
		if score.CompositeScore > bestScore {
			bestScore = score.CompositeScore
			bestAgent = score.AgentID
		}
	}

	overallRate := 0.0
	if totalTasks > 0 {
		overallRate = float64(totalSuccess) / float64(totalTasks) * 100
	}

	return map[string]interface{}{
		"agentCount":      agentCount,
		"totalTasks":      totalTasks,
		"totalSuccess":    totalSuccess,
		"totalFailed":     totalFailed,
		"overallSuccessRate": overallRate,
		"bestAgent":       bestAgent,
		"bestScore":       bestScore,
		"totalTokensUsed": totalTokens,
	}
}

// RecommendProvider returns the best provider for a given role based on historical performance
func (apt *AgentPerformanceTracker) RecommendProvider(role AgentRole) string {
	apt.mu.RLock()
	defer apt.mu.RUnlock()

	providerScores := make(map[string]struct {
		total    float64
		count    int
	})

	for _, score := range apt.scores {
		if score.Role == role && score.TotalTasks >= 3 {
			entry := providerScores[score.Provider]
			entry.total += score.CompositeScore
			entry.count++
			providerScores[score.Provider] = entry
		}
	}

	bestProvider := ""
	bestAvg := 0.0
	for provider, entry := range providerScores {
		avg := entry.total / float64(entry.count)
		if avg > bestAvg {
			bestAvg = avg
			bestProvider = provider
		}
	}

	if bestProvider == "" {
		return "openai" // Default
	}
	return bestProvider
}

// ResetAgentScore resets an agent's score (e.g., after configuration changes)
func (apt *AgentPerformanceTracker) ResetAgentScore(agentID string) {
	apt.mu.Lock()
	defer apt.mu.Unlock()

	delete(apt.scores, agentID)
	AuditAction("agent_reset", "system", "agent", agentID, "info", "Agent score reset")
}

// GetProviderEfficiency returns per-provider efficiency metrics from agent performance data
func (apt *AgentPerformanceTracker) GetProviderEfficiency() map[string]map[string]interface{} {
	apt.mu.RLock()
	defer apt.mu.RUnlock()

	result := make(map[string]map[string]interface{})

	for _, score := range apt.scores {
		entry, exists := result[score.Provider]
		if !exists {
			entry = make(map[string]interface{})
			entry["totalTasks"] = 0
			entry["totalSuccess"] = 0
			entry["avgLatency"] = 0.0
			entry["avgScore"] = 0.0
			entry["agentCount"] = 0
			result[score.Provider] = entry
		}

		result[score.Provider]["totalTasks"] = entry["totalTasks"].(int) + score.TotalTasks
		result[score.Provider]["totalSuccess"] = entry["totalSuccess"].(int) + score.SuccessTasks
		result[score.Provider]["avgLatency"] = (entry["avgLatency"].(float64)*float64(entry["agentCount"].(int)) + score.AvgLatencyMs) / float64(entry["agentCount"].(int)+1)
		result[score.Provider]["avgScore"] = (entry["avgScore"].(float64)*float64(entry["agentCount"].(int)) + score.CompositeScore) / float64(entry["agentCount"].(int)+1)
		result[score.Provider]["agentCount"] = entry["agentCount"].(int) + 1
	}

	return result
}

// RecordSwarmAgentTask is a convenience function to record a swarm agent task
func RecordSwarmAgentTask(agentID string, role AgentRole, provider string, taskType string, success bool, latencyMs float64, tokens int, costCents float64) {
	tracker := GetAgentPerformanceTracker()
	tracker.RecordAgentTask(AgentTaskRecord{
		ID:         fmt.Sprintf("task-%d", time.Now().UnixNano()),
		AgentID:    agentID,
		Role:       role,
		Provider:   provider,
		TaskType:   taskType,
		Success:    success,
		LatencyMs:  latencyMs,
		TokensUsed: tokens,
		CostCents:  costCents,
		Timestamp:  time.Now(),
	})
}
