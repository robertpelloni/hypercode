package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupBudgetTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestSetWorkspaceBudgetValidation(t *testing.T) {
	setupBudgetTestDB(t)

	tests := []struct {
		name    string
		budget  WorkspaceBudget
		wantErr bool
	}{
		{"valid", WorkspaceBudget{WorkspaceID: "ws-1", DailyLimitCents: 100}, false},
		{"missing ID", WorkspaceBudget{DailyLimitCents: 100}, true},
		{"no limits", WorkspaceBudget{WorkspaceID: "ws-2"}, true},
		{"monthly only", WorkspaceBudget{WorkspaceID: "ws-3", MonthlyLimitCents: 3000}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := SetWorkspaceBudget(tt.budget)
			if (err != nil) != tt.wantErr {
				t.Errorf("SetWorkspaceBudget() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestGetWorkspaceBudget(t *testing.T) {
	budget, err := GetWorkspaceBudget("nonexistent")
	if err != nil {
		t.Fatalf("GetWorkspaceBudget error: %v", err)
	}
	if budget.WorkspaceID != "nonexistent" {
		t.Errorf("WorkspaceID = %q, want 'nonexistent'", budget.WorkspaceID)
	}
	if budget.IsEnforced {
		t.Error("Default budget should not be enforced")
	}
}

func TestGetWorkspaceBudgetSet(t *testing.T) {
	SetWorkspaceBudget(WorkspaceBudget{
		WorkspaceID:     "ws-budget-test",
		DailyLimitCents: 500,
		IsEnforced:      true,
	})

	budget, _ := GetWorkspaceBudget("ws-budget-test")
	if budget.DailyLimitCents != 500 {
		t.Errorf("DailyLimitCents = %f, want 500", budget.DailyLimitCents)
	}
	if !budget.IsEnforced {
		t.Error("Expected IsEnforced = true")
	}

	// Cleanup
	RemoveWorkspaceBudget("ws-budget-test")
}

func TestCheckBudgetAllowanceNoEnforcement(t *testing.T) {
	allowed, reason := CheckBudgetAllowance("ws-no-budget", 100)
	if !allowed {
		t.Error("Expected to be allowed without budget")
	}
	if reason != "no_budget_enforcement" {
		t.Errorf("Reason = %q, want 'no_budget_enforcement'", reason)
	}
}

func TestCheckBudgetAllowanceWithinBudget(t *testing.T) {
	SetWorkspaceBudget(WorkspaceBudget{
		WorkspaceID:     "ws-within",
		DailyLimitCents: 1000,
		IsEnforced:      true,
	})
	defer RemoveWorkspaceBudget("ws-within")

	allowed, _ := CheckBudgetAllowance("ws-within", 100)
	if !allowed {
		t.Error("Expected to be allowed within budget")
	}
}

func TestCheckBudgetAllowanceOverDaily(t *testing.T) {
	setupBudgetTestDB(t)

	SetWorkspaceBudget(WorkspaceBudget{
		WorkspaceID:     "ws-over-daily",
		DailyLimitCents: 1, // Very small budget
		IsEnforced:      true,
	})
	defer RemoveWorkspaceBudget("ws-over-daily")

	// Create spending that exceeds budget
	sid := "session-budget-over"
	db.DB.Create(&models.TokenUsage{
		ID:          "tu-budget-1",
		SessionID:   &sid,
		Provider:    "openai",
		TotalTokens: 100,
		CostCents:   5.0, // Exceeds 1 cent budget
		Success:     true,
		CreatedAt:   time.Now(),
	})

	allowed, reason := CheckBudgetAllowance("ws-over-daily", 1)
	if allowed {
		t.Error("Expected to be blocked over daily budget")
	}
	if reason != "daily_budget_exhausted" {
		t.Errorf("Reason = %q, want 'daily_budget_exhausted'", reason)
	}
}

func TestGetBudgetStatus(t *testing.T) {
	setupBudgetTestDB(t)

	status := GetBudgetStatus("ws-status-test")
	if status.WorkspaceID != "ws-status-test" {
		t.Errorf("WorkspaceID = %q", status.WorkspaceID)
	}
}

func TestGetBudgetStatusWithSpending(t *testing.T) {
	setupBudgetTestDB(t)

	// Create some spending
	sid := "session-budget-status"
	db.DB.Create(&models.TokenUsage{
		ID:          "tu-status-1",
		SessionID:   &sid,
		Provider:    "openai",
		TotalTokens: 500,
		CostCents:   2.5,
		Success:     true,
		CreatedAt:   time.Now(),
	})

	status := GetBudgetStatus("default")
	if status.RequestsToday != 1 {
		t.Errorf("RequestsToday = %d, want 1", status.RequestsToday)
	}
	if status.TodaySpendCents != 2.5 {
		t.Errorf("TodaySpendCents = %f, want 2.5", status.TodaySpendCents)
	}
	if status.TokensToday != 500 {
		t.Errorf("TokensToday = %d, want 500", status.TokensToday)
	}
}

func TestRemoveWorkspaceBudget(t *testing.T) {
	SetWorkspaceBudget(WorkspaceBudget{
		WorkspaceID:     "ws-remove",
		DailyLimitCents: 100,
	})

	RemoveWorkspaceBudget("ws-remove")

	budget, _ := GetWorkspaceBudget("ws-remove")
	if budget.IsEnforced {
		t.Error("Expected removed budget to not be enforced")
	}
}

func TestGetAllBudgetStatuses(t *testing.T) {
	SetWorkspaceBudget(WorkspaceBudget{WorkspaceID: "ws-all-1", DailyLimitCents: 100})
	SetWorkspaceBudget(WorkspaceBudget{WorkspaceID: "ws-all-2", DailyLimitCents: 200})

	statuses := GetAllBudgetStatuses()
	if len(statuses) < 2 {
		t.Errorf("Expected at least 2 statuses, got %d", len(statuses))
	}

	RemoveWorkspaceBudget("ws-all-1")
	RemoveWorkspaceBudget("ws-all-2")
}

func TestGetBudgetStats(t *testing.T) {
	setupBudgetTestDB(t)

	stats := GetBudgetStats()
	if stats == nil {
		t.Fatal("Expected non-nil stats")
	}
	if _, ok := stats["todayTotalRequests"]; !ok {
		t.Error("Expected todayTotalRequests in stats")
	}
}

func TestWorkspaceBudgetStruct(t *testing.T) {
	b := WorkspaceBudget{
		WorkspaceID:       "ws-struct",
		DailyLimitCents:   100,
		MonthlyLimitCents: 3000,
		AlertThreshold:    0.8,
		IsEnforced:        true,
	}
	if b.WorkspaceID != "ws-struct" {
		t.Error("WorkspaceID mismatch")
	}
	if !b.IsEnforced {
		t.Error("IsEnforced should be true")
	}
}

func TestBudgetStatusStruct(t *testing.T) {
	s := BudgetStatus{
		WorkspaceID:       "ws-s",
		TodaySpendCents:   50,
		DailyLimitCents:   100,
		DailyUtilization:  0.5,
		IsOverBudget:      false,
		RequestsToday:     10,
		TokensToday:       5000,
	}
	if s.DailyUtilization != 0.5 {
		t.Error("DailyUtilization mismatch")
	}
}
