package services

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type TaskInfo struct {
	Name     string     `json:"name"`
	Interval int64      `json:"intervalMs"` // milliseconds for frontend mapping
	NextRun  time.Time  `json:"nextRun"`
	LastRun  *time.Time `json:"lastRun,omitempty"`
}

type Scheduler struct {
	tasks    map[string]*TaskInfo
	triggers map[string]chan struct{}
	stopChan chan struct{}
	mu       sync.Mutex
	wg       sync.WaitGroup
}

var (
	globalScheduler *Scheduler
	schedulerOnce   sync.Once
)

func GetScheduler() *Scheduler {
	schedulerOnce.Do(func() {
		globalScheduler = &Scheduler{
			tasks:    make(map[string]*TaskInfo),
			triggers: make(map[string]chan struct{}),
			stopChan: make(chan struct{}),
		}
	})
	return globalScheduler
}

func (s *Scheduler) Start() {
	log.Println("[Scheduler] Starting scheduled task engine...")

	s.ScheduleTask("index_codebase", 24*time.Hour)
	s.ScheduleTask("check_issues", 1*time.Hour)
	s.ScheduleTask("cleanup_logs", 7*24*time.Hour)
	s.ScheduleTask("ci_monitor", 30*time.Minute)

	s.mu.Lock()
	for name := range s.tasks {
		s.wg.Add(1)
		go s.runTaskLoop(name)
	}
	s.mu.Unlock()
}

func (s *Scheduler) Stop() {
	log.Println("[Scheduler] Stopping scheduled task engine...")
	close(s.stopChan)
	s.wg.Wait()
	log.Println("[Scheduler] Stopped.")
}

func (s *Scheduler) ScheduleTask(name string, interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tasks[name] = &TaskInfo{
		Name:     name,
		Interval: interval.Milliseconds(),
	}
	s.triggers[name] = make(chan struct{}, 1)
}

func (s *Scheduler) GetTasks() []TaskInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	var result []TaskInfo
	for _, info := range s.tasks {
		result = append(result, *info)
	}
	return result
}

func (s *Scheduler) Trigger(name string) error {
	s.mu.Lock()
	ch, exists := s.triggers[name]
	s.mu.Unlock()

	if !exists {
		return fmt.Errorf("task %s not found", name)
	}

	select {
	case ch <- struct{}{}:
	default:
		// already triggered
	}
	return nil
}

func (s *Scheduler) runTaskLoop(name string) {
	defer s.wg.Done()

	s.mu.Lock()
	info := s.tasks[name]
	triggerCh := s.triggers[name]
	interval := time.Duration(info.Interval) * time.Millisecond
	s.mu.Unlock()

	// Initial delay to avoid hammering at boot
	delay := 1 * time.Minute
	timer := time.NewTimer(delay)

	s.mu.Lock()
	info.NextRun = time.Now().Add(delay)
	s.mu.Unlock()

	for {
		select {
		case <-timer.C:
			s.executeAndUpdate(name, info, interval)
			timer.Reset(interval)
		case <-triggerCh:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			s.executeAndUpdate(name, info, interval)
			timer.Reset(interval)
		case <-s.stopChan:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			return
		}
	}
}

func (s *Scheduler) executeAndUpdate(name string, info *TaskInfo, interval time.Duration) {
	now := time.Now()
	s.executeTask(name)
	s.mu.Lock()
	info.LastRun = &now
	info.NextRun = time.Now().Add(interval)
	s.mu.Unlock()
}

func (s *Scheduler) executeTask(name string) {
	log.Printf("[Scheduler] Executing scheduled task: %s", name)
	
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		log.Printf("[Scheduler] Failed to fetch settings for task %s: %v", name, err)
		return
	}

	switch name {
	case "index_codebase":
		if _, err := AddJob("index_codebase", map[string]string{}); err != nil {
			log.Printf("[Scheduler] Failed to enqueue index_codebase: %v", err)
		}
	case "check_issues":
		if settings.SmartPilotEnabled {
			client := NewJulesClient()
			sources, err := client.ListSources("")
			if err == nil {
				for _, source := range sources {
					_, _ = AddJob("check_issues", map[string]interface{}{"sourceId": source.ID})
				}
			}
		}
	case "cleanup_logs":
		// Simple retention policy: delete logs older than 30 days
		cutoff := time.Now().Add(-30 * 24 * time.Hour)
		result := db.DB.Where("created_at < ?", cutoff).Delete(&models.KeeperLog{})
		if result.Error == nil && result.RowsAffected > 0 {
			log.Printf("[Scheduler] Cleaned up %d old keeper logs", result.RowsAffected)
		}
		// Cleanup old dismissed notifications
		if count, err := CleanupOldNotifications(90); err == nil && count > 0 {
			log.Printf("[Scheduler] Cleaned up %d old notifications", count)
		}
	case "ci_monitor":
		RunCIMonitor()
	}
}

func StartScheduler() {
	s := GetScheduler()
	s.Start()
}

func StopScheduler() {
	s := GetScheduler()
	s.Stop()
}

// CreateCustomTask adds a new custom scheduled task
func CreateCustomTask(name string, intervalMs int64, jobType string, payload interface{}) error {
	s := GetScheduler()
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.tasks[name]; exists {
		return fmt.Errorf("task %s already exists", name)
	}

	// Store in DB for persistence
	task := models.ScheduledTask{
		ID:         fmt.Sprintf("task-%d", time.Now().UnixNano()),
		Name:       name,
		IntervalMs: intervalMs,
		JobType:    jobType,
		Payload:    payload,
		IsEnabled:  true,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if db.DB != nil {
		if err := db.DB.Create(&task).Error; err != nil {
			return fmt.Errorf("failed to persist task: %w", err)
		}
	}

	s.ScheduleTask(name, time.Duration(intervalMs)*time.Millisecond)
	s.wg.Add(1)
	go s.runCustomTaskLoop(name, intervalMs, jobType, payload)

	return nil
}

// DeleteCustomTask removes a scheduled task
func DeleteCustomTask(name string) error {
	s := GetScheduler()
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.tasks[name]; !exists {
		return fmt.Errorf("task %s not found", name)
	}

	delete(s.tasks, name)
	delete(s.triggers, name)

	if db.DB != nil {
		db.DB.Where("name = ?", name).Delete(&models.ScheduledTask{})
	}

	return nil
}

// GetCustomTasks returns all custom persisted tasks
func GetCustomTasks() []models.ScheduledTask {
	if db.DB == nil {
		return nil
	}
	var tasks []models.ScheduledTask
	db.DB.Find(&tasks)
	return tasks
}

func (s *Scheduler) runCustomTaskLoop(name string, intervalMs int64, jobType string, payload interface{}) {
	defer s.wg.Done()

	interval := time.Duration(intervalMs) * time.Millisecond
	if interval <= 0 {
		interval = 5 * time.Minute
	}

	timer := time.NewTimer(1 * time.Minute) // Initial delay

	for {
		select {
		case <-timer.C:
			if _, err := AddJob(jobType, payload); err != nil {
				log.Printf("[Scheduler] Custom task %s failed: %v", name, err)
			} else {
				log.Printf("[Scheduler] Custom task %s enqueued %s job", name, jobType)
			}
			timer.Reset(interval)
		case <-s.stopChan:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			return
		}
	}
}
