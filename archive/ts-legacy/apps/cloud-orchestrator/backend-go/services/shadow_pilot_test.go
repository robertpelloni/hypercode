package services

import (
	"testing"

	"github.com/jules-autopilot/backend/db"
)

func setupShadowPilotTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestExtractStatNumber(t *testing.T) {
	tests := []struct {
		stat    string
		keyword string
		want    int
	}{
		{"3 files changed, 10 insertions(+), 5 deletions(-)", "insertion", 10},
		{"3 files changed, 10 insertions(+), 5 deletions(-)", "deletion", 5},
		{"1 file changed, 1 insertion(+)", "insertion", 1},
		{"1 file changed, 1 deletion(-)", "deletion", 1},
		{"2 files changed, 20 insertions(+), 15 deletions(-)", "insertion", 20},
		{"", "insertion", 0},
		{"0 files changed", "insertion", 0},
	}

	for _, tt := range tests {
		got := extractStatNumber(tt.stat, tt.keyword)
		if got != tt.want {
			t.Errorf("extractStatNumber(%q, %q) = %d, want %d", tt.stat, tt.keyword, got, tt.want)
		}
	}
}

func TestIsShadowPilotRunning(t *testing.T) {
	setupShadowPilotTestDB(t)

	// Initially not running
	if IsShadowPilotRunning() {
		t.Error("Expected shadow pilot to not be running initially")
	}
}

func TestGetShadowPilotStatus(t *testing.T) {
	setupShadowPilotTestDB(t)

	status := GetShadowPilotStatus()
	if status == nil {
		t.Fatal("Expected status to not be nil")
	}
	if status["running"] != false {
		t.Error("Expected running to be false initially")
	}
}

func TestStartStopShadowPilot(t *testing.T) {
	setupShadowPilotTestDB(t)

	StartShadowPilot()
	if !IsShadowPilotRunning() {
		t.Error("Expected shadow pilot to be running after start")
	}

	StopShadowPilot()
	if IsShadowPilotRunning() {
		t.Error("Expected shadow pilot to not be running after stop")
	}
}

func TestStartShadowPilotIdempotent(t *testing.T) {
	setupShadowPilotTestDB(t)

	StartShadowPilot()
	StartShadowPilot() // Second start should be no-op

	if !IsShadowPilotRunning() {
		t.Error("Expected shadow pilot to be running")
	}

	StopShadowPilot()
}
