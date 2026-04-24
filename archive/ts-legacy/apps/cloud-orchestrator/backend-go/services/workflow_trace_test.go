package services

import (
	"fmt"
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
)

func setupTraceTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}


func TestStartTrace(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()

	trace := tracer.StartTrace("sess-1", "Build Feature", []string{"autonomous"})
	if trace.ID == "" {
		t.Error("Expected non-empty trace ID")
	}
	if trace.Status != TraceRunning {
		t.Errorf("Status = %q, want 'running'", trace.Status)
	}
	if trace.Name != "Build Feature" {
		t.Errorf("Name = %q, want 'Build Feature'", trace.Name)
	}
	if trace.StartedAt.IsZero() {
		t.Error("Expected non-zero start time")
	}
}

func TestAddStep(t *testing.T) {
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-2", "Test Trace", nil)

	step, err := tracer.AddStep(trace.ID, "Analyze Code", "llm_call", "", map[string]interface{}{
		"model": "openai",
	})
	if err != nil {
		t.Fatalf("AddStep error: %v", err)
	}
	if step.Name != "Analyze Code" {
		t.Errorf("Name = %q", step.Name)
	}
	if step.Type != "llm_call" {
		t.Errorf("Type = %q", step.Type)
	}
	if step.Status != TraceRunning {
		t.Errorf("Status = %q, want 'running'", step.Status)
	}
	if step.StartedAt == nil {
		t.Error("Expected non-nil StartedAt")
	}
}

func TestAddStepNotFound(t *testing.T) {
	tracer := GetWorkflowTracer()
	_, err := tracer.AddStep("nonexistent", "Step", "test", "", nil)
	if err == nil {
		t.Error("Expected error for nonexistent trace")
	}
}

func TestCompleteStep(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-3", "Test", nil)
	step, _ := tracer.AddStep(trace.ID, "Step 1", "review", "", nil)

	err := tracer.CompleteStep(trace.ID, step.ID, map[string]interface{}{
		"score": 8.5,
	}, nil)
	if err != nil {
		t.Fatalf("CompleteStep error: %v", err)
	}

	updated, _ := tracer.GetTrace(trace.ID)
	if len(updated.Steps) != 1 {
		t.Fatalf("Expected 1 step, got %d", len(updated.Steps))
	}
	if updated.Steps[0].Status != TraceSuccess {
		t.Errorf("Status = %q, want 'success'", updated.Steps[0].Status)
	}
}

func TestCompleteStepWithError(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-4", "Test", nil)
	step, _ := tracer.AddStep(trace.ID, "Failing Step", "test", "", nil)

	tracer.CompleteStep(trace.ID, step.ID, nil, fmt.Errorf("test failed"))

	updated, _ := tracer.GetTrace(trace.ID)
	if updated.Steps[0].Status != TraceFailed {
		t.Errorf("Status = %q, want 'failed'", updated.Steps[0].Status)
	}
	if updated.Steps[0].Error != "test failed" {
		t.Errorf("Error = %q", updated.Steps[0].Error)
	}
}

func TestCompleteStepNotFound(t *testing.T) {
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-5", "Test", nil)
	err := tracer.CompleteStep(trace.ID, "bad-step-id", nil, nil)
	if err == nil {
		t.Error("Expected error for nonexistent step")
	}
}

func TestFinishTrace(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-6", "Test", nil)
	step, _ := tracer.AddStep(trace.ID, "Step", "test", "", nil)
	tracer.CompleteStep(trace.ID, step.ID, nil, nil)

	err := tracer.FinishTrace(trace.ID, nil)
	if err != nil {
		t.Fatalf("FinishTrace error: %v", err)
	}

	finished, _ := tracer.GetTrace(trace.ID)
	if finished.Status != TraceSuccess {
		t.Errorf("Status = %q, want 'success'", finished.Status)
	}
	if finished.FinishedAt == nil {
		t.Error("Expected non-nil FinishedAt")
	}
}

func TestFinishTraceWithFailure(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-7", "Test", nil)

	err := tracer.FinishTrace(trace.ID, fmt.Errorf("fatal error"))
	if err != nil {
		t.Fatalf("FinishTrace error: %v", err)
	}

	finished, _ := tracer.GetTrace(trace.ID)
	if finished.Status != TraceFailed {
		t.Errorf("Status = %q, want 'failed'", finished.Status)
	}
}

