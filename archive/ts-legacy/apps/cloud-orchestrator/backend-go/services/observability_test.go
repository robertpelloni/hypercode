package services

import (
	"fmt"
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupObservabilityTestDB(t *testing.T) {
	t.Helper()
	database, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
	_ = database
}

func TestRecordTokenUsage(t *testing.T) {
	setupObservabilityTestDB(t)
	sessionID := "session-123"

	err := RecordTokenUsage(&sessionID, "openai", "gpt-4o", 1000, 500, "nudge", 1500, true)
	if err != nil {
		t.Fatalf("RecordTokenUsage failed: %v", err)
	}

	// Verify the record was created
	var count int64
	db.DB.Model(&models.TokenUsage{}).Count(&count)
	if count != 1 {
		t.Fatalf("Expected 1 token usage record, got %d", count)
	}

	var usage models.TokenUsage
	db.DB.First(&usage)
	if usage.Provider != "openai" {
		t.Errorf("Expected provider 'openai', got '%s'", usage.Provider)
	}
	if usage.Model != "gpt-4o" {
		t.Errorf("Expected model 'gpt-4o', got '%s'", usage.Model)
	}
	if usage.PromptTokens != 1000 {
		t.Errorf("Expected 1000 prompt tokens, got %d", usage.PromptTokens)
	}
	if usage.CompletionTokens != 500 {
		t.Errorf("Expected 500 completion tokens, got %d", usage.CompletionTokens)
	}
	if usage.TotalTokens != 1500 {
		t.Errorf("Expected 1500 total tokens, got %d", usage.TotalTokens)
	}
	if usage.RequestType != "nudge" {
		t.Errorf("Expected request type 'nudge', got '%s'", usage.RequestType)
	}
	if !usage.Success {
		t.Error("Expected success to be true")
	}
	if usage.CostCents <= 0 {
		t.Error("Expected positive cost estimate")
	}
}

func TestEstimateCostCents(t *testing.T) {
	tests := []struct {
		provider         string
		model            string
		promptTokens     int
		completionTokens int
		expectPositive   bool
	}{
		{"openai", "gpt-4o", 1000, 500, true},
		{"openai", "gpt-4o-mini", 1000, 500, true},
		{"anthropic", "claude-3.5-sonnet", 1000, 500, true},
		{"anthropic", "claude-3-opus", 1000, 500, true},
		{"gemini", "gemini-1.5-pro", 1000, 500, true},
		{"unknown", "unknown", 1000, 500, true},
	}

	for _, tt := range tests {
		cost := estimateCostCents(tt.provider, tt.model, tt.promptTokens, tt.completionTokens)
		if tt.expectPositive && cost <= 0 {
			t.Errorf("estimateCostCents(%s, %s) = %f, expected positive", tt.provider, tt.model, cost)
		}
	}

	// GPT-4o should cost more than GPT-4o-mini for same tokens
	cost4o := estimateCostCents("openai", "gpt-4o", 1000, 500)
	cost4oMini := estimateCostCents("openai", "gpt-4o-mini", 1000, 500)
	if cost4o <= cost4oMini {
		t.Errorf("Expected gpt-4o (%f) to cost more than gpt-4o-mini (%f)", cost4o, cost4oMini)
	}
}

func TestCaptureHealthSnapshot(t *testing.T) {
	setupObservabilityTestDB(t)

	// Reset the rate limiter for testing
	lastSnapshotTime = time.Time{}

	healthData := map[string]interface{}{
		"status": "ok",
		"checks": map[string]interface{}{
			"database":  map[string]interface{}{"status": "ok"},
			"daemon":    map[string]interface{}{"running": true},
			"worker":    map[string]interface{}{"running": false},
			"scheduler": map[string]interface{}{"running": true},
		},
		"queue": map[string]interface{}{
			"pending":    5,
			"processing": 2,
		},
		"totals": map[string]interface{}{
			"sessions":      10,
			"codeChunks":    100,
			"memoryChunks":  50,
			"notifications": 3,
			"auditEntries":  25,
		},
		"realtime": map[string]interface{}{
			"wsClients": 2,
		},
	}

	err := CaptureHealthSnapshot(healthData)
	if err != nil {
		t.Fatalf("CaptureHealthSnapshot failed: %v", err)
	}

	var snapshot models.HealthSnapshot
	db.DB.First(&snapshot)
	if snapshot.Status != "ok" {
		t.Errorf("Expected status 'ok', got '%s'", snapshot.Status)
	}
	if !snapshot.DatabaseUp {
		t.Error("Expected database to be up")
	}
	if !snapshot.DaemonRunning {
		t.Error("Expected daemon to be running")
	}
	if snapshot.WorkerRunning {
		t.Error("Expected worker to not be running")
	}
	if snapshot.PendingJobs != 5 {
		t.Errorf("Expected 5 pending jobs, got %d", snapshot.PendingJobs)
	}
	if snapshot.Sessions != 10 {
		t.Errorf("Expected 10 sessions, got %d", snapshot.Sessions)
	}
}

func TestHealthSnapshotRateLimit(t *testing.T) {
	setupObservabilityTestDB(t)

	// First call should succeed
	lastSnapshotTime = time.Time{}
	err := CaptureHealthSnapshot(map[string]interface{}{"status": "ok"})
	if err != nil {
		t.Fatalf("First call failed: %v", err)
	}

	var count1 int64
	db.DB.Model(&models.HealthSnapshot{}).Count(&count1)

	// Second immediate call should be rate-limited
	err = CaptureHealthSnapshot(map[string]interface{}{"status": "degraded"})
	if err != nil {
		t.Fatalf("Second call failed: %v", err)
	}

	var count2 int64
	db.DB.Model(&models.HealthSnapshot{}).Count(&count2)
	if count2 != count1 {
		t.Errorf("Rate limiting failed: expected %d snapshots, got %d", count1, count2)
	}
}

func TestGetHealthHistory(t *testing.T) {
	setupObservabilityTestDB(t)

	// Create a snapshot first
	lastSnapshotTime = time.Time{}
	_ = CaptureHealthSnapshot(map[string]interface{}{"status": "ok"})

	snapshots, err := GetHealthHistory(24, 10)
	if err != nil {
		t.Fatalf("GetHealthHistory failed: %v", err)
	}
	if len(snapshots) < 1 {
		t.Errorf("Expected at least 1 snapshot, got %d", len(snapshots))
	}
}

func TestGetTokenUsageStats(t *testing.T) {
	setupObservabilityTestDB(t)

	// Record some token usage
	_ = RecordTokenUsage(nil, "openai", "gpt-4o", 1000, 500, "nudge", 1500, true)
	_ = RecordTokenUsage(nil, "openai", "gpt-4o", 2000, 1000, "review", 2000, true)
	_ = RecordTokenUsage(nil, "anthropic", "claude-3.5-sonnet", 500, 200, "debate", 1000, false)

	report, err := GetTokenUsageStats()
	if err != nil {
		t.Fatalf("GetTokenUsageStats failed: %v", err)
	}

	if report.TotalRequests != 3 {
		t.Errorf("Expected 3 total requests, got %d", report.TotalRequests)
	}
	if report.TotalPromptTokens != 3500 {
		t.Errorf("Expected 3500 total prompt tokens, got %d", report.TotalPromptTokens)
	}
	if report.TotalCompletionTokens != 1700 {
		t.Errorf("Expected 1700 total completion tokens, got %d", report.TotalCompletionTokens)
	}
	if report.FailedRequests != 1 {
		t.Errorf("Expected 1 failed request, got %d", report.FailedRequests)
	}

	openaiStats, ok := report.ByProvider["openai"]
	if !ok {
		t.Fatal("Expected openai provider stats")
	}
	if openaiStats.Requests != 2 {
		t.Errorf("Expected 2 openai requests, got %d", openaiStats.Requests)
	}

	anthropicStats, ok := report.ByProvider["anthropic"]
	if !ok {
		t.Fatal("Expected anthropic provider stats")
	}
	if anthropicStats.Requests != 1 {
		t.Errorf("Expected 1 anthropic request, got %d", anthropicStats.Requests)
	}
}

func TestGetTokenUsageStatsWithFilters(t *testing.T) {
	setupObservabilityTestDB(t)

	_ = RecordTokenUsage(nil, "openai", "gpt-4o", 1000, 500, "nudge", 1500, true)
	_ = RecordTokenUsage(nil, "anthropic", "claude-3.5-sonnet", 500, 200, "debate", 1000, true)

	report, err := GetTokenUsageStats(WithTokenProvider("openai"))
	if err != nil {
		t.Fatalf("GetTokenUsageStats with filter failed: %v", err)
	}

	if report.TotalRequests != 1 {
		t.Errorf("Expected 1 request for openai, got %d", report.TotalRequests)
	}
}

func TestDetectAnomalies(t *testing.T) {
	setupObservabilityTestDB(t)

	// Reset rate limiter
	lastAnomalyCheck = time.Time{}

	// Create a queue backlog condition
	for i := 0; i < 15; i++ {
		db.DB.Create(&models.QueueJob{
			ID:      fmt.Sprintf("backlog-%d", i),
			Type:    "check_session",
			Payload: "{}",
			Status:  "pending",
			RunAt:   time.Now().Add(-1 * time.Hour),
		})
	}

	anomalies, err := DetectAnomalies()
	if err != nil {
		t.Fatalf("DetectAnomalies failed: %v", err)
	}

	if len(anomalies) < 1 {
		t.Error("Expected at least 1 anomaly from queue backlog")
	}

	// Verify the anomaly was persisted
	var activeAnomalies []models.AnomalyRecord
	db.DB.Where("is_resolved = ?", false).Find(&activeAnomalies)
	if len(activeAnomalies) < 1 {
		t.Error("Expected at least 1 persisted anomaly")
	}
}

func TestResolveAnomaly(t *testing.T) {
	setupObservabilityTestDB(t)

	// Create an anomaly
	anomaly := models.AnomalyRecord{
		ID:          "anomaly-1",
		Type:        "queue_backlog",
		Severity:    "high",
		Title:       "Test Anomaly",
		Description: "Test description",
		IsResolved:  false,
	}
	db.DB.Create(&anomaly)

	err := ResolveAnomaly("anomaly-1")
	if err != nil {
		t.Fatalf("ResolveAnomaly failed: %v", err)
	}

	var resolved models.AnomalyRecord
	db.DB.First(&resolved, "id = ?", "anomaly-1")
	if !resolved.IsResolved {
		t.Error("Expected anomaly to be resolved")
	}
	if resolved.ResolvedAt == nil {
		t.Error("Expected resolved_at to be set")
	}
}

func TestGetActiveAnomalies(t *testing.T) {
	setupObservabilityTestDB(t)

	db.DB.Create(&models.AnomalyRecord{
		ID: "a1", Type: "test", Severity: "low", Title: "Active", IsResolved: false,
	})
	db.DB.Create(&models.AnomalyRecord{
		ID: "a2", Type: "test", Severity: "low", Title: "Resolved", IsResolved: true,
	})

	anomalies, err := GetActiveAnomalies()
	if err != nil {
		t.Fatalf("GetActiveAnomalies failed: %v", err)
	}
	if len(anomalies) != 1 {
		t.Errorf("Expected 1 active anomaly, got %d", len(anomalies))
	}
}

func TestGetAnomalyHistory(t *testing.T) {
	setupObservabilityTestDB(t)

	now := time.Now()
	db.DB.Create(&models.AnomalyRecord{
		ID: "h1", Type: "test", Severity: "low", Title: "Historical", IsResolved: true, ResolvedAt: &now,
	})
	db.DB.Create(&models.AnomalyRecord{
		ID: "h2", Type: "test", Severity: "low", Title: "Still active", IsResolved: false,
	})

	anomalies, err := GetAnomalyHistory(10)
	if err != nil {
		t.Fatalf("GetAnomalyHistory failed: %v", err)
	}
	if len(anomalies) != 1 {
		t.Errorf("Expected 1 historical anomaly, got %d", len(anomalies))
	}
}

func TestAnomalyDeduplication(t *testing.T) {
	setupObservabilityTestDB(t)

	lastAnomalyCheck = time.Time{}

	// Create backlog condition
	for i := 0; i < 15; i++ {
		db.DB.Create(&models.QueueJob{
			ID:      fmt.Sprintf("dup-%d", i),
			Type:    "check_session",
			Payload: "{}",
			Status:  "pending",
			RunAt:   time.Now().Add(-1 * time.Hour),
		})
	}

	// Run detection twice rapidly - second should not create duplicates
	anomalies1, _ := DetectAnomalies()
	count1 := len(anomalies1)

	// Reset rate limiter but not enough time for dedup window
	lastAnomalyCheck = time.Time{}
	anomalies2, _ := DetectAnomalies()

	var totalAnomalies int64
	db.DB.Model(&models.AnomalyRecord{}).Where("type = ? AND is_resolved = ?", "queue_backlog", false).Count(&totalAnomalies)

	if totalAnomalies != int64(count1) {
		t.Errorf("Deduplication failed: expected %d anomalies, found %d after second check", count1, totalAnomalies)
	}
	_ = anomalies2
}
