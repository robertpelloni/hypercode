package services

import (
	"fmt"
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupCostTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestPredictCostNoData(t *testing.T) {
	setupCostTestDB(t)

	prediction := PredictCost("check_session")
	if prediction.TaskType != "check_session" {
		t.Errorf("TaskType = %q, want 'check_session'", prediction.TaskType)
	}
	if prediction.EstimatedTokens <= 0 {
		t.Error("Expected positive estimated tokens")
	}
	if prediction.CostCents <= 0 {
		t.Error("Expected positive estimated cost")
	}
	if prediction.Basis != "heuristic" {
		t.Errorf("Basis = %q, want 'heuristic'", prediction.Basis)
	}
}

func TestPredictCostWithHistoricalData(t *testing.T) {
	setupCostTestDB(t)

	// Seed some usage data
	for i := 0; i < 15; i++ {
		provider := "openai"
		model := "gpt-4o-mini"
		cost := 0.5
		tokens := 2000
		if i%3 == 0 {
			provider = "anthropic"
			model = "claude-3-5-sonnet-latest"
			cost = 0.8
			tokens = 3000
		}
		sid := fmt.Sprintf("session-%d", i)
		db.DB.Create(&models.TokenUsage{
			ID:               fmt.Sprintf("tu-pred-%d", i),
			SessionID:        &sid,
			Provider:         provider,
			Model:            model,
			PromptTokens:     tokens / 2,
			CompletionTokens: tokens / 2,
			TotalTokens:      tokens,
			RequestType:      "check_session",
			CostCents:        cost,
			DurationMs:       500,
			Success:          true,
			CreatedAt:        time.Now().Add(-time.Duration(i) * time.Hour),
		})
	}

	prediction := PredictCost("check_session")
	if prediction.Basis != "historical" {
		t.Errorf("Basis = %q, want 'historical'", prediction.Basis)
	}
	if prediction.Confidence < 0.7 {
		t.Errorf("Confidence = %.2f, want >= 0.7", prediction.Confidence)
	}
}

func TestHeuristicPredictionKnownTasks(t *testing.T) {
	tasks := []string{"check_session", "debate", "review", "index_codebase", "check_issues", "nudge", "recovery"}
	for _, task := range tasks {
		pred := heuristicPrediction(task)
		if pred.EstimatedTokens <= 0 {
			t.Errorf("Task %q: expected positive tokens", task)
		}
		if pred.CostCents <= 0 {
			t.Errorf("Task %q: expected positive cost", task)
		}
		if pred.Confidence != 0.3 {
			t.Errorf("Task %q: confidence = %.1f, want 0.3", task, pred.Confidence)
		}
	}
}

func TestHeuristicPredictionUnknownTask(t *testing.T) {
	pred := heuristicPrediction("unknown_task")
	if pred.TaskType != "unknown_task" {
		t.Errorf("TaskType = %q", pred.TaskType)
	}
	if pred.EstimatedTokens != 3000 {
		t.Errorf("Unknown task tokens = %d, want 3000", pred.EstimatedTokens)
	}
}

func TestGetProviderCostProfiles(t *testing.T) {
	setupCostTestDB(t)

	// Seed provider data
	for i := 0; i < 5; i++ {
		sid := fmt.Sprintf("s-profile-%d", i)
		provider := "openai"
		model := "gpt-4o-mini"
		cost := 0.5
		if i > 2 {
			provider = "anthropic"
			model = "claude-3-5-sonnet-latest"
			cost = 0.8
		}
		db.DB.Create(&models.TokenUsage{
			ID:           fmt.Sprintf("tu-profile-%d", i),
			SessionID:    &sid,
			Provider:     provider,
			Model:        model,
			TotalTokens:  2000,
			CostCents:    cost,
			DurationMs:   500,
			Success:      true,
			CreatedAt:    time.Now(),
		})
	}

	profiles := GetProviderCostProfiles()
	if len(profiles) < 2 {
		t.Errorf("Expected at least 2 profiles, got %d", len(profiles))
	}
	// Should be sorted by score
	if len(profiles) > 1 {
		if profiles[0].Score < profiles[len(profiles)-1].Score {
			t.Error("Profiles should be sorted by score descending")
		}
	}
}

func TestGetProviderCostProfilesEmpty(t *testing.T) {
	setupCostTestDB(t)

	profiles := GetProviderCostProfiles()
	if profiles == nil {
		t.Error("Expected non-nil slice")
	}
}

func TestGetBudgetReport(t *testing.T) {
	setupCostTestDB(t)

	// Seed some spending
	sid := "s-budget"
	for i := 0; i < 10; i++ {
		provider := "openai"
		cost := 1.5
		if i%2 == 0 {
			provider = "anthropic"
			cost = 2.0
		}
		db.DB.Create(&models.TokenUsage{
			ID:          fmt.Sprintf("tu-budget-%d", i),
			SessionID:   &sid,
			Provider:    provider,
			TotalTokens: 1000,
			CostCents:   cost,
			Success:     true,
			CreatedAt:   time.Now(),
		})
	}

	report := GetBudgetReport(100.0) // $1/day budget
	if report.SpentCents <= 0 {
		t.Error("Expected positive spending")
	}
	if report.BudgetCents <= 0 {
		t.Error("Expected positive budget")
	}
	if report.DaysRemaining < 0 {
		t.Error("Expected non-negative days remaining")
	}
	if len(report.ByProvider) == 0 {
		t.Error("Expected spending by provider")
	}
}

func TestGetBudgetReportZeroBudget(t *testing.T) {
	setupCostTestDB(t)

	report := GetBudgetReport(0)
	if report.BudgetCents != 0 {
		t.Error("Expected zero budget")
	}
}

func TestGetSpendingTrend(t *testing.T) {
	setupCostTestDB(t)

	// Seed data across multiple days
	for i := 0; i < 5; i++ {
		day := time.Now().Add(-time.Duration(i) * 24 * time.Hour)
		sid := fmt.Sprintf("s-trend-%d", i)
		db.DB.Create(&models.TokenUsage{
			ID:          fmt.Sprintf("tu-trend-%d", i),
			SessionID:   &sid,
			Provider:    "openai",
			TotalTokens: 500,
			CostCents:   0.25,
			Success:     true,
			CreatedAt:   day,
		})
	}

	trend, err := GetSpendingTrend(7)
	if err != nil {
		t.Fatalf("GetSpendingTrend error: %v", err)
	}
	if len(trend) != 7 {
		t.Errorf("Expected 7 days, got %d", len(trend))
	}
}

func TestGetSpendingTrendDefault(t *testing.T) {
	setupCostTestDB(t)

	trend, err := GetSpendingTrend(0)
	if err != nil {
		t.Fatalf("GetSpendingTrend error: %v", err)
	}
	if len(trend) != 30 {
		t.Errorf("Expected 30 days default, got %d", len(trend))
	}
}

func TestOptimizeProviderSelection(t *testing.T) {
	setupCostTestDB(t)

	provider, _, strategy := OptimizeProviderSelection("check_session")
	if provider == "" {
		t.Error("Expected non-empty provider")
	}
	if strategy != "optimized" && strategy != "fallback" {
		t.Errorf("Strategy = %q", strategy)
	}
}

func TestCostPredictionStruct(t *testing.T) {
	p := CostPrediction{
		TaskType:            "debate",
		EstimatedTokens:     8000,
		CostCents:  3.2,
		RecommendedProvider: "openai",
		RecommendedModel:    "gpt-4o",
		Confidence:          0.8,
		Basis:               "historical",
	}
	if p.TaskType != "debate" {
		t.Error("TaskType mismatch")
	}
}

func TestDailySpendStruct(t *testing.T) {
	ds := DailySpend{
		Date:      "2026-04-08",
		CostCents: 1.5,
		Tokens:    5000,
		Requests:  10,
	}
	if ds.Date != "2026-04-08" {
		t.Error("Date mismatch")
	}
}
