package services

import (
	"fmt"
	"math"
	"sort"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// CostPrediction predicts the cost and tokens for a given task type
type CostPrediction struct {
	TaskType          string  `json:"taskType"`
	EstimatedTokens   int64   `json:"estimatedTokens"`
	CostCents float64 `json:"estimatedCostCents"`
	RecommendedProvider string `json:"recommendedProvider"`
	RecommendedModel  string  `json:"recommendedModel"`
	Confidence        float64 `json:"confidence"`
	Basis             string  `json:"basis"` // "historical" or "heuristic"
}

// ProviderCostProfile tracks cost efficiency per provider
type ProviderCostProfile struct {
	Provider       string  `json:"provider"`
	Model          string  `json:"model"`
	AvgTokensPerReq int64  `json:"avgTokensPerReq"`
	AvgCostPerReq  float64 `json:"avgCostPerReqCents"`
	AvgLatencyMs   int64   `json:"avgLatencyMs"`
	SuccessRate    float64 `json:"successRate"`
	TotalRequests  int64   `json:"totalRequests"`
	TotalCostCents float64 `json:"totalCostCents"`
	Score          float64 `json:"score"` // Composite efficiency score
}

// BudgetReport tracks spending against a budget
type BudgetReport struct {
	Period          string  `json:"period"`
	SpentCents      float64 `json:"spentCents"`
	BudgetCents     float64 `json:"budgetCents"`
	Utilization     float64 `json:"utilization"` // 0.0 - 1.0
	ProjectedCents  float64 `json:"projectedCents"`
	Trend           string  `json:"trend"` // "under", "on_track", "over"
	ByProvider      map[string]float64 `json:"byProvider"`
	DaysRemaining   int     `json:"daysRemaining"`
	RecommendedPause bool   `json:"recommendedPause"`
}

// CostOptimizer provides predictive cost analysis and provider optimization
type CostOptimizer struct {
	profiles map[string]*ProviderCostProfile
	mu       sync.RWMutex
}

var (
	globalOptimizer *CostOptimizer
	optimizerOnce   sync.Once
)

func GetCostOptimizer() *CostOptimizer {
	optimizerOnce.Do(func() {
		globalOptimizer = &CostOptimizer{
			profiles: make(map[string]*ProviderCostProfile),
		}
		globalOptimizer.refreshProfiles()
	})
	return globalOptimizer
}

// PredictCost estimates the cost of a task type based on historical data
func PredictCost(taskType string) CostPrediction {
	opt := GetCostOptimizer()
	opt.mu.RLock()
	defer opt.mu.RUnlock()

	// Look for historical data for this task type
	var usages []models.TokenUsage
	db.DB.Where("provider IS NOT NULL AND provider != ''").Find(&usages)

	if len(usages) == 0 {
		return heuristicPrediction(taskType)
	}

	// Calculate average from historical data
	var totalTokens, totalCost float64
	for _, u := range usages {
		totalTokens += float64(u.TotalTokens)
		totalCost += float64(u.CostCents)
	}

	avgTokens := totalTokens / float64(len(usages))
	avgCost := totalCost / float64(len(usages))

	// Find best provider
	best := opt.findBestProvider()

	confidence := 0.5
	if len(usages) >= 10 {
		confidence = 0.8
	} else if len(usages) >= 5 {
		confidence = 0.65
	}

	return CostPrediction{
		TaskType:            taskType,
		EstimatedTokens:     int64(avgTokens),
		CostCents:  avgCost,
		RecommendedProvider: best.Provider,
		RecommendedModel:    best.Model,
		Confidence:          confidence,
		Basis:               "historical",
	}
}

// heuristicPrediction provides estimates when no historical data exists
func heuristicPrediction(taskType string) CostPrediction {
	estimates := map[string]struct {
		tokens    int64
		costCents float64
		provider  string
		model     string
	}{
		"check_session":    {2000, 0.6, "openai", "gpt-4o-mini"},
		"debate":           {8000, 3.2, "openai", "gpt-4o"},
		"review":           {5000, 1.5, "openai", "gpt-4o-mini"},
		"index_codebase":   {3000, 0.9, "openai", "gpt-4o-mini"},
		"check_issues":     {1500, 0.4, "openai", "gpt-4o-mini"},
		"nudge":            {1000, 0.3, "openai", "gpt-4o-mini"},
		"recovery":         {4000, 1.2, "openai", "gpt-4o"},
		"swarm_decompose":  {6000, 2.0, "openai", "gpt-4o"},
		"swarm_agent":      {5000, 1.5, "openai", "gpt-4o"},
		"rag_query":        {2000, 0.6, "openai", "gpt-4o-mini"},
	}

	est, ok := estimates[taskType]
	if !ok {
		est = struct {
			tokens    int64
			costCents float64
			provider  string
			model     string
		}{3000, 0.9, "openai", "gpt-4o-mini"}
	}

	return CostPrediction{
		TaskType:            taskType,
		EstimatedTokens:     est.tokens,
		CostCents:  est.costCents,
		RecommendedProvider: est.provider,
		RecommendedModel:    est.model,
		Confidence:          0.3,
		Basis:               "heuristic",
	}
}

// GetProviderCostProfiles returns efficiency metrics per provider
func GetProviderCostProfiles() []ProviderCostProfile {
	opt := GetCostOptimizer()
	opt.refreshProfiles()

	opt.mu.RLock()
	defer opt.mu.RUnlock()

	result := make([]ProviderCostProfile, 0, len(opt.profiles))
	for _, p := range opt.profiles {
		result = append(result, *p)
	}

	// Sort by score (best first)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Score > result[j].Score
	})

	return result
}

