package services

import (
	"log"
	"strings"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// Daemon represents the background monitoring loop
type Daemon struct {
	isRunning bool
	stopChan  chan struct{}
	mu        sync.Mutex
}

var (
	globalDaemon *Daemon
	daemonOnce   sync.Once
)

func GetDaemon() *Daemon {
	daemonOnce.Do(func() {
		globalDaemon = &Daemon{
			stopChan: make(chan struct{}),
		}
	})
	return globalDaemon
}

func (d *Daemon) Run() {
	d.mu.Lock()
	if d.isRunning {
		d.mu.Unlock()
		return
	}
	d.isRunning = true
	d.mu.Unlock()

	log.Println("[Daemon] Starting background monitoring loop...")

	for {
		interval := d.tick()
		if interval <= 0 {
			interval = 30 * time.Second
		}

		timer := time.NewTimer(interval)
		select {
		case <-timer.C:
		case <-d.stopChan:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			d.mu.Lock()
			d.isRunning = false
			d.mu.Unlock()
			log.Println("[Daemon] Stopped.")
			return
		}
	}
}

func (d *Daemon) tick() time.Duration {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return 30 * time.Second
	}

	interval := time.Duration(settings.CheckIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = 30 * time.Second
	}

	if !settings.IsEnabled {
		return interval
	}

	client := NewJulesClient()
	if client.apiKey == "" {
		addKeeperLog("Daemon enabled but no Jules API key found.", "error", "global", map[string]interface{}{
			"event": "daemon_missing_jules_api_key",
		})
		return interval
	}

	sessions, err := client.ListSessions()
	if err != nil {
		log.Printf("[Daemon] Failed to fetch live sessions: %v", err)
		addKeeperLog("Failed to fetch live Jules sessions in Go daemon.", "error", "global", map[string]interface{}{
			"event": "daemon_session_poll_failed",
			"error": err.Error(),
		})
		return interval
	}

	queuedSessions := 0
	for _, session := range sessions {
		payload := map[string]interface{}{
			"session": session,
		}
		// Staggered delay to avoid 429 errors from Google API
		// Increased from 2s to 5s per session to be more conservative
		delay := time.Duration(queuedSessions*5) * time.Second
		runAt := time.Now().Add(delay)

		if _, err := AddJob("check_session", payload, runAt); err != nil {
			log.Printf("[Daemon] Failed to enqueue check_session for %s: %v", session.ID, err)
			continue
		}
		queuedSessions++
	}

	queuedIssueChecks := 0
	if settings.SmartPilotEnabled {
		sources, err := client.ListSources("")
		if err != nil {
			log.Printf("[Daemon] Failed to fetch sources for issue checks: %v", err)
			addKeeperLog("Failed to fetch sources for issue checks in Go daemon.", "error", "global", map[string]interface{}{
				"event": "daemon_source_poll_failed",
				"error": err.Error(),
			})
		} else {
			for _, source := range sources {
				if strings.TrimSpace(source.ID) == "" {
					continue
				}
				payload := map[string]interface{}{"sourceId": source.ID}
				if _, err := AddJob("check_issues", payload); err != nil {
					log.Printf("[Daemon] Failed to enqueue check_issues for %s: %v", source.ID, err)
					continue
				}
				queuedIssueChecks++
			}
		}
	}

	var existingIndexJob models.QueueJob
	indexJobPending := db.DB.Where("type = ? AND status IN ?", "index_codebase", []string{"pending", "processing"}).First(&existingIndexJob).Error == nil
	queuedIndexing := false
	if !indexJobPending {
		if _, err := AddJob("index_codebase", map[string]string{}); err != nil {
			log.Printf("[Daemon] Failed to enqueue index_codebase: %v", err)
		} else {
			queuedIndexing = true
		}
	}

	if queuedSessions > 0 || queuedIssueChecks > 0 || queuedIndexing {
		addKeeperLog("Go daemon scheduled monitoring work.", "info", "global", map[string]interface{}{
			"event":             "daemon_tick_enqueued",
			"queuedSessions":    queuedSessions,
			"queuedIssueChecks": queuedIssueChecks,
			"queuedIndexing":    queuedIndexing,
		})
	}

	return interval
}

func (d *Daemon) IsRunning() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.isRunning
}

// StartDaemon starts the global daemon in a goroutine
func StartDaemon() {
	d := GetDaemon()
	go d.Run()
}

// StopDaemon signals the global daemon to stop
func StopDaemon() {
	d := GetDaemon()
	d.mu.Lock()
	if !d.isRunning {
		d.mu.Unlock()
		return
	}
	d.mu.Unlock()
	d.stopChan <- struct{}{}
}
