package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupSwarmTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestCreateSwarmValidation(t *testing.T) {
	setupSwarmTestDB(t)

	// Missing rootTask
	_, err := CreateSwarm(CreateSwarmRequest{Title: "Test"})
	if err == nil {
		t.Error("Expected error for missing rootTask")
	}
}

func TestCreateSwarmSuccess(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, err := CreateSwarm(CreateSwarmRequest{
		Title:    "Test Swarm",
		Strategy: SwarmStrategyParallel,
		RootTask: "Implement user authentication",
	})
	if err != nil {
		t.Fatalf("CreateSwarm error: %v", err)
	}
	if swarm.ID == "" {
		t.Error("Expected non-empty ID")
	}
	if swarm.Title != "Test Swarm" {
		t.Errorf("Title = %q, want 'Test Swarm'", swarm.Title)
	}
	if swarm.Status != string(SwarmStatusPlanning) {
		t.Errorf("Status = %q, want 'planning'", swarm.Status)
	}
	if swarm.Strategy != string(SwarmStrategyParallel) {
		t.Errorf("Strategy = %q, want 'parallel'", swarm.Strategy)
	}
}

func TestCreateSwarmDefaultStrategy(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, err := CreateSwarm(CreateSwarmRequest{
		Title:    "Default Strategy",
		RootTask: "Do something",
	})
	if err != nil {
		t.Fatalf("CreateSwarm error: %v", err)
	}
	if swarm.Strategy != string(SwarmStrategyParallel) {
		t.Errorf("Expected default parallel strategy, got %q", swarm.Strategy)
	}
}

func TestGetSwarm(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, _ := CreateSwarm(CreateSwarmRequest{
		Title:    "Get Test",
		RootTask: "Test task",
	})

	found, err := GetSwarm(swarm.ID)
	if err != nil {
		t.Fatalf("GetSwarm error: %v", err)
	}
	if found.ID != swarm.ID {
		t.Errorf("ID mismatch: %q vs %q", found.ID, swarm.ID)
	}
	if found.Title != "Get Test" {
		t.Errorf("Title = %q, want 'Get Test'", found.Title)
	}
}

func TestGetSwarmNotFound(t *testing.T) {
	setupSwarmTestDB(t)

	_, err := GetSwarm("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent swarm")
	}
}

func TestListSwarms(t *testing.T) {
	setupSwarmTestDB(t)

	CreateSwarm(CreateSwarmRequest{Title: "Swarm 1", RootTask: "Task 1"})
	CreateSwarm(CreateSwarmRequest{Title: "Swarm 2", RootTask: "Task 2"})

	swarms, err := ListSwarms("", 10)
	if err != nil {
		t.Fatalf("ListSwarms error: %v", err)
	}
	if len(swarms) < 2 {
		t.Errorf("Expected at least 2 swarms, got %d", len(swarms))
	}
}

func TestListSwarmsByStatus(t *testing.T) {
	setupSwarmTestDB(t)

	CreateSwarm(CreateSwarmRequest{Title: "Planning Swarm", RootTask: "Task"})

	swarms, err := ListSwarms(string(SwarmStatusPlanning), 10)
	if err != nil {
		t.Fatalf("ListSwarms error: %v", err)
	}
	for _, s := range swarms {
		if s.Status != string(SwarmStatusPlanning) {
			t.Errorf("Expected planning status, got %q", s.Status)
		}
	}
}

func TestGetSwarmAgents(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, _ := CreateSwarm(CreateSwarmRequest{Title: "Agent Test", RootTask: "Task"})

	// Create agents manually
	db.DB.Create(&models.SwarmAgent{
		ID:        "agent-1",
		SwarmID:   swarm.ID,
		Role:      "engineer",
		Task:      "Implement X",
		Status:    "pending",
		CreatedAt: time.Now(),
	})
	db.DB.Create(&models.SwarmAgent{
		ID:        "agent-2",
		SwarmID:   swarm.ID,
		Role:      "auditor",
		Task:      "Review X",
		Status:    "pending",
		CreatedAt: time.Now(),
	})

	agents, err := GetSwarmAgents(swarm.ID)
	if err != nil {
		t.Fatalf("GetSwarmAgents error: %v", err)
	}
	if len(agents) != 2 {
		t.Errorf("Expected 2 agents, got %d", len(agents))
	}
}

