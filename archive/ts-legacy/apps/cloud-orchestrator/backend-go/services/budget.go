package services

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// WorkspaceBudget defines spending limits per workspace
type WorkspaceBudget struct {
	WorkspaceID      string  `json:"workspaceId"`
	DailyLimitCents  float64 `json:"dailyLimitCents"`
	MonthlyLimitCents float64 `json:"monthlyLimitCents"`
	AlertThreshold   float64 `json:"alertThreshold"` // 0.0-1.0, default 0.8
	IsEnforced       bool    `json:"isEnforced"`     // Block requests over budget
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// BudgetStatus is the current spending status for a workspace
type BudgetStatus struct {
	WorkspaceID      string  `json:"workspaceId"`
	TodaySpendCents  float64 `json:"todaySpendCents"`
	MonthSpendCents  float64 `json:"monthSpendCents"`
	DailyLimitCents  float64 `json:"dailyLimitCents"`
	MonthlyLimitCents float64 `json:"monthlyLimitCents"`
	DailyUtilization  float64 `json:"dailyUtilization"`
	MonthlyUtilization float64 `json:"monthlyUtilization"`
	IsOverBudget     bool    `json:"isOverBudget"`
	IsAlertTriggered bool    `json:"isAlertTriggered"`
	RequestsToday    int64   `json:"requestsToday"`
	RequestsMonth    int64   `json:"requestsMonth"`
	TokensToday      int64   `json:"tokensToday"`
	TokensMonth      int64   `json:"tokensMonth"`
}

// budgetCache caches budget state in memory for fast enforcement checks
var (
	budgetCache   map[string]*WorkspaceBudget
	budgetCacheMu sync.RWMutex
)

func init() {
	budgetCache = make(map[string]*WorkspaceBudget)
}

// SetWorkspaceBudget sets or updates budget limits for a workspace
func SetWorkspaceBudget(budget WorkspaceBudget) error {
	if budget.WorkspaceID == "" {
		return fmt.Errorf("workspaceId is required")
	}
	if budget.DailyLimitCents <= 0 && budget.MonthlyLimitCents <= 0 {
		return fmt.Errorf("at least one limit must be > 0")
	}
	if budget.AlertThreshold <= 0 {
		budget.AlertThreshold = 0.8
	}
	budget.UpdatedAt = time.Now()
	if budget.CreatedAt.IsZero() {
		budget.CreatedAt = time.Now()
	}

	budgetCacheMu.Lock()
	budgetCache[budget.WorkspaceID] = &budget
	budgetCacheMu.Unlock()

	AuditAction("budget_set", "budget_manager", "workspace", budget.WorkspaceID, "success",
		fmt.Sprintf("Daily: $%.2f, Monthly: $%.2f, Threshold: %.0f%%, Enforced: %v",
			budget.DailyLimitCents/100, budget.MonthlyLimitCents/100, budget.AlertThreshold*100, budget.IsEnforced))

	return nil
}

// GetWorkspaceBudget retrieves budget settings
func GetWorkspaceBudget(workspaceID string) (*WorkspaceBudget, error) {
	budgetCacheMu.RLock()
	if b, ok := budgetCache[workspaceID]; ok {
		budgetCacheMu.RUnlock()
		return b, nil
	}
	budgetCacheMu.RUnlock()

	// Return default budget (no limit)
	return &WorkspaceBudget{
		WorkspaceID:     workspaceID,
		DailyLimitCents: 0,  // 0 = unlimited
		MonthlyLimitCents: 0,
		AlertThreshold:  0.8,
		IsEnforced:      false,
	}, nil
}

// CheckBudgetAllowance determines if a request should be allowed
func CheckBudgetAllowance(workspaceID string, estimatedCostCents float64) (bool, string) {
	budget, err := GetWorkspaceBudget(workspaceID)
	if err != nil || !budget.IsEnforced {
		return true, "no_budget_enforcement"
	}

	status := GetBudgetStatus(workspaceID)

	if budget.DailyLimitCents > 0 {
		remaining := budget.DailyLimitCents - status.TodaySpendCents
		if remaining <= 0 {
			return false, "daily_budget_exhausted"
		}
		if estimatedCostCents > remaining {
			return false, fmt.Sprintf("daily_budget_insufficient: %.2f cents remaining, %.2f requested", remaining, estimatedCostCents)
		}
	}

	if budget.MonthlyLimitCents > 0 {
		remaining := budget.MonthlyLimitCents - status.MonthSpendCents
		if remaining <= 0 {
			return false, "monthly_budget_exhausted"
		}
		if estimatedCostCents > remaining {
			return false, fmt.Sprintf("monthly_budget_insufficient: %.2f cents remaining, %.2f requested", remaining, estimatedCostCents)
		}
	}

	// Check alert threshold
	if budget.DailyLimitCents > 0 {
		util := status.TodaySpendCents / budget.DailyLimitCents
		if util >= budget.AlertThreshold && !status.IsAlertTriggered {
			go triggerBudgetAlert(workspaceID, "daily", util, status)
		}
	}

	return true, "allowed"
}

// GetBudgetStatus computes current spending status for a workspace
func GetBudgetStatus(workspaceID string) BudgetStatus {
	status := BudgetStatus{WorkspaceID: workspaceID}

	if db.DB == nil {
		return status
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var todayUsages []models.TokenUsage
	db.DB.Where("created_at >= ?", todayStart).Find(&todayUsages)

	var monthUsages []models.TokenUsage
	db.DB.Where("created_at >= ?", monthStart).Find(&monthUsages)

	for _, u := range todayUsages {
		status.TodaySpendCents += float64(u.CostCents)
		status.RequestsToday++
		status.TokensToday += int64(u.TotalTokens)
	}

	for _, u := range monthUsages {
		status.MonthSpendCents += float64(u.CostCents)
		status.RequestsMonth++
		status.TokensMonth += int64(u.TotalTokens)
	}

	budget, _ := GetWorkspaceBudget(workspaceID)
	status.DailyLimitCents = budget.DailyLimitCents
	status.MonthlyLimitCents = budget.MonthlyLimitCents

	if budget.DailyLimitCents > 0 {
		status.DailyUtilization = status.TodaySpendCents / budget.DailyLimitCents
		if status.DailyUtilization >= 1.0 {
			status.IsOverBudget = true
		}
		if status.DailyUtilization >= budget.AlertThreshold {
			status.IsAlertTriggered = true
		}
	}

	if budget.MonthlyLimitCents > 0 {
		status.MonthlyUtilization = status.MonthSpendCents / budget.MonthlyLimitCents
		if status.MonthlyUtilization >= 1.0 {
			status.IsOverBudget = true
		}
	}

	return status
}

// GetAllBudgetStatuses returns budget status for all workspaces with budgets
func GetAllBudgetStatuses() []BudgetStatus {
	budgetCacheMu.RLock()
	defer budgetCacheMu.RUnlock()

	statuses := make([]BudgetStatus, 0, len(budgetCache))
	for workspaceID := range budgetCache {
		statuses = append(statuses, GetBudgetStatus(workspaceID))
	}
	return statuses
}

func triggerBudgetAlert(workspaceID, period string, utilization float64, status BudgetStatus) {
	periodSpend := status.TodaySpendCents
	limit := status.DailyLimitCents
	if period == "monthly" {
		periodSpend = status.MonthSpendCents
		limit = status.MonthlyLimitCents
	}

	CreateNotification(
		"warning",
		"system",
		fmt.Sprintf("Budget Alert: %s %.0f%% utilized", period, utilization*100),
		fmt.Sprintf("Workspace %s has used $%.2f of $%.2f %s budget",
			workspaceID, periodSpend/100, limit/100, period),
		WithPriority(1),
	)

	log.Printf("[Budget] Alert: workspace %s %s budget at %.0f%% ($%.2f/$%.2f)",
		workspaceID, period, utilization*100, periodSpend/100, limit/100)
}

// RemoveWorkspaceBudget removes budget enforcement for a workspace
func RemoveWorkspaceBudget(workspaceID string) {
	budgetCacheMu.Lock()
	delete(budgetCache, workspaceID)
	budgetCacheMu.Unlock()

	AuditAction("budget_removed", "budget_manager", "workspace", workspaceID, "success", "Budget enforcement removed")
}

// GetBudgetStats returns aggregate budget statistics
func GetBudgetStats() map[string]interface{} {
	budgetCacheMu.RLock()
	count := len(budgetCache)
	budgetCacheMu.RUnlock()

	var totalSpend, totalTokens float64
	var totalRequests int64
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	if db.DB != nil {
		var usages []models.TokenUsage
		db.DB.Where("created_at >= ?", todayStart).Find(&usages)
		for _, u := range usages {
			totalSpend += float64(u.CostCents)
			totalTokens += float64(u.TotalTokens)
			totalRequests++
		}
	}

	return map[string]interface{}{
		"workspacesWithBudgets": count,
		"todayTotalSpendCents": totalSpend,
		"todayTotalTokens":     totalTokens,
		"todayTotalRequests":   totalRequests,
	}
}
