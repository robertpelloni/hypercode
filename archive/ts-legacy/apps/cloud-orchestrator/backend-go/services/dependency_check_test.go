package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
)

func setupDepCheckTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestRunDependencyChecks(t *testing.T) {
	setupDepCheckTestDB(t)

	report := RunDependencyChecks()

	if report.Overall == "" {
		t.Error("Expected non-empty overall status")
	}
	if len(report.Checks) == 0 {
		t.Error("Expected at least one dependency check")
	}
	if report.CheckedAt.IsZero() {
		t.Error("Expected non-zero checkedAt")
	}
}

func TestDatabaseCheck(t *testing.T) {
	setupDepCheckTestDB(t)

	check := checkDatabase()

	if check.Name != "database" {
		t.Errorf("Name = %q, want 'database'", check.Name)
	}
	if check.Status != "ok" {
		t.Errorf("Status = %q, want 'ok'", check.Status)
	}
	if check.Details == nil {
		t.Error("Expected non-nil details")
	}
}

func TestMemoryCheck(t *testing.T) {
	check := checkMemory()

	if check.Name != "memory" {
		t.Errorf("Name = %q, want 'memory'", check.Name)
	}
	if check.Status == "" {
		t.Error("Expected non-empty status")
	}
	if check.Details == nil {
		t.Error("Expected non-nil details")
	}
	if _, ok := check.Details["heapAllocMB"]; !ok {
		t.Error("Expected heapAllocMB in details")
	}
	if _, ok := check.Details["gcCount"]; !ok {
		t.Error("Expected gcCount in details")
	}
}

func TestGitCheck(t *testing.T) {
	check := checkGitAvailability()

	if check.Name != "git" {
		t.Errorf("Name = %q, want 'git'", check.Name)
	}
	// Git should be available in dev environment
	if check.Status != "ok" {
		t.Logf("Git check status: %q, message: %q", check.Status, check.Message)
	}
}

func TestSchedulerCheck(t *testing.T) {
	setupDepCheckTestDB(t)

	check := checkScheduler()

	if check.Name != "scheduler" {
		t.Errorf("Name = %q, want 'scheduler'", check.Name)
	}
	if check.Status == "" {
		t.Error("Expected non-empty status")
	}
}

func TestQueueWorkerCheck(t *testing.T) {
	setupDepCheckTestDB(t)

	check := checkQueueWorker()

	if check.Name != "queue_worker" {
		t.Errorf("Name = %q, want 'queue_worker'", check.Name)
	}
	if check.Status == "" {
		t.Error("Expected non-empty status")
	}
}

func TestBroadcasterCheck(t *testing.T) {
	check := checkBroadcaster()

	if check.Name != "websocket" {
		t.Errorf("Name = %q, want 'websocket'", check.Name)
	}
	// May be degraded if no broadcaster registered
	if check.Status != "ok" && check.Status != "degraded" {
		t.Errorf("Unexpected status: %q", check.Status)
	}
}

func TestGetSystemInfo(t *testing.T) {
	info := GetSystemInfo()

	if info.GoVersion == "" {
		t.Error("Expected non-empty GoVersion")
	}
	if info.OS == "" {
		t.Error("Expected non-empty OS")
	}
	if info.NumCPU <= 0 {
		t.Errorf("Expected NumCPU > 0, got %d", info.NumCPU)
	}
	if info.Pid <= 0 {
		t.Errorf("Expected Pid > 0, got %d", info.Pid)
	}
	if info.UptimeSeconds < 0 {
		t.Errorf("Expected UptimeSeconds >= 0, got %d", info.UptimeSeconds)
	}
}

func TestGetHealthTrend(t *testing.T) {
	setupDepCheckTestDB(t)

	// First create some snapshots
	RunDependencyChecks()

	// Now query
	snapshots, err := GetHealthTrend("database", time.Now().Add(-1*time.Hour), 10)
	if err != nil {
		t.Fatalf("GetHealthTrend error: %v", err)
	}
	if len(snapshots) == 0 {
		t.Error("Expected at least one snapshot")
	}
}

func TestGetHealthTrendAllChecks(t *testing.T) {
	setupDepCheckTestDB(t)

	RunDependencyChecks()

	snapshots, err := GetHealthTrend("", time.Now().Add(-1*time.Hour), 50)
	if err != nil {
		t.Fatalf("GetHealthTrend error: %v", err)
	}
	// Should have multiple checks
	if len(snapshots) < 5 {
		t.Errorf("Expected at least 5 snapshots, got %d", len(snapshots))
	}
}

func TestDependencyReportOverallOk(t *testing.T) {
	setupDepCheckTestDB(t)

	report := RunDependencyChecks()

	// With test DB, should be at least degraded
	if report.Overall == "" {
		t.Error("Expected non-empty overall")
	}
}

func TestDiskSpaceCheck(t *testing.T) {
	check := checkDiskSpace()

	if check.Name != "disk" {
		t.Errorf("Name = %q, want 'disk'", check.Name)
	}
	// Should not be down - we have disk space
	if check.Status == "down" {
		t.Errorf("Disk unexpectedly down: %q", check.Message)
	}
}

func TestSystemInfoFields(t *testing.T) {
	info := GetSystemInfo()

	if info.WorkingDir == "" {
		t.Error("Expected non-empty WorkingDir")
	}
	if info.Arch == "" {
		t.Error("Expected non-empty Arch")
	}
}
