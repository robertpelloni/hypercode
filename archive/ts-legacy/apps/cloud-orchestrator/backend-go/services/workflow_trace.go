package services

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// TraceStatus represents the state of a trace step
type TraceStatus string

const (
	TracePending   TraceStatus = "pending"
	TraceRunning   TraceStatus = "running"
	TraceSuccess   TraceStatus = "success"
	TraceFailed    TraceStatus = "failed"
	TraceSkipped   TraceStatus = "skipped"
	TraceCancelled TraceStatus = "cancelled"
)

// TraceStep is a single step in a workflow trace
type TraceStep struct {
	ID          string                 `json:"id"`
	TraceID     string                 `json:"traceId"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"` // llm_call, git_op, review, test, deploy, analyze
	Status      TraceStatus            `json:"status"`
	ParentID    string                 `json:"parentId,omitempty"`
	ChildrenIDs []string               `json:"childrenIds,omitempty"`
	StartedAt   *time.Time             `json:"startedAt,omitempty"`
	FinishedAt  *time.Time             `json:"finishedAt,omitempty"`
	DurationMs  int64                  `json:"durationMs"`
	Input       map[string]interface{} `json:"input,omitempty"`
	Output      map[string]interface{} `json:"output,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	Metadata    map[string]string      `json:"metadata,omitempty"`
}

// WorkflowTrace is the full trace of an autonomous workflow
type WorkflowTrace struct {
	ID              string      `json:"id"`
	SessionID       string      `json:"sessionId"`
	Name            string      `json:"name"`
	Status          TraceStatus `json:"status"`
	Steps           []TraceStep `json:"steps"`
	StartedAt       time.Time   `json:"startedAt"`
	FinishedAt      *time.Time  `json:"finishedAt,omitempty"`
	TotalDurationMs int64       `json:"totalDurationMs"`
	StepCount       int         `json:"stepCount"`
	Tags            []string    `json:"tags,omitempty"`
}

// TraceStats provides aggregate workflow statistics
type TraceStats struct {
	TotalTraces      int                `json:"totalTraces"`
	ActiveTraces     int                `json:"activeTraces"`
	AvgDurationMs    int64              `json:"avgDurationMs"`
	SuccessRate      float64            `json:"successRate"`
	ByType           map[string]int     `json:"byType"`
	ByStatus         map[TraceStatus]int `json:"byStatus"`
	AvgStepsPerTrace float64            `json:"avgStepsPerTrace"`
}

// WorkflowTracer manages workflow traces
type WorkflowTracer struct {
	traces map[string]*WorkflowTrace
	mu     sync.RWMutex
}

var (
	globalTracer *WorkflowTracer
	tracerOnce   sync.Once
)

// GetWorkflowTracer returns the singleton tracer
func GetWorkflowTracer() *WorkflowTracer {
	tracerOnce.Do(func() {
		globalTracer = &WorkflowTracer{
			traces: make(map[string]*WorkflowTrace),
		}
	})
	return globalTracer
}

// StartTrace creates a new workflow trace
func (wt *WorkflowTracer) StartTrace(sessionID, name string, tags []string) *WorkflowTrace {
	trace := &WorkflowTrace{
		ID:        fmt.Sprintf("trace-%d", time.Now().UnixNano()),
		SessionID: sessionID,
		Name:      name,
		Status:    TraceRunning,
		Steps:     make([]TraceStep, 0),
		StartedAt: time.Now(),
		Tags:      tags,
	}

	wt.mu.Lock()
	wt.traces[trace.ID] = trace
	wt.mu.Unlock()

	AuditAction("trace_started", sessionID, "trace", trace.ID, "info",
		fmt.Sprintf("Workflow trace started: %s", name))

	emitRealtime(map[string]interface{}{
		"type": "trace_started",
		"data": map[string]interface{}{
			"traceId":   trace.ID,
			"sessionId": sessionID,
			"name":      name,
		},
	})

	return trace
}

// AddStep adds a step to a trace
func (wt *WorkflowTracer) AddStep(traceID, name, stepType, parentID string, input map[string]interface{}) (*TraceStep, error) {
	wt.mu.Lock()
	defer wt.mu.Unlock()

	trace, ok := wt.traces[traceID]
	if !ok {
		return nil, fmt.Errorf("trace %s not found", traceID)
	}

	now := time.Now()
	step := TraceStep{
		ID:        fmt.Sprintf("step-%d-%s", time.Now().UnixNano(), name),
		TraceID:   traceID,
		Name:      name,
		Type:      stepType,
		Status:    TraceRunning,
		ParentID:  parentID,
		StartedAt: &now,
		Input:     input,
	}

	trace.Steps = append(trace.Steps, step)
	trace.StepCount = len(trace.Steps)

	// Update parent's children
	if parentID != "" {
		for i, s := range trace.Steps {
			if s.ID == parentID {
				trace.Steps[i].ChildrenIDs = append(trace.Steps[i].ChildrenIDs, step.ID)
				break
			}
		}
	}

	emitRealtime(map[string]interface{}{
		"type": "trace_step_started",
		"data": map[string]interface{}{
			"traceId": traceID,
			"stepId":  step.ID,
			"name":    name,
			"type":    stepType,
		},
	})

	return &step, nil
}

// CompleteStep marks a step as complete
func (wt *WorkflowTracer) CompleteStep(traceID, stepID string, output map[string]interface{}, err error) error {
	wt.mu.Lock()
	defer wt.mu.Unlock()

	trace, ok := wt.traces[traceID]
	if !ok {
		return fmt.Errorf("trace %s not found", traceID)
	}

	now := time.Now()
	for i, step := range trace.Steps {
		if step.ID == stepID {
			trace.Steps[i].FinishedAt = &now
			trace.Steps[i].DurationMs = now.Sub(*step.StartedAt).Milliseconds()
			trace.Steps[i].Output = output

			if err != nil {
				trace.Steps[i].Status = TraceFailed
				trace.Steps[i].Error = err.Error()
			} else {
				trace.Steps[i].Status = TraceSuccess
			}

			emitRealtime(map[string]interface{}{
				"type": "trace_step_completed",
				"data": map[string]interface{}{
					"traceId":    traceID,
					"stepId":     stepID,
					"status":     trace.Steps[i].Status,
					"durationMs": trace.Steps[i].DurationMs,
				},
			})

			return nil
		}
	}

	return fmt.Errorf("step %s not found in trace %s", stepID, traceID)
}

// FinishTrace marks a trace as complete
func (wt *WorkflowTracer) FinishTrace(traceID string, err error) error {
	wt.mu.Lock()
	defer wt.mu.Unlock()

	trace, ok := wt.traces[traceID]
	if !ok {
		return fmt.Errorf("trace %s not found", traceID)
	}

	now := time.Now()
	trace.FinishedAt = &now
	trace.TotalDurationMs = now.Sub(trace.StartedAt).Milliseconds()

	if err != nil {
		trace.Status = TraceFailed
	} else {
		allSuccess := true
		for _, step := range trace.Steps {
			if step.Status == TraceFailed {
				allSuccess = false
				break
			}
		}
		if allSuccess {
			trace.Status = TraceSuccess
		} else {
			trace.Status = TraceFailed
		}
	}

	AuditAction("trace_finished", trace.SessionID, "trace", traceID, string(trace.Status),
		fmt.Sprintf("Workflow trace finished: %s (%d steps, %dms)",
			trace.Name, trace.StepCount, trace.TotalDurationMs))

	emitRealtime(map[string]interface{}{
		"type": "trace_finished",
		"data": map[string]interface{}{
			"traceId":        traceID,
			"status":         trace.Status,
			"totalDurationMs": trace.TotalDurationMs,
			"stepCount":      trace.StepCount,
		},
	})

	return nil
}

// GetTrace returns a specific trace
func (wt *WorkflowTracer) GetTrace(traceID string) (*WorkflowTrace, error) {
	wt.mu.RLock()
	defer wt.mu.RUnlock()

	trace, ok := wt.traces[traceID]
	if !ok {
		return nil, fmt.Errorf("trace %s not found", traceID)
	}
	return trace, nil
}

// GetTracesForSession returns all traces for a session
func (wt *WorkflowTracer) GetTracesForSession(sessionID string) []WorkflowTrace {
	wt.mu.RLock()
	defer wt.mu.RUnlock()

	var traces []WorkflowTrace
	for _, trace := range wt.traces {
		if trace.SessionID == sessionID {
			traces = append(traces, *trace)
		}
	}
	return traces
}

// GetAllTraces returns all traces
func (wt *WorkflowTracer) GetAllTraces(limit int) []WorkflowTrace {
	wt.mu.RLock()
	defer wt.mu.RUnlock()

	if limit <= 0 {
		limit = 50
	}

	traces := make([]WorkflowTrace, 0, len(wt.traces))
	for _, trace := range wt.traces {
		traces = append(traces, *trace)
		if len(traces) >= limit {
			break
		}
	}
	return traces
}

// GetActiveTraces returns all currently running traces
func (wt *WorkflowTracer) GetActiveTraces() []WorkflowTrace {
	wt.mu.RLock()
	defer wt.mu.RUnlock()

	var active []WorkflowTrace
	for _, trace := range wt.traces {
		if trace.Status == TraceRunning {
			active = append(active, *trace)
		}
	}
	return active
}

// GetTraceStats returns aggregate trace statistics
func (wt *WorkflowTracer) GetTraceStats() TraceStats {
	wt.mu.RLock()
	defer wt.mu.RUnlock()

	stats := TraceStats{
		ByType:   make(map[string]int),
		ByStatus: make(map[TraceStatus]int),
	}

	var totalDuration int64
	var totalSteps int

	for _, trace := range wt.traces {
		stats.TotalTraces++
		totalDuration += trace.TotalDurationMs
		totalSteps += trace.StepCount

		if trace.Status == TraceRunning {
			stats.ActiveTraces++
		}
		stats.ByStatus[trace.Status]++

		for _, step := range trace.Steps {
			stats.ByType[step.Type]++
		}
	}

	if stats.TotalTraces > 0 {
		stats.AvgDurationMs = totalDuration / int64(stats.TotalTraces)
		stats.AvgStepsPerTrace = float64(totalSteps) / float64(stats.TotalTraces)

		successCount := stats.ByStatus[TraceSuccess]
		stats.SuccessRate = float64(successCount) / float64(stats.TotalTraces) * 100
	}

	return stats
}

// CancelTrace cancels a running trace
func (wt *WorkflowTracer) CancelTrace(traceID string) error {
	wt.mu.Lock()
	defer wt.mu.Unlock()

	trace, ok := wt.traces[traceID]
	if !ok {
		return fmt.Errorf("trace %s not found", traceID)
	}

	now := time.Now()
	trace.Status = TraceCancelled
	trace.FinishedAt = &now
	trace.TotalDurationMs = now.Sub(trace.StartedAt).Milliseconds()

	for i, step := range trace.Steps {
		if step.Status == TraceRunning {
			trace.Steps[i].Status = TraceCancelled
			trace.Steps[i].FinishedAt = &now
		}
	}

	emitRealtime(map[string]interface{}{
		"type": "trace_cancelled",
		"data": map[string]interface{}{"traceId": traceID},
	})
	return nil
}

// QuickTraceStep runs a function as a traced step
func (wt *WorkflowTracer) QuickTraceStep(traceID, name, stepType string, fn func() (map[string]interface{}, error)) error {
	step, err := wt.AddStep(traceID, name, stepType, "", nil)
	if err != nil {
		return err
	}
	output, fnErr := fn()
	return wt.CompleteStep(traceID, step.ID, output, fnErr)
}

// QuickTraceStep runs a function as a traced step on the global tracer
func QuickTraceStep(traceID, name, stepType string, fn func() (map[string]interface{}, error)) error {
	return GetWorkflowTracer().QuickTraceStep(traceID, name, stepType, fn)
}

// TraceStepToJSON serializes a step
func TraceStepToJSON(step TraceStep) string {
	data, _ := json.Marshal(step)
	return string(data)
}
