package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupSchedulerTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestSchedulerGet(t *testing.T) {
	s := GetScheduler()
	if s == nil {
		t.Fatal("Expected non-nil scheduler")
	}
	// Singleton should return same instance
	s2 := GetScheduler()
	if s != s2 {
		t.Error("Expected singleton scheduler")
	}
}

func TestSchedulerScheduleTask(t *testing.T) {
	setupSchedulerTestDB(t)
	s := GetScheduler()

	s.ScheduleTask("test_task", 5*time.Minute)

	tasks := s.GetTasks()
	found := false
	for _, task := range tasks {
		if task.Name == "test_task" {
			found = true
			if task.Interval != (5 * time.Minute).Milliseconds() {
				t.Errorf("Expected interval %d, got %d", (5*time.Minute).Milliseconds(), task.Interval)
			}
		}
	}
	if !found {
		t.Error("Expected test_task in scheduled tasks")
	}
}

func TestSchedulerTriggerNonExistent(t *testing.T) {
	s := GetScheduler()
	err := s.Trigger("nonexistent_task")
	if err == nil {
		t.Error("Expected error triggering nonexistent task")
	}
}

func TestSchedulerGetTasksEmpty(t *testing.T) {
	// Create fresh scheduler by testing the task map directly
	s := &Scheduler{
		tasks:    make(map[string]*TaskInfo),
		triggers: make(map[string]chan struct{}),
		stopChan: make(chan struct{}),
	}
	tasks := s.GetTasks()
	if len(tasks) != 0 {
		t.Errorf("Expected 0 tasks, got %d", len(tasks))
	}
}

func TestSchedulerScheduleMultipleTasks(t *testing.T) {
	s := &Scheduler{
		tasks:    make(map[string]*TaskInfo),
		triggers: make(map[string]chan struct{}),
		stopChan: make(chan struct{}),
	}

	s.ScheduleTask("task_a", 1*time.Hour)
	s.ScheduleTask("task_b", 2*time.Hour)
	s.ScheduleTask("task_c", 30*time.Minute)

	tasks := s.GetTasks()
	if len(tasks) != 3 {
		t.Errorf("Expected 3 tasks, got %d", len(tasks))
	}
}

func TestSchedulerTaskInfoFields(t *testing.T) {
	s := &Scheduler{
		tasks:    make(map[string]*TaskInfo),
		triggers: make(map[string]chan struct{}),
		stopChan: make(chan struct{}),
	}

	s.ScheduleTask("field_test", 10*time.Second)

	s.mu.Lock()
	info, ok := s.tasks["field_test"]
	s.mu.Unlock()

	if !ok {
		t.Fatal("Expected task to exist")
	}
	if info.Name != "field_test" {
		t.Errorf("Expected name 'field_test', got '%s'", info.Name)
	}
	if info.Interval != (10 * time.Second).Milliseconds() {
		t.Errorf("Expected interval %d, got %d", (10*time.Second).Milliseconds(), info.Interval)
	}
}

func TestSchedulerCleanupLogsTask(t *testing.T) {
	setupSchedulerTestDB(t)

	// Create an old keeper log
	oldLog := models.KeeperLog{
		ID:        "old-log-1",
		SessionID: "global",
		Type:      "info",
		Message:   "Old log entry",
		CreatedAt: time.Now().Add(-60 * 24 * time.Hour), // 60 days ago
	}
	if err := db.DB.Create(&oldLog).Error; err != nil {
		t.Fatalf("Failed to create old log: %v", err)
	}

	// Create a recent log
	recentLog := models.KeeperLog{
		ID:        "recent-log-1",
		SessionID: "global",
		Type:      "info",
		Message:   "Recent log entry",
		CreatedAt: time.Now(),
	}
	if err := db.DB.Create(&recentLog).Error; err != nil {
		t.Fatalf("Failed to create recent log: %v", err)
	}

	s := &Scheduler{
		tasks:    make(map[string]*TaskInfo),
		triggers: make(map[string]chan struct{}),
		stopChan: make(chan struct{}),
	}

	// Manually execute the cleanup task
	s.executeTask("cleanup_logs")

	// Old log should be deleted
	var oldCount int64
	db.DB.Model(&models.KeeperLog{}).Where("id = ?", "old-log-1").Count(&oldCount)
	if oldCount != 0 {
		t.Error("Expected old log to be deleted")
	}

	// Recent log should remain
	var recentCount int64
	db.DB.Model(&models.KeeperLog{}).Where("id = ?", "recent-log-1").Count(&recentCount)
	if recentCount != 1 {
		t.Error("Expected recent log to remain")
	}
}