// GetBudgetReport generates a spending report for the current period
func GetBudgetReport(dailyBudgetCents float64) BudgetReport {
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	daysInMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, now.Location()).Day()
	dayOfMonth := now.Day()
	daysRemaining := daysInMonth - dayOfMonth

	// Query total spending this month
	var usages []models.TokenUsage
	db.DB.Where("created_at >= ?", startOfMonth).Find(&usages)

	var totalCost float64
	byProvider := make(map[string]float64)
	for _, u := range usages {
		cost := float64(u.CostCents)
		totalCost += cost
		if u.Provider != "" {
			byProvider[u.Provider] += cost
		}
	}

	monthlyBudget := dailyBudgetCents * float64(daysInMonth)
	utilization := 0.0
	if monthlyBudget > 0 {
		utilization = totalCost / monthlyBudget
	}

	// Project spending for the rest of the month
	var projected float64
	if dayOfMonth > 0 {
		dailyAvg := totalCost / float64(dayOfMonth)
		projected = dailyAvg * float64(daysInMonth)
	}

	trend := "on_track"
	if utilization > 1.0 {
		trend = "over"
	} else if utilization < 0.7 {
		trend = "under"
	}

	recommendedPause := false
	if daysRemaining > 0 && monthlyBudget > 0 {
		remainingBudget := monthlyBudget - totalCost
		dailyAllowance := remainingBudget / float64(daysRemaining)
		// If daily allowance is less than $0.01, recommend pause
		if dailyAllowance < 1.0 && totalCost > monthlyBudget*0.9 {
			recommendedPause = true
		}
	}

	return BudgetReport{
		Period:           startOfMonth.Format("2006-01"),
		SpentCents:       totalCost,
		BudgetCents:      monthlyBudget,
		Utilization:      math.Min(utilization, 2.0),
		ProjectedCents:   projected,
		Trend:            trend,
		ByProvider:       byProvider,
		DaysRemaining:    daysRemaining,
		RecommendedPause: recommendedPause,
	}
}