func TestGetSwarmEvents(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, _ := CreateSwarm(CreateSwarmRequest{Title: "Event Test", RootTask: "Task"})

	events, err := GetSwarmEvents(swarm.ID)
	if err != nil {
		t.Fatalf("GetSwarmEvents error: %v", err)
	}
	// Should have at least the creation event
	if len(events) < 1 {
		t.Errorf("Expected at least 1 event, got %d", len(events))
	}

	// Check the creation event
	found := false
	for _, e := range events {
		if e.EventType == "swarm_created" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected swarm_created event")
	}
}

func TestCancelSwarm(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, _ := CreateSwarm(CreateSwarmRequest{Title: "Cancel Test", RootTask: "Task"})

	err := CancelSwarm(swarm.ID)
	if err != nil {
		t.Fatalf("CancelSwarm error: %v", err)
	}

	found, _ := GetSwarm(swarm.ID)
	if found.Status != string(SwarmStatusCancelled) {
		t.Errorf("Status = %q, want 'cancelled'", found.Status)
	}
}

func TestCancelSwarmNotFound(t *testing.T) {
	setupSwarmTestDB(t)

	err := CancelSwarm("nonexistent")
	if err == nil {
		t.Error("Expected error for canceling nonexistent swarm")
	}
}

func TestHeuristicDecompose(t *testing.T) {
	result, err := heuristicDecompose("Implement authentication")
	if err != nil {
		t.Fatalf("heuristicDecompose error: %v", err)
	}
	if len(result.SubTasks) != 1 {
		t.Errorf("Expected 1 subtask, got %d", len(result.SubTasks))
	}
	if result.Strategy != "sequential" {
		t.Errorf("Expected sequential strategy, got %q", result.Strategy)
	}
	if result.SubTasks[0].Description != "Implement authentication" {
		t.Errorf("Subtask description = %q", result.SubTasks[0].Description)
	}
}

func TestGetRolePrompt(t *testing.T) {
	tests := []struct {
		role     SwarmAgentRole
		contains string
	}{
		{SwarmRoleArchitect, "architect"},
		{SwarmRoleEngineer, "engineer"},
		{SwarmRoleAuditor, "auditor"},
		{SwarmRoleCoordinator, "coordinator"},
		{"unknown", "expert"},
	}

	for _, tt := range tests {
		prompt := getRolePrompt(tt.role)
		if prompt == "" {
			t.Errorf("Expected non-empty prompt for role %q", tt.role)
		}
	}
}

func TestSwarmWithSourceRepo(t *testing.T) {
	setupSwarmTestDB(t)

	swarm, err := CreateSwarm(CreateSwarmRequest{
		Title:      "Repo Swarm",
		RootTask:   "Fix bug in repo",
		SourceRepo: "owner/repo",
		Strategy:   SwarmStrategySequential,
	})
	if err != nil {
		t.Fatalf("CreateSwarm error: %v", err)
	}
	if swarm.SourceRepo != "owner/repo" {
		t.Errorf("SourceRepo = %q, want 'owner/repo'", swarm.SourceRepo)
	}
	if swarm.Strategy != string(SwarmStrategySequential) {
		t.Errorf("Strategy = %q, want 'sequential'", swarm.Strategy)
	}
}

func TestSwarmConstants(t *testing.T) {
	if SwarmStrategyParallel != "parallel" {
		t.Error("SwarmStrategyParallel constant mismatch")
	}
	if SwarmStrategySequential != "sequential" {
		t.Error("SwarmStrategySequential constant mismatch")
	}
	if SwarmStrategyPipeline != "pipeline" {
		t.Error("SwarmStrategyPipeline constant mismatch")
	}
	if SwarmRoleArchitect != "architect" {
		t.Error("SwarmRoleArchitect constant mismatch")
	}
	if SwarmRoleEngineer != "engineer" {
		t.Error("SwarmRoleEngineer constant mismatch")
	}
	if SwarmRoleAuditor != "auditor" {
		t.Error("SwarmRoleAuditor constant mismatch")
	}
	if SwarmStatusRunning != "running" {
		t.Error("SwarmStatusRunning constant mismatch")
	}
}
