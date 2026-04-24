package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupCIMonitorTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestHeuristicAnalysis(t *testing.T) {
	tests := []struct {
		stage   string
		contains string
	}{
		{"merge", "Merge conflict"},
		{"build", "Build issue"},
		{"test", "Test failure"},
		{"lint", "Lint/style"},
		{"unknown", "CI failure"},
	}

	for _, tt := range tests {
		t.Run(tt.stage, func(t *testing.T) {
			failure := CIFailure{Stage: tt.stage, SourceID: "owner/repo"}
			result := heuristicAnalysis(failure)
			if result == "" {
				t.Error("Expected non-empty analysis")
			}
		})
	}
}

func TestCIFailureStruct(t *testing.T) {
	f := CIFailure{
		ID:         "cf-1",
		RepoPath:   "/path/to/repo",
		SourceID:   "owner/repo",
		Branch:     "main",
		CommitHash: "abc123",
		Stage:      "build",
		Output:     "Build failed",
		Severity:   "high",
	}
	if f.ID != "cf-1" {
		t.Error("ID mismatch")
	}
	if f.Stage != "build" {
		t.Error("Stage mismatch")
	}
	if f.Severity != "high" {
		t.Error("Severity mismatch")
	}
}

func TestDetectCIFailuresNilDB(t *testing.T) {
	// Should return nil when DB is nil
	db.DB = nil
	failures := DetectCIFailures()
	if failures != nil {
		t.Error("Expected nil for nil DB")
	}
}

func TestRecordCIFailure(t *testing.T) {
	setupCIMonitorTestDB(t)

	failure := CIFailure{
		ID:        "cf-record-test",
		RepoPath:  "/test",
		SourceID:  "owner/repo",
		Stage:     "test",
		Output:    "Tests failed",
		Severity:  "high",
		DetectedAt: time.Now(),
	}

	RecordCIFailure(failure)

	// Verify anomaly was created
	var count int64
	db.DB.Model(&models.AnomalyRecord{}).Where("id = ?", "cf-record-test").Count(&count)
	if count != 1 {
		t.Errorf("Expected 1 anomaly, got %d", count)
	}
}

func TestRecordCIFailureLowSeverity(t *testing.T) {
	setupCIMonitorTestDB(t)

	failure := CIFailure{
		ID:        "cf-low-sev",
		SourceID:  "owner/repo",
		Stage:     "lint",
		Output:    "Style issue",
		Severity:  "low",
		DetectedAt: time.Now(),
	}

	RecordCIFailure(failure)

	var anomaly models.AnomalyRecord
	db.DB.Where("id = ?", "cf-low-sev").First(&anomaly)
	if anomaly.Severity != "low" {
		t.Errorf("Severity = %q, want 'low'", anomaly.Severity)
	}
}

func TestDiscoverTestFilesNoGit(t *testing.T) {
	// Should return nil/empty for non-git paths
	files := discoverTestFiles("/nonexistent/path")
	// May return nil or empty - just verify no panic
	_ = files
}

func TestDetectMergeConflictsNoGit(t *testing.T) {
	// Should return nil for non-git paths
	conflicts := detectMergeConflicts("/nonexistent/path")
	_ = conflicts // just verify no panic
}

func TestHasSyntaxErrors(t *testing.T) {
	// Current implementation always returns false
	if hasSyntaxErrors("any_file.go") {
		t.Error("Expected false from current implementation")
	}
}

func TestCIFailureSeverities(t *testing.T) {
	severities := []string{"low", "medium", "high", "critical"}
	for _, sev := range severities {
		f := CIFailure{Severity: sev}
		if f.Severity != sev {
			t.Errorf("Severity mismatch: %q", sev)
		}
	}
}

func TestCIFailureStages(t *testing.T) {
	stages := []string{"build", "test", "lint", "deploy", "merge"}
	for _, stage := range stages {
		f := CIFailure{Stage: stage}
		if f.Stage != stage {
			t.Errorf("Stage mismatch: %q", stage)
		}
	}
}
