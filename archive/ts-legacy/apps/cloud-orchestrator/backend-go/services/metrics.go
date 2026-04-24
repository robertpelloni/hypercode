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

// MetricType categorizes different metric kinds
type MetricType string

const (
	MetricLatency    MetricType = "latency"
	MetricErrorRate  MetricType = "error_rate"
	MetricThroughput MetricType = "throughput"
	MetricSLA        MetricType = "sla"
)

// MetricSample is a single data point
type MetricSample struct {
	Timestamp time.Time         `json:"timestamp"`
	Value     float64           `json:"value"`
	Labels    map[string]string `json:"labels,omitempty"`
}

// MetricSummary is aggregated statistics over a time window
type MetricSummary struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	Count      int     `json:"count"`
	Sum        float64 `json:"sum"`
	Mean       float64 `json:"mean"`
	Min        float64 `json:"min"`
	Max        float64 `json:"max"`
	P50        float64 `json:"p50"`
	P95        float64 `json:"p95"`
	P99        float64 `json:"p99"`
	LastError  string  `json:"lastError,omitempty"`
	RatePerSec float64 `json:"ratePerSec"`
	Window     string  `json:"window"`
}

// SLATarget defines an SLA for a service component
type SLATarget struct {
	Name       string  `json:"name"`
	TargetPct  float64 `json:"targetPct"`
	MetricName string  `json:"metricName"`
	WindowMins int     `json:"windowMins"`
	IsBreached bool    `json:"isBreached"`
	CurrentPct float64 `json:"currentPct"`
}

// MetricsCollector provides real-time metrics collection with histograms
type MetricsCollector struct {
	metrics    map[string][]MetricSample
	slaTargets map[string]SLATarget
	mu         sync.RWMutex
	maxSamples int
}

var (
	globalCollector *MetricsCollector
	collectorOnce   sync.Once
)

// GetMetricsCollector returns the singleton collector
func GetMetricsCollector() *MetricsCollector {
	collectorOnce.Do(func() {
		globalCollector = &MetricsCollector{
			metrics:    make(map[string][]MetricSample),
			slaTargets: make(map[string]SLATarget),
			maxSamples: 10000,
		}
		globalCollector.RegisterSLA(SLATarget{
			Name:       "API Response Time P95 < 500ms",
			TargetPct:  95.0,
			MetricName: "api_latency",
			WindowMins: 5,
		})
		globalCollector.RegisterSLA(SLATarget{
			Name:       "Error Rate < 1%",
			TargetPct:  99.0,
			MetricName: "api_errors",
			WindowMins: 5,
		})
		globalCollector.RegisterSLA(SLATarget{
			Name:       "Queue Processing > 90%",
			TargetPct:  90.0,
			MetricName: "queue_throughput",
			WindowMins: 15,
		})
	})
	return globalCollector
}

// Record adds a metric sample
func (mc *MetricsCollector) Record(name string, value float64, labels map[string]string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	sample := MetricSample{
		Timestamp: time.Now(),
		Value:     value,
		Labels:    labels,
	}

	mc.metrics[name] = append(mc.metrics[name], sample)

	if len(mc.metrics[name]) > mc.maxSamples {
		mc.metrics[name] = mc.metrics[name][len(mc.metrics[name])-mc.maxSamples:]
	}
}

// GetSummary computes aggregate statistics for a metric over a time window
func (mc *MetricsCollector) GetSummary(name string, window time.Duration) MetricSummary {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	cutoff := time.Now().Add(-window)
	summary := MetricSummary{
		Name:   name,
		Window: fmt.Sprintf("%.0fm", window.Minutes()),
	}

	samples, ok := mc.metrics[name]
	if !ok || len(samples) == 0 {
		return summary
	}

	var values []float64
	var lastError string
	windowStart := time.Now().Add(-window)
	for _, s := range samples {
		if s.Timestamp.After(cutoff) {
			values = append(values, s.Value)
			if s.Labels != nil {
				if e, exists := s.Labels["error"]; exists && e != "" {
					lastError = e
				}
			}
		}
	}

	if len(values) == 0 {
		return summary
	}

	sort.Float64s(values)

	summary.Count = len(values)
	summary.LastError = lastError

	var sum float64
	for _, v := range values {
		sum += v
	}
	summary.Sum = sum
	summary.Mean = sum / float64(len(values))
	summary.Min = values[0]
	summary.Max = values[len(values)-1]
	summary.P50 = percentile(values, 50)
	summary.P95 = percentile(values, 95)
	summary.P99 = percentile(values, 99)

	// Rate per second
	windowSecs := time.Since(windowStart).Seconds()
	if windowSecs > 0 {
		summary.RatePerSec = float64(len(values)) / windowSecs
	}

	return summary
}

// GetAllSummaries returns summaries for all tracked metrics
func (mc *MetricsCollector) GetAllSummaries(window time.Duration) map[string]MetricSummary {
	mc.mu.RLock()
	names := make([]string, 0, len(mc.metrics))
	for name := range mc.metrics {
		names = append(names, name)
	}
	mc.mu.RUnlock()

	result := make(map[string]MetricSummary, len(names))
	for _, name := range names {
		result[name] = mc.GetSummary(name, window)
	}
	return result
}