func TestFinishTraceNotFound(t *testing.T) {
	tracer := GetWorkflowTracer()
	err := tracer.FinishTrace("nonexistent", nil)
	if err == nil {
		t.Error("Expected error for nonexistent trace")
	}
}

func TestCancelTrace(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("sess-8", "Test", nil)
	tracer.AddStep(trace.ID, "Running Step", "test", "", nil)

	tracer.CancelTrace(trace.ID)

	cancelled, _ := tracer.GetTrace(trace.ID)
	if cancelled.Status != TraceCancelled {
		t.Errorf("Status = %q, want 'cancelled'", cancelled.Status)
	}
	// Running step should also be cancelled
	if cancelled.Steps[0].Status != TraceCancelled {
		t.Errorf("Step status = %q, want 'cancelled'", cancelled.Steps[0].Status)
	}
}

func TestCancelTraceNotFound(t *testing.T) {
	tracer := GetWorkflowTracer()
	err := tracer.CancelTrace("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent trace")
	}
}

func TestGetTracesForSession(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	tracer.StartTrace("sess-a", "Trace A", nil)
	tracer.StartTrace("sess-b", "Trace B", nil)
	tracer.StartTrace("sess-a", "Trace A2", nil)

	traces := tracer.GetTracesForSession("sess-a")
	if len(traces) < 2 {
		t.Errorf("Expected 2 traces for sess-a, got %d", len(traces))
	}
}

func TestGetAllTraces(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	tracer.StartTrace("s1", "T1", nil)
	tracer.StartTrace("s2", "T2", nil)
	tracer.StartTrace("s3", "T3", nil)

	all := tracer.GetAllTraces(2)
	if len(all) != 2 {
		t.Errorf("Expected 2 traces with limit=2, got %d", len(all))
	}
}

func TestGetActiveTraces(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	t1 := tracer.StartTrace("s1", "Active", nil)
	tracer.StartTrace("s2", "Also Active", nil)
	_ = tracer.FinishTrace(t1.ID, nil)

	active := tracer.GetActiveTraces()
	if len(active) < 1 {
		t.Errorf("Expected 1 active trace, got %d", len(active))
	}
}

func TestGetTraceStats(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()

	t1 := tracer.StartTrace("s1", "T1", nil)
	step, _ := tracer.AddStep(t1.ID, "Step", "llm_call", "", nil)
	_ = tracer.CompleteStep(t1.ID, step.ID, nil, nil)
	_ = tracer.FinishTrace(t1.ID, nil)

	t2 := tracer.StartTrace("s2", "T2", nil)
	_ = tracer.FinishTrace(t2.ID, fmt.Errorf("failed"))

	stats := tracer.GetTraceStats()
	if stats.TotalTraces < 2 {
		t.Errorf("TotalTraces = %d, want 2", stats.TotalTraces)
	}
}

func TestGetTraceStatsEmpty(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	stats := tracer.GetTraceStats()
	if stats.TotalTraces < 0 {
		t.Errorf("TotalTraces = %d, want 0", stats.TotalTraces)
	}
}

func TestParentChildSteps(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("s1", "Parent Child", nil)

	parent, _ := tracer.AddStep(trace.ID, "Parent", "pipeline", "", nil)
	child, _ := tracer.AddStep(trace.ID, "Child", "llm_call", parent.ID, nil)
	tracer.CompleteStep(trace.ID, parent.ID, nil, nil)
	tracer.CompleteStep(trace.ID, child.ID, nil, nil)

	updated, _ := tracer.GetTrace(trace.ID)
	if len(updated.Steps) != 2 {
		t.Fatalf("Expected 2 steps, got %d", len(updated.Steps))
	}
	if len(updated.Steps[0].ChildrenIDs) != 1 {
		t.Errorf("Expected 1 child, got %d", len(updated.Steps[0].ChildrenIDs))
	}
	if updated.Steps[0].ChildrenIDs[0] != updated.Steps[1].ID {
		t.Error("Child ID mismatch")
	}
}

