package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
)

func newTestTracker() *AgentPerformanceTracker {
	return &AgentPerformanceTracker{
		scores: make(map[string]*AgentPerformanceScore),
	}
}

func TestRecordAgentTaskSuccess(t *testing.T) {
	tracker := newTestTracker()

	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID:   "agent-1",
		Role:      RoleArchitect,
		Provider:  "openai",
		TaskType:  "design",
		Success:   true,
		LatencyMs: 500,
		TokensUsed: 1000,
		CostCents: 5.0,
		Timestamp: time.Now(),
	})

	score, found := tracker.GetAgentScore("agent-1")
	if !found {
		t.Fatal("Expected agent score to exist")
	}
	if score.TotalTasks != 1 {
		t.Errorf("TotalTasks = %d, want 1", score.TotalTasks)
	}
	if score.SuccessTasks != 1 {
		t.Errorf("SuccessTasks = %d, want 1", score.SuccessTasks)
	}
	if score.SuccessRate != 100 {
		t.Errorf("SuccessRate = %f, want 100", score.SuccessRate)
	}
	if score.Streak != 1 {
		t.Errorf("Streak = %d, want 1", score.Streak)
	}
}

func TestRecordAgentTaskFailure(t *testing.T) {
	tracker := newTestTracker()

	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID:   "agent-fail",
		Role:      RoleEngineer,
		Provider:  "anthropic",
		Success:   true,
		LatencyMs: 200,
		TokensUsed: 500,
		CostCents: 3.0,
		Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID:   "agent-fail",
		Role:      RoleEngineer,
		Provider:  "anthropic",
		Success:   false,
		LatencyMs: 5000,
		TokensUsed: 100,
		CostCents: 1.0,
		Error:     "timeout",
		Timestamp: time.Now(),
	})

	score, _ := tracker.GetAgentScore("agent-fail")
	if score.FailedTasks != 1 {
		t.Errorf("FailedTasks = %d, want 1", score.FailedTasks)
	}
	if score.Streak != 0 {
		t.Errorf("Streak = %d, want 0 (reset on failure)", score.Streak)
	}
	if score.SuccessRate != 50 {
		t.Errorf("SuccessRate = %f, want 50", score.SuccessRate)
	}
}

func TestAgentCompositeScore(t *testing.T) {
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	tracker := newTestTracker()

	// Record 10 successful fast tasks
	for i := 0; i < 10; i++ {
		tracker.RecordAgentTask(AgentTaskRecord{
			AgentID:   "top-agent",
			Role:      RoleArchitect,
			Provider:  "openai",
			Success:   true,
			LatencyMs: 100,
			TokensUsed: 200,
			CostCents: 1.0,
			Timestamp:  time.Now(),
		})
	}

	score, _ := tracker.GetAgentScore("top-agent")
	if score.CompositeScore < 80 {
		t.Errorf("CompositeScore = %f, expected >= 80 for successful fast cheap agent", score.CompositeScore)
	}
	if score.BestStreak != 10 {
		t.Errorf("BestStreak = %d, want 10", score.BestStreak)
	}
}

func TestAgentStreakTracking(t *testing.T) {
	tracker := newTestTracker()

	// 5 successes then 1 failure then 3 successes
	for i := 0; i < 5; i++ {
		tracker.RecordAgentTask(AgentTaskRecord{
			AgentID: "streak-agent", Role: RoleWorker, Provider: "gemini",
			Success: true, Timestamp: time.Now(),
		})
	}
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "streak-agent", Role: RoleWorker, Provider: "gemini",
		Success: false, Timestamp: time.Now(),
	})
	for i := 0; i < 3; i++ {
		tracker.RecordAgentTask(AgentTaskRecord{
			AgentID: "streak-agent", Role: RoleWorker, Provider: "gemini",
			Success: true, Timestamp: time.Now(),
		})
	}

	score, _ := tracker.GetAgentScore("streak-agent")
	if score.Streak != 3 {
		t.Errorf("Streak = %d, want 3 (current streak after failure)", score.Streak)
	}
	if score.BestStreak != 5 {
		t.Errorf("BestStreak = %d, want 5 (best before failure)", score.BestStreak)
	}
}

func TestGetLeaderboard(t *testing.T) {
	tracker := newTestTracker()

	// Create agents with different performance
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "lb-1", Role: RoleArchitect, Provider: "openai",
		Success: true, LatencyMs: 100, CostCents: 1, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "lb-2", Role: RoleArchitect, Provider: "anthropic",
		Success: false, LatencyMs: 3000, CostCents: 10, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "lb-3", Role: RoleEngineer, Provider: "gemini",
		Success: true, LatencyMs: 200, CostCents: 2, Timestamp: time.Now(),
	})

	lb := tracker.GetLeaderboard(RoleArchitect)
	if len(lb.Agents) != 2 {
		t.Fatalf("Expected 2 architects, got %d", len(lb.Agents))
	}
	if lb.Agents[0].AgentID != "lb-1" {
		t.Errorf("Top agent = %q, want 'lb-1'", lb.Agents[0].AgentID)
	}
	if lb.Agents[0].Rank != 1 {
		t.Errorf("Rank = %d, want 1", lb.Agents[0].Rank)
	}
}

