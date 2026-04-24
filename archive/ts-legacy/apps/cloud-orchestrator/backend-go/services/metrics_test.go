package services

import (
	"testing"
	"time"
)

func TestMetricsCollectorRecordAndGet(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	// Record some samples
	mc.Record("test_latency", 100, nil)
	mc.Record("test_latency", 200, nil)
	mc.Record("test_latency", 150, nil)

	summary := mc.GetSummary("test_latency", 1*time.Hour)
	if summary.Count != 3 {
		t.Errorf("Count = %d, want 3", summary.Count)
	}
	if summary.Min != 100 {
		t.Errorf("Min = %f, want 100", summary.Min)
	}
	if summary.Max != 200 {
		t.Errorf("Max = %f, want 200", summary.Max)
	}
	if summary.Mean < 149 || summary.Mean > 151 {
		t.Errorf("Mean = %f, want ~150", summary.Mean)
	}
}

func TestMetricsCollectorPercentiles(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 1000,
	}

	// Add 100 samples from 1 to 100
	for i := 1; i <= 100; i++ {
		mc.Record("percentile_test", float64(i), nil)
	}

	summary := mc.GetSummary("percentile_test", 1*time.Hour)
	if summary.P50 < 48 || summary.P50 > 52 {
		t.Errorf("P50 = %f, want ~50", summary.P50)
	}
	if summary.P95 < 93 || summary.P95 > 97 {
		t.Errorf("P95 = %f, want ~95", summary.P95)
	}
	if summary.P99 < 97 || summary.P99 > 100 {
		t.Errorf("P99 = %f, want ~99", summary.P99)
	}
}

func TestMetricsCollectorEmptySummary(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	summary := mc.GetSummary("nonexistent", 1*time.Hour)
	if summary.Count != 0 {
		t.Errorf("Count = %d, want 0", summary.Count)
	}
	if summary.Name != "nonexistent" {
		t.Errorf("Name = %q, want 'nonexistent'", summary.Name)
	}
}

func TestMetricsCollectorWindow(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	// Record an old sample (manually add with old timestamp)
	mc.mu.Lock()
	mc.metrics["window_test"] = append(mc.metrics["window_test"], MetricSample{
		Timestamp: time.Now().Add(-2 * time.Hour),
		Value:     999,
	})
	mc.mu.Unlock()

	// Record a recent sample
	mc.Record("window_test", 50, nil)

	// 1-hour window should only include the recent sample
	summary := mc.GetSummary("window_test", 1*time.Hour)
	if summary.Count != 1 {
		t.Errorf("Count = %d, want 1 (old sample excluded)", summary.Count)
	}
	if summary.Mean != 50 {
		t.Errorf("Mean = %f, want 50", summary.Mean)
	}
}

func TestMetricsCollectorLabels(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	mc.Record("label_test", 1, map[string]string{"error": "connection_timeout"})
	mc.Record("label_test", 2, nil)
	mc.Record("label_test", 3, map[string]string{"error": "rate_limited"})

	summary := mc.GetSummary("label_test", 1*time.Hour)
	if summary.LastError != "rate_limited" {
		t.Errorf("LastError = %q, want 'rate_limited'", summary.LastError)
	}
}

func TestMetricsCollectorMaxSamples(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 5,
	}

	for i := 0; i < 10; i++ {
		mc.Record("evict_test", float64(i), nil)
	}

	if len(mc.metrics["evict_test"]) != 5 {
		t.Errorf("Expected 5 samples after eviction, got %d", len(mc.metrics["evict_test"]))
	}

	// Should keep the last 5 (values 5-9)
	summary := mc.GetSummary("evict_test", 1*time.Hour)
	if summary.Min != 5 {
		t.Errorf("Min = %f, want 5 (oldest after eviction)", summary.Min)
	}
}

func TestGetAllSummaries(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	mc.Record("metric_a", 10, nil)
	mc.Record("metric_b", 20, nil)

	summaries := mc.GetAllSummaries(1 * time.Hour)
	if len(summaries) != 2 {
		t.Errorf("Expected 2 summaries, got %d", len(summaries))
	}
}

func TestGetMetricNames(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	mc.Record("z_metric", 1, nil)
	mc.Record("a_metric", 2, nil)

	names := mc.GetMetricNames()
	if len(names) != 2 {
		t.Fatalf("Expected 2 names, got %d", len(names))
	}
	if names[0] != "a_metric" {
		t.Errorf("Names not sorted: first = %q, want 'a_metric'", names[0])
	}
}

func TestRecordAPILatency(t *testing.T) {
	mc := GetMetricsCollector()
	mc.Record("api_latency", 50, map[string]string{"method": "GET", "path": "/api/test", "status": "200"})
	mc.Record("api_requests", 1, map[string]string{"method": "GET", "path": "/api/test"})

	summary := mc.GetSummary("api_latency", 1*time.Hour)
	if summary.Count < 1 {
		t.Error("Expected at least 1 API latency sample")
	}
}