func TestQuickTraceStep(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("s1", "Quick", nil)

	err := tracer.QuickTraceStep(trace.ID, "Quick Step", "test", func() (map[string]interface{}, error) {
		return map[string]interface{}{"result": "ok"}, nil
	})
	if err != nil {
		t.Fatalf("QuickTraceStep error: %v", err)
	}

	updated, _ := tracer.GetTrace(trace.ID)
	if len(updated.Steps) != 1 {
		t.Fatalf("Expected 1 step, got %d", len(updated.Steps))
	}
	if updated.Steps[0].Status != TraceSuccess {
		t.Errorf("Status = %q, want 'success'", updated.Steps[0].Status)
	}
}

func TestQuickTraceStepWithFailure(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("s1", "Quick Fail", nil)

	err := tracer.QuickTraceStep(trace.ID, "Failing", "test", func() (map[string]interface{}, error) {
		return nil, fmt.Errorf("boom")
	})
	if err != nil {
		t.Fatalf("QuickTraceStep error: %v", err)
	}

	updated, _ := tracer.GetTrace(trace.ID)
	if updated.Steps[0].Status != TraceFailed {
		t.Errorf("Status = %q, want 'failed'", updated.Steps[0].Status)
	}
}

func TestGetTraceNotFound(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	_, err := tracer.GetTrace("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent trace")
	}
}

func TestTraceStepToJSON(t *testing.T) {
	now := time.Now()
	step := TraceStep{
		ID:        "step-1",
		TraceID:   "trace-1",
		Name:      "Test",
		Type:      "llm_call",
		Status:    TraceSuccess,
		StartedAt: &now,
	}
	jsonStr := TraceStepToJSON(step)
	if jsonStr == "" {
		t.Error("Expected non-empty JSON")
	}
	if len(jsonStr) < 10 {
		t.Error("Expected valid JSON output")
	}
}

func TestTraceStatusConstants(t *testing.T) {
	if TracePending != "pending" {
		t.Error("TracePending mismatch")
	}
	if TraceRunning != "running" {
		t.Error("TraceRunning mismatch")
	}
	if TraceSuccess != "success" {
		t.Error("TraceSuccess mismatch")
	}
	if TraceFailed != "failed" {
		t.Error("TraceFailed mismatch")
	}
	if TraceSkipped != "skipped" {
		t.Error("TraceSkipped mismatch")
	}
	if TraceCancelled != "cancelled" {
		t.Error("TraceCancelled mismatch")
	}
}

func TestGetWorkflowTracerSingleton(t *testing.T) {
	t1 := GetWorkflowTracer()
	t2 := GetWorkflowTracer()
	if t1 != t2 {
		t.Error("Expected same singleton")
	}
}

func TestMultiStepWorkflow(t *testing.T) {
	setupTraceTestDB(t)
	tracer := GetWorkflowTracer()
	trace := tracer.StartTrace("s1", "Full Pipeline", []string{"production"})

	// Step 1: Analyze
	step1, _ := tracer.AddStep(trace.ID, "Analyze Requirements", "llm_call", "", nil)
	tracer.CompleteStep(trace.ID, step1.ID, map[string]interface{}{"complexity": 7}, nil)

	// Step 2: Design
	step2, _ := tracer.AddStep(trace.ID, "Design Architecture", "llm_call", step1.ID, nil)
	tracer.CompleteStep(trace.ID, step2.ID, map[string]interface{}{"pattern": "microservices"}, nil)

	// Step 3: Implement
	step3, _ := tracer.AddStep(trace.ID, "Implement Code", "git_op", step2.ID, nil)
	tracer.CompleteStep(trace.ID, step3.ID, map[string]interface{}{"files": 12}, nil)

	// Step 4: Test
	step4, _ := tracer.AddStep(trace.ID, "Run Tests", "test", step3.ID, nil)
	tracer.CompleteStep(trace.ID, step4.ID, map[string]interface{}{"passed": 47, "failed": 0}, nil)

	// Finish
	tracer.FinishTrace(trace.ID, nil)

	final, _ := tracer.GetTrace(trace.ID)
	if final.Status != TraceSuccess {
		t.Errorf("Status = %q, want 'success'", final.Status)
	}
	if final.StepCount != 4 {
		t.Errorf("StepCount = %d, want 4", final.StepCount)
	}

	// Verify chain: step1 -> step2 -> step3 -> step4
	if len(final.Steps[0].ChildrenIDs) != 1 {
		t.Error("Expected step1 to have 1 child")
	}
}