func TestGetAllLeaderboards(t *testing.T) {
	tracker := newTestTracker()

	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "all-1", Role: RoleArchitect, Provider: "openai",
		Success: true, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "all-2", Role: RoleEngineer, Provider: "anthropic",
		Success: true, Timestamp: time.Now(),
	})

	lbs := tracker.GetAllLeaderboards()
	if len(lbs[RoleArchitect].Agents) != 1 {
		t.Error("Expected 1 architect in leaderboard")
	}
	if len(lbs[RoleEngineer].Agents) != 1 {
		t.Error("Expected 1 engineer in leaderboard")
	}
}

func TestGetTopAgent(t *testing.T) {
	tracker := newTestTracker()

	// No agents
	top := tracker.GetTopAgent(RoleAuditor)
	if top != nil {
		t.Error("Expected nil for empty leaderboard")
	}

	// Add agents
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "top-1", Role: RoleAuditor, Provider: "openai",
		Success: true, LatencyMs: 100, CostCents: 1, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "top-2", Role: RoleAuditor, Provider: "gemini",
		Success: false, LatencyMs: 5000, CostCents: 50, Timestamp: time.Now(),
	})

	top = tracker.GetTopAgent(RoleAuditor)
	if top == nil {
		t.Fatal("Expected non-nil top agent")
	}
	if top.AgentID != "top-1" {
		t.Errorf("Top agent = %q, want 'top-1'", top.AgentID)
	}
}

func TestGetAgentStats(t *testing.T) {
	tracker := newTestTracker()

	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "stats-1", Role: RoleWorker, Provider: "openai",
		Success: true, TokensUsed: 500, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "stats-2", Role: RoleWorker, Provider: "anthropic",
		Success: false, TokensUsed: 300, Timestamp: time.Now(),
	})

	stats := tracker.GetAgentStats()
	if stats["agentCount"] != 2 {
		t.Errorf("agentCount = %v, want 2", stats["agentCount"])
	}
	if stats["totalTasks"] != 2 {
		t.Errorf("totalTasks = %v, want 2", stats["totalTasks"])
	}
	if stats["overallSuccessRate"] != 50.0 {
		t.Errorf("overallSuccessRate = %v, want 50", stats["overallSuccessRate"])
	}
}

func TestRecommendProvider(t *testing.T) {
	tracker := newTestTracker()

	// No data - should return default
	rec := tracker.RecommendProvider(RoleArchitect)
	if rec != "openai" {
		t.Errorf("Default recommendation = %q, want 'openai'", rec)
	}

	// Add data: anthropic performs better
	for i := 0; i < 5; i++ {
		tracker.RecordAgentTask(AgentTaskRecord{
			AgentID: "rec-anth", Role: RoleArchitect, Provider: "anthropic",
			Success: true, LatencyMs: 100, CostCents: 1, Timestamp: time.Now(),
		})
	}
	for i := 0; i < 5; i++ {
		tracker.RecordAgentTask(AgentTaskRecord{
			AgentID: "rec-oai", Role: RoleArchitect, Provider: "openai",
			Success: false, LatencyMs: 3000, CostCents: 20, Timestamp: time.Now(),
		})
	}

	rec = tracker.RecommendProvider(RoleArchitect)
	if rec != "anthropic" {
		t.Errorf("Recommendation = %q, want 'anthropic'", rec)
	}
}

func TestResetAgentScore(t *testing.T) {
	tracker := newTestTracker()

	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "reset-me", Role: RoleWorker, Provider: "openai",
		Success: true, Timestamp: time.Now(),
	})

	tracker.ResetAgentScore("reset-me")

	_, found := tracker.GetAgentScore("reset-me")
	if found {
		t.Error("Expected agent to be removed after reset")
	}
}

func TestGetAgentScoreNotFound(t *testing.T) {
	tracker := newTestTracker()
	_, found := tracker.GetAgentScore("nonexistent")
	if found {
		t.Error("Expected not found for nonexistent agent")
	}
}

func TestRecordSwarmAgentTask(t *testing.T) {
	RecordSwarmAgentTask("swarm-1", RoleWorker, "openai", "implement", true, 500, 1000, 5.0)
	// Should not panic
}

func TestAgentRoleConstants(t *testing.T) {
	if RoleArchitect != "architect" {
		t.Error("RoleArchitect mismatch")
	}
	if RoleEngineer != "engineer" {
		t.Error("RoleEngineer mismatch")
	}
	if RoleAuditor != "auditor" {
		t.Error("RoleAuditor mismatch")
	}
	if RoleWorker != "worker" {
		t.Error("RoleWorker mismatch")
	}
}

func TestAvgLatencyRunningAverage(t *testing.T) {
	tracker := newTestTracker()

	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "avg-agent", Role: RoleWorker, Provider: "openai",
		LatencyMs: 200, Success: true, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "avg-agent", Role: RoleWorker, Provider: "openai",
		LatencyMs: 400, Success: true, Timestamp: time.Now(),
	})
	tracker.RecordAgentTask(AgentTaskRecord{
		AgentID: "avg-agent", Role: RoleWorker, Provider: "openai",
		LatencyMs: 600, Success: true, Timestamp: time.Now(),
	})

	score, _ := tracker.GetAgentScore("avg-agent")
	if score.AvgLatencyMs < 399 || score.AvgLatencyMs > 401 {
		t.Errorf("AvgLatencyMs = %f, want ~400", score.AvgLatencyMs)
	}
}

func TestGetAgentPerformanceTrackerSingleton(t *testing.T) {
	t1 := GetAgentPerformanceTracker()
	t2 := GetAgentPerformanceTracker()
	if t1 != t2 {
		t.Error("Expected singleton tracker")
	}
}