func TestRecordAPILatencyError(t *testing.T) {
	mc := GetMetricsCollector()
	mc.Record("api_errors", 1, map[string]string{"method": "POST", "path": "/api/fail", "status": "500"})

	summary := mc.GetSummary("api_errors", 1*time.Hour)
	if summary.Count < 1 {
		t.Error("Expected at least 1 error sample")
	}
}

func TestRecordLLMLatency(t *testing.T) {
	mc := GetMetricsCollector()
	RecordLLMLatency("openai", 350.5, true)
	RecordLLMLatency("anthropic", 200.0, false)

	summary := mc.GetSummary("llm_latency", 1*time.Hour)
	if summary.Count < 2 {
		t.Errorf("Expected >= 2 LLM latency samples, got %d", summary.Count)
	}
}

func TestRecordQueueLatency(t *testing.T) {
	mc := GetMetricsCollector()
	RecordQueueLatency("session", 1200.0, true)
	RecordQueueLatency("session", 3000.0, false)

	summary := mc.GetSummary("queue_latency", 1*time.Hour)
	if summary.Count < 2 {
		t.Errorf("Expected >= 2 queue latency samples, got %d", summary.Count)
	}
}

func TestGetMetricsDashboard(t *testing.T) {
	dashboard := GetMetricsDashboard()
	if dashboard == nil {
		t.Fatal("Expected non-nil dashboard")
	}
	if _, ok := dashboard["summaries"]; !ok {
		t.Error("Expected 'summaries' in dashboard")
	}
	if _, ok := dashboard["slaTargets"]; !ok {
		t.Error("Expected 'slaTargets' in dashboard")
	}
	if _, ok := dashboard["timestamp"]; !ok {
		t.Error("Expected 'timestamp' in dashboard")
	}
}

func TestPercentileFunction(t *testing.T) {
	tests := []struct {
		sorted []float64
		p      float64
		want   float64
	}{
		{[]float64{1, 2, 3, 4, 5}, 50, 3},
		{[]float64{1, 2, 3, 4, 5}, 0, 1},
		{[]float64{1, 2, 3, 4, 5}, 100, 5},
		{[]float64{10}, 50, 10},
		{[]float64{}, 50, 0},
		{nil, 50, 0},
		{[]float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 90, 9.1},
	}

	for _, tt := range tests {
		got := percentile(tt.sorted, tt.p)
		if tt.want > 0 && (got < tt.want-0.5 || got > tt.want+0.5) {
			t.Errorf("percentile(%v, %f) = %f, want %f", tt.sorted, tt.p, got, tt.want)
		}
	}
}

func TestSLATargetRegistration(t *testing.T) {
	mc := &MetricsCollector{
		metrics:    make(map[string][]MetricSample),
		slaTargets: make(map[string]SLATarget),
		maxSamples: 100,
	}

	mc.RegisterSLA(SLATarget{
		Name:       "Test SLA",
		TargetPct:  99.9,
		MetricName: "test_metric",
		WindowMins: 5,
	})

	targets := mc.GetSLATargets()
	if len(targets) != 1 {
		t.Fatalf("Expected 1 SLA target, got %d", len(targets))
	}
	if targets[0].Name != "Test SLA" {
		t.Errorf("Name = %q, want 'Test SLA'", targets[0].Name)
	}
}

func TestGetMetricsCollectorSingleton(t *testing.T) {
	mc1 := GetMetricsCollector()
	mc2 := GetMetricsCollector()
	if mc1 != mc2 {
		t.Error("Expected same singleton instance")
	}
}

func TestMetricTypes(t *testing.T) {
	if MetricLatency != "latency" {
		t.Error("MetricLatency mismatch")
	}
	if MetricErrorRate != "error_rate" {
		t.Error("MetricErrorRate mismatch")
	}
	if MetricThroughput != "throughput" {
		t.Error("MetricThroughput mismatch")
	}
	if MetricSLA != "sla" {
		t.Error("MetricSLA mismatch")
	}
}

func TestMetricSummaryStruct(t *testing.T) {
	s := MetricSummary{
		Name:   "test",
		Count:  100,
		Mean:   150.5,
		P95:    450.0,
		P99:    800.0,
		Window: "15m",
	}
	if s.P95 != 450.0 {
		t.Error("P95 mismatch")
	}
}

func TestMetricSampleStruct(t *testing.T) {
	s := MetricSample{
		Timestamp: time.Now(),
		Value:     42.0,
		Labels:    map[string]string{"key": "value"},
	}
	if s.Value != 42.0 {
		t.Error("Value mismatch")
	}
}

func TestSLATargetStruct(t *testing.T) {
	sla := SLATarget{
		Name:       "Test",
		TargetPct:  99.5,
		MetricName: "api_latency",
		WindowMins: 5,
		IsBreached: false,
		CurrentPct: 99.7,
	}
	if sla.TargetPct != 99.5 {
		t.Error("TargetPct mismatch")
	}
}