// GetMetricNames returns all tracked metric names
func (mc *MetricsCollector) GetMetricNames() []string {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	names := make([]string, 0, len(mc.metrics))
	for name := range mc.metrics {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// RegisterSLA registers an SLA target
func (mc *MetricsCollector) RegisterSLA(target SLATarget) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.slaTargets[target.Name] = target
}

// GetSLATargets returns all SLA targets with current breach status
func (mc *MetricsCollector) GetSLATargets() []SLATarget {
	mc.mu.RLock()
	targets := make([]SLATarget, 0, len(mc.slaTargets))
	for _, t := range mc.slaTargets {
		targets = append(targets, t)
	}
	mc.mu.RUnlock()

	// Evaluate each target
	for i, t := range targets {
		switch t.MetricName {
		case "api_latency":
			summary := mc.GetSummary("api_latency", time.Duration(t.WindowMins)*time.Minute)
			if summary.Count > 0 {
				targets[i].CurrentPct = (1.0 - summary.P95/5000.0) * 100 // Normalize to 5s max
				if targets[i].CurrentPct < 0 {
					targets[i].CurrentPct = 0
				}
				targets[i].IsBreached = summary.P95 > 500 // Breach if P95 > 500ms
			}
		case "api_errors":
			summary := mc.GetSummary("api_errors", time.Duration(t.WindowMins)*time.Minute)
			totalSummary := mc.GetSummary("api_requests", time.Duration(t.WindowMins)*time.Minute)
			if totalSummary.Count > 0 {
				errorRate := float64(summary.Count) / float64(totalSummary.Count) * 100
				targets[i].CurrentPct = 100 - errorRate
				targets[i].IsBreached = errorRate > 1.0
			}
		case "queue_throughput":
			summary := mc.GetSummary("queue_throughput", time.Duration(t.WindowMins)*time.Minute)
			if summary.Count > 0 {
				targets[i].CurrentPct = summary.Mean
				targets[i].IsBreached = summary.Mean < t.TargetPct
			}
		default:
			summary := mc.GetSummary(t.MetricName, time.Duration(t.WindowMins)*time.Minute)
			if summary.Count > 0 {
				targets[i].CurrentPct = summary.Mean
				targets[i].IsBreached = summary.Mean < t.TargetPct
			}
		}
	}

	return targets
}

// RecordAPILatency records an API request latency
func RecordAPILatency(method, path string, durationMs float64, statusCode int) {
	mc := GetMetricsCollector()
	mc.Record("api_latency", durationMs, map[string]string{
		"method": method,
		"path":   path,
		"status": fmt.Sprintf("%d", statusCode),
	})
	mc.Record("api_requests", 1, map[string]string{
		"method": method,
		"path":   path,
	})
	if statusCode >= 400 {
		mc.Record("api_errors", 1, map[string]string{
			"method": method,
			"path":   path,
			"status": fmt.Sprintf("%d", statusCode),
		})
	}
}

// RecordLLMLatency records an LLM call latency
func RecordLLMLatency(provider string, durationMs float64, success bool) {
	mc := GetMetricsCollector()
	labels := map[string]string{
		"provider": provider,
	}
	if !success {
		labels["error"] = "llm_call_failed"
	}
	mc.Record("llm_latency", durationMs, labels)
	if success {
		mc.Record("llm_success", 1, map[string]string{"provider": provider})
	} else {
		mc.Record("llm_errors", 1, map[string]string{"provider": provider, "error": "call_failed"})
	}
}

// RecordQueueLatency records queue job processing time
func RecordQueueLatency(jobType string, durationMs float64, success bool) {
	mc := GetMetricsCollector()
	labels := map[string]string{"type": jobType}
	if !success {
		labels["error"] = "queue_job_failed"
	}
	mc.Record("queue_latency", durationMs, labels)
	mc.Record("queue_throughput", map[bool]float64{true: 100, false: 0}[success], labels)
}

// GetMetricsDashboard returns a comprehensive metrics dashboard payload
func GetMetricsDashboard() map[string]interface{} {
	mc := GetMetricsCollector()
	window := 15 * time.Minute

	summaries := mc.GetAllSummaries(window)
	slaTargets := mc.GetSLATargets()

	breached := 0
	for _, t := range slaTargets {
		if t.IsBreached {
			breached++
		}
	}

	// Compute from DB token usage
	var totalTokens, totalCost, totalRequests int64
	if db.DB != nil {
		now := time.Now()
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		var usages []models.TokenUsage
		db.DB.Where("created_at >= ?", todayStart).Find(&usages)
		for _, u := range usages {
			totalTokens += int64(u.TotalTokens)
			totalCost += int64(u.CostCents)
			totalRequests++
		}
	}

	return map[string]interface{}{
		"summaries":     summaries,
		"slaTargets":    slaTargets,
		"slaBreaches":   breached,
		"metricNames":   mc.GetMetricNames(),
		"window":        "15m",
		"todayTokens":   totalTokens,
		"todayCostCents": totalCost,
		"todayRequests": totalRequests,
		"timestamp":     time.Now(),
	}
}

// percentile computes the p-th percentile of sorted values
func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	if len(sorted) == 1 {
		return sorted[0]
	}
	rank := p / 100.0 * float64(len(sorted)-1)
	lower := int(math.Floor(rank))
	upper := int(math.Ceil(rank))
	if lower == upper {
		return sorted[lower]
	}
	frac := rank - float64(lower)
	return sorted[lower]*(1-frac) + sorted[upper]*frac
}
