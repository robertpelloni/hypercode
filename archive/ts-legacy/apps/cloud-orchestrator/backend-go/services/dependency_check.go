package services

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// DependencyCheck represents a single health check result
type DependencyCheck struct {
	Name      string                 `json:"name"`
	Status    string                 `json:"status"` // ok, degraded, down, unknown
	Latency   int64                  `json:"latencyMs"`
	Message   string                 `json:"message,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
	CheckedAt time.Time              `json:"checkedAt"`
}

// DependencyReport is a full snapshot of all dependency checks
type DependencyReport struct {
	Checks     []DependencyCheck `json:"checks"`
	Overall    string            `json:"overall"`
	CheckedAt  time.Time         `json:"checkedAt"`
	SystemInfo SystemInfo        `json:"systemInfo"`
}

// SystemInfo holds runtime system information
type SystemInfo struct {
	GoVersion     string `json:"goVersion"`
	OS            string `json:"os"`
	Arch          string `json:"arch"`
	NumCPU        int    `json:"numCPU"`
	NumGoroutine  int    `json:"numGoroutine"`
	HeapAllocMB   uint64 `json:"heapAllocMB"`
	HeapSysMB     uint64 `json:"heapSysMB"`
	StackInUseMB  uint64 `json:"stackInUseMB"`
	UptimeSeconds int64  `json:"uptimeSeconds"`
	Pid           int    `json:"pid"`
	WorkingDir    string `json:"workingDir"`
}

var startTime = time.Now()

// RunDependencyChecks performs all dependency health checks
func RunDependencyChecks() DependencyReport {
	checks := []DependencyCheck{}

	// 1. Database check
	checks = append(checks, checkDatabase())

	// 2. Disk space check
	checks = append(checks, checkDiskSpace())

	// 3. Memory pressure check
	checks = append(checks, checkMemory())

	// 4. Git availability check
	checks = append(checks, checkGitAvailability())

	// 5. Queue worker check
	checks = append(checks, checkQueueWorker())

	// 6. Scheduler check
	checks = append(checks, checkScheduler())

	// 7. WebSocket broadcaster check
	checks = append(checks, checkBroadcaster())

	// Determine overall status
	overall := "ok"
	for _, c := range checks {
		if c.Status == "down" {
			overall = "down"
			break
		}
		if c.Status == "degraded" {
			overall = "degraded"
		}
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	wd, _ := os.Getwd()

	report := DependencyReport{
		Checks:    checks,
		Overall:   overall,
		CheckedAt: time.Now(),
		SystemInfo: SystemInfo{
			GoVersion:     runtime.Version(),
			OS:            runtime.GOOS,
			Arch:          runtime.GOARCH,
			NumCPU:        runtime.NumCPU(),
			NumGoroutine:  runtime.NumGoroutine(),
			HeapAllocMB:   m.HeapAlloc / 1024 / 1024,
			HeapSysMB:     m.HeapSys / 1024 / 1024,
			StackInUseMB:  m.StackInuse / 1024 / 1024,
			UptimeSeconds: int64(time.Since(startTime).Seconds()),
			Pid:           os.Getpid(),
			WorkingDir:    wd,
		},
	}

	// Store in health snapshot
	storeDependencySnapshot(report)

	return report
}

func checkDatabase() DependencyCheck {
	start := time.Now()
	check := DependencyCheck{
		Name:      "database",
		CheckedAt: time.Now(),
	}

	if db.DB == nil {
		check.Status = "down"
		check.Message = "Database connection is nil"
		return check
	}

	// Test query
	sqlDB, err := db.DB.DB()
	if err != nil {
		check.Status = "down"
		check.Message = fmt.Sprintf("Failed to get underlying DB: %v", err)
		return check
	}

	if err := sqlDB.Ping(); err != nil {
		check.Status = "down"
		check.Message = fmt.Sprintf("Database ping failed: %v", err)
		return check
	}

	// Get database stats
	stats := sqlDB.Stats()
	check.Latency = time.Since(start).Milliseconds()
	check.Status = "ok"
	check.Message = "Connected"
	check.Details = map[string]interface{}{
		"maxOpenConnections": stats.MaxOpenConnections,
		"openConnections":    stats.OpenConnections,
		"inUse":              stats.InUse,
		"idle":               stats.Idle,
		"waitCount":          stats.WaitCount,
		"waitDuration":       stats.WaitDuration.Milliseconds(),
	}

	return check
}

func checkDiskSpace() DependencyCheck {
	check := DependencyCheck{
		Name:      "disk",
		CheckedAt: time.Now(),
	}

	wd, err := os.Getwd()
	if err != nil {
		check.Status = "unknown"
		check.Message = "Cannot determine working directory"
		return check
	}

	// Get disk usage via `df` on Unix or `dir` on Windows
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("fsutil", "volume", "diskfree", wd[:2])
	} else {
		cmd = exec.Command("df", "-h", wd)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		check.Status = "unknown"
		check.Message = "Cannot check disk space"
		check.Details = map[string]interface{}{
			"error": err.Error(),
		}
		return check
	}

	check.Status = "ok"
	check.Message = "Disk accessible"
	check.Details = map[string]interface{}{
		"path":         wd,
		"checkOutput":  string(output),
	}
	check.Latency = 0

	return check
}

func checkMemory() DependencyCheck {
	start := time.Now()
	check := DependencyCheck{
		Name:      "memory",
		CheckedAt: time.Now(),
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	heapAllocMB := m.HeapAlloc / 1024 / 1024
	sysMB := m.Sys / 1024 / 1024
	gcCount := m.NumGC

	check.Latency = time.Since(start).Milliseconds()
	check.Details = map[string]interface{}{
		"heapAllocMB":    heapAllocMB,
		"totalAllocMB":   m.TotalAlloc / 1024 / 1024,
		"sysMB":          sysMB,
		"heapObjects":    m.HeapObjects,
		"gcCount":        gcCount,
		"gcPauseTotalMs": m.PauseTotalNs / 1000000,
		"stackInUseMB":   m.StackInuse / 1024 / 1024,
	}

	// If heap is > 512MB, mark as degraded
	if heapAllocMB > 512 {
		check.Status = "degraded"
		check.Message = fmt.Sprintf("High memory usage: %dMB heap", heapAllocMB)
	} else if heapAllocMB > 1024 {
		check.Status = "down"
		check.Message = fmt.Sprintf("Critical memory usage: %dMB heap", heapAllocMB)
	} else {
		check.Status = "ok"
		check.Message = fmt.Sprintf("Normal: %dMB heap, %dMB sys", heapAllocMB, sysMB)
	}

	return check
}

func checkGitAvailability() DependencyCheck {
	start := time.Now()
	check := DependencyCheck{
		Name:      "git",
		CheckedAt: time.Now(),
	}

	cmd := exec.Command("git", "--version")
	output, err := cmd.CombinedOutput()
	check.Latency = time.Since(start).Milliseconds()

	if err != nil {
		check.Status = "down"
		check.Message = "Git not available"
		return check
	}

	check.Status = "ok"
	check.Message = strings.TrimSpace(string(output))

	return check
}

func checkQueueWorker() DependencyCheck {
	check := DependencyCheck{
		Name:      "queue_worker",
		CheckedAt: time.Now(),
	}

	if db.DB == nil {
		check.Status = "unknown"
		check.Message = "Database not available"
		return check
	}

	var pending int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pending)

	var processing int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processing)

	var failed int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "failed").Count(&failed)

	check.Details = map[string]interface{}{
		"pending":    pending,
		"processing": processing,
		"failed":     failed,
	}

	if failed > 10 {
		check.Status = "degraded"
		check.Message = fmt.Sprintf("%d failed jobs in queue", failed)
	} else if pending > 100 {
		check.Status = "degraded"
		check.Message = fmt.Sprintf("Queue backlog: %d pending", pending)
	} else {
		check.Status = "ok"
		check.Message = fmt.Sprintf("Pending: %d, Processing: %d, Failed: %d", pending, processing, failed)
	}

	return check
}

func checkScheduler() DependencyCheck {
	check := DependencyCheck{
		Name:      "scheduler",
		CheckedAt: time.Now(),
	}

	s := GetScheduler()
	tasks := s.GetTasks()

	check.Details = map[string]interface{}{
		"taskCount": len(tasks),
		"tasks":     tasks,
	}

	if len(tasks) == 0 {
		check.Status = "degraded"
		check.Message = "No scheduled tasks registered"
	} else {
		check.Status = "ok"
		check.Message = fmt.Sprintf("%d tasks scheduled", len(tasks))
	}

	return check
}

func checkBroadcaster() DependencyCheck {
	check := DependencyCheck{
		Name:      "websocket",
		CheckedAt: time.Now(),
	}

	if broadcastHook == nil {
		check.Status = "degraded"
		check.Message = "No WebSocket broadcaster registered"
	} else {
		check.Status = "ok"
		check.Message = "Broadcaster active"
	}

	return check
}

func storeDependencySnapshot(report DependencyReport) {
	if db.DB == nil {
		return
	}

	// Store each check as a health snapshot
	for _, check := range report.Checks {
		snapshot := models.HealthSnapshot{
			ID:        uuid.New().String(),
			Status:    report.Overall,
			CheckName: check.Name,
			Message:   check.Message,
			Latency:   check.Latency,
			CreatedAt: time.Now(),
		}
		db.DB.Create(&snapshot)
	}
}

// GetHealthTrend returns recent health snapshots for trend analysis
func GetHealthTrend(checkName string, since time.Time, limit int) ([]models.HealthSnapshot, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	var snapshots []models.HealthSnapshot
	query := db.DB.Where("created_at >= ?", since).Order("created_at DESC")
	if checkName != "" {
		query = query.Where("check_name = ?", checkName)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&snapshots).Error; err != nil {
		return nil, err
	}
	return snapshots, nil
}

// GetSystemInfo returns current system runtime information
func GetSystemInfo() SystemInfo {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	wd, _ := os.Getwd()

	return SystemInfo{
		GoVersion:     runtime.Version(),
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		NumCPU:        runtime.NumCPU(),
		NumGoroutine:  runtime.NumGoroutine(),
		HeapAllocMB:   m.HeapAlloc / 1024 / 1024,
		HeapSysMB:     m.HeapSys / 1024 / 1024,
		StackInUseMB:  m.StackInuse / 1024 / 1024,
		UptimeSeconds: int64(time.Since(startTime).Seconds()),
		Pid:           os.Getpid(),
		WorkingDir:    wd,
	}
}
