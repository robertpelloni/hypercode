package supervisor

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func waitForSessionState(t *testing.T, m *Manager, id string, timeout time.Duration, acceptable ...SessionState) SupervisedSession {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		for _, session := range m.ListSessions() {
			if session.ID != id {
				continue
			}
			for _, state := range acceptable {
				if session.State == state {
					return session
				}
			}
		}
		time.Sleep(25 * time.Millisecond)
	}

	sessions := m.ListSessions()
	t.Fatalf("session %s did not reach one of %v within %s; sessions=%#v", id, acceptable, timeout, sessions)
	return SupervisedSession{}
}

func TestCreateSessionRejectsDuplicates(t *testing.T) {
	manager := NewManager()
	if _, err := manager.CreateSession("dup", "go", []string{"version"}, nil, t.TempDir(), 0); err != nil {
		t.Fatalf("first CreateSession failed: %v", err)
	}
	if _, err := manager.CreateSession("dup", "go", []string{"version"}, nil, t.TempDir(), 0); err == nil {
		t.Fatal("expected duplicate session creation to fail")
	}
}

func TestStartSessionRunsShortLivedProcessToStopped(t *testing.T) {
	goBinary, err := exec.LookPath("go")
	if err != nil {
		t.Skip("go binary not available")
	}

	manager := NewManager()
	workspace := t.TempDir()
	if _, err := manager.CreateSession("go-version", goBinary, []string{"version"}, nil, workspace, 0); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}
	if err := manager.StartSession(context.Background(), "go-version"); err != nil {
		t.Fatalf("StartSession failed: %v", err)
	}

	session := waitForSessionState(t, manager, "go-version", 5*time.Second, StateStopped)
	if session.RestartCount != 0 {
		t.Fatalf("expected no restarts, got %#v", session)
	}
	if session.PID != 0 {
		t.Fatalf("expected PID reset after stop, got %#v", session)
	}
}

func TestStartSessionMissingReturnsError(t *testing.T) {
	manager := NewManager()
	if err := manager.StartSession(context.Background(), "missing"); err == nil {
		t.Fatal("expected StartSession on missing id to fail")
	}
}

func TestFailingProcessRestartsAndEventuallyFails(t *testing.T) {
	goBinary, err := exec.LookPath("go")
	if err != nil {
		t.Skip("go binary not available")
	}

	manager := NewManager()
	workspace := t.TempDir()
	if _, err := manager.CreateSession("go-fail", goBinary, []string{"tool", "definitely-not-a-real-go-tool"}, nil, workspace, 1); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}
	if err := manager.StartSession(context.Background(), "go-fail"); err != nil {
		t.Fatalf("StartSession failed: %v", err)
	}

	session := waitForSessionState(t, manager, "go-fail", 7*time.Second, StateFailed)
	if session.RestartCount != 1 {
		t.Fatalf("expected one restart before permanent failure, got %#v", session)
	}
}

func TestCreateSessionCapturesMetadata(t *testing.T) {
	manager := NewManager()
	workspace := t.TempDir()
	env := map[string]string{"HYPERCODE_TEST": "1"}
	session, err := manager.CreateSession("meta", "go", []string{"version"}, env, workspace, 3)
	if err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}
	if session.WorkingDirectory != workspace || session.MaxRestarts != 3 || session.Env["HYPERCODE_TEST"] != "1" {
		t.Fatalf("unexpected session metadata: %#v", session)
	}
	if session.State != StateStopped {
		t.Fatalf("expected initial stopped state, got %#v", session)
	}
}

func TestStartSessionWithCustomEnvCanRunProcess(t *testing.T) {
	goBinary, err := exec.LookPath("go")
	if err != nil {
		t.Skip("go binary not available")
	}

	manager := NewManager()
	workspace := t.TempDir()
	testFile := filepath.Join(workspace, "env-check.txt")
	if err := os.WriteFile(testFile, []byte("ok"), 0o644); err != nil {
		t.Fatalf("failed to seed file: %v", err)
	}
	if _, err := manager.CreateSession("env-run", goBinary, []string{"version"}, map[string]string{"HYPERCODE_TEST": "1"}, workspace, 0); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}
	if err := manager.StartSession(context.Background(), "env-run"); err != nil {
		t.Fatalf("StartSession failed: %v", err)
	}
	waitForSessionState(t, manager, "env-run", 5*time.Second, StateStopped)
}