// GetSpendingTrend returns daily spending for the last N days
func GetSpendingTrend(days int) ([]DailySpend, error) {
	if days <= 0 {
		days = 30
	}

	now := time.Now()
	results := make([]DailySpend, days)

	for i := 0; i < days; i++ {
		date := now.AddDate(0, 0, -(days - 1 - i))
		dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		dayEnd := dayStart.Add(24 * time.Hour)

		var totalCents float64
		var tokenCount int64
		var requestCount int64

		if db.DB != nil {
			var usages []models.TokenUsage
			db.DB.Where("created_at >= ? AND created_at < ?", dayStart, dayEnd).Find(&usages)
			for _, u := range usages {
				totalCents += float64(u.CostCents)
				tokenCount += int64(u.TotalTokens)
				requestCount++
			}
		}

		results[i] = DailySpend{
			Date:         dayStart.Format("2006-01-02"),
			CostCents:    totalCents,
			Tokens:       tokenCount,
			Requests:     requestCount,
		}
	}

	return results, nil
}

// DailySpend represents spending for a single day
type DailySpend struct {
	Date      string  `json:"date"`
	CostCents float64 `json:"costCents"`
	Tokens    int64   `json:"tokens"`
	Requests  int64   `json:"requests"`
}

// refreshProfiles rebuilds provider efficiency profiles from historical data
func (o *CostOptimizer) refreshProfiles() {
	if db.DB == nil {
		return
	}

	var usages []models.TokenUsage
	db.DB.Where("provider IS NOT NULL AND provider != ''").Find(&usages)

	// Group by provider+model
	type key struct{ provider, model string }
	groups := make(map[key][]models.TokenUsage)
	for _, u := range usages {
		k := key{u.Provider, u.Model}
		groups[k] = append(groups[k], u)
	}

	o.mu.Lock()
	defer o.mu.Unlock()

	o.profiles = make(map[string]*ProviderCostProfile)

	for k, group := range groups {
		var totalTokens, totalCost, totalLatency float64
		var successCount int64
		for _, u := range group {
			totalTokens += float64(u.TotalTokens)
			totalCost += float64(u.CostCents)
			if u.DurationMs > 0 {
				totalLatency += float64(u.DurationMs)
			}
			successCount++
		}

		n := float64(len(group))
		avgTokens := totalTokens / n
		avgCost := totalCost / n
		avgLatency := totalLatency / n

		// Composite score: lower cost + lower latency + higher reliability
		// Normalized: cost (cents) * 10 + latency (ms) / 1000
		score := 100.0
		if avgCost > 0 {
			score = score / (avgCost * 5)
		}
		if avgLatency > 0 {
			score = score * (1000 / (1000 + avgLatency))
		}

		id := fmt.Sprintf("%s/%s", k.provider, k.model)
		o.profiles[id] = &ProviderCostProfile{
			Provider:        k.provider,
			Model:           k.model,
			AvgTokensPerReq: int64(avgTokens),
			AvgCostPerReq:   avgCost,
			AvgLatencyMs:    int64(avgLatency),
			SuccessRate:     float64(successCount) / n,
			TotalRequests:   int64(n),
			TotalCostCents:  totalCost,
			Score:           score,
		}
	}
}

func (o *CostOptimizer) findBestProvider() ProviderCostProfile {
	o.mu.RLock()
	defer o.mu.RUnlock()

	best := ProviderCostProfile{Provider: "openai", Model: "gpt-4o-mini", Score: 1.0}
	for _, p := range o.profiles {
		if p.Score > best.Score {
			best = *p
		}
	}
	return best
}

// OptimizeProviderSelection recommends the best provider for a given task
func OptimizeProviderSelection(taskType string) (string, string, string) {
	prediction := PredictCost(taskType)

	// If we have high confidence, use the recommendation
	if prediction.Confidence >= 0.7 {
		return prediction.RecommendedProvider, prediction.RecommendedModel, "optimized"
	}

	// Otherwise, fall back to supervisor settings
	return getSupervisorProvider(), "", "fallback"
}
