package adapters

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBorgAdapterBuildsStatusWithoutPanicking(t *testing.T) {
	dir := t.TempDir()
	borgDir := filepath.Join(dir, "..", "borg")
	if err := os.MkdirAll(borgDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(borgDir, "README.md"), []byte("# Borg"), 0o644); err != nil {
		t.Fatal(err)
	}
	adapter := NewBorgAdapter(dir)
	status := adapter.Status()
	if !status.Assimilated {
		t.Fatal("expected assimilated borg adapter")
	}
	if status.MemoryContext == "" {
		t.Fatal("expected memory context")
	}
	if status.Provider.CurrentProvider == "" {
		t.Fatal("expected provider status")
	}
	if status.BorgRepoPath == "" {
		t.Fatal("expected discovered borg repo path")
	}
	if adapter.RouteMCP("list tools") == "" {
		t.Fatal("expected routed MCP string")
	}
	if adapter.BuildSystemContext() == "" {
		t.Fatal("expected system context")
	}
}
