package config

import (
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	Host          string
	Port          int
	ConfigDir     string
	MainConfigDir string
	WorkspaceRoot string
}

func Default() Config {
	return Config{
		Host:          "127.0.0.1",
		Port:          4300,
		ConfigDir:     DefaultConfigDir(),
		MainConfigDir: DefaultMainConfigDir(),
		WorkspaceRoot: DefaultWorkspaceRoot(),
	}
}

func DefaultConfigDir() string {
	if configured := os.Getenv("BORG_GO_CONFIG_DIR"); configured != "" {
		return configured
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ".borg-go"
	}

	return filepath.Join(homeDir, ".borg-go")
}

func DefaultMainConfigDir() string {
	if configured := os.Getenv("BORG_MAIN_CONFIG_DIR"); configured != "" {
		return configured
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ".borg"
	}

	return filepath.Join(homeDir, ".borg")
}

func DefaultWorkspaceRoot() string {
	if configured := os.Getenv("BORG_WORKSPACE_ROOT"); configured != "" {
		return configured
	}

	workingDir, err := os.Getwd()
	if err != nil {
		return "."
	}

	return workingDir
}

func (c Config) BaseURL() string {
	return fmt.Sprintf("http://%s:%d", browserHost(c.Host), c.Port)
}

func (c Config) LockPath() string {
	return filepath.Join(c.ConfigDir, "lock")
}

func (c Config) MainLockPath() string {
	return filepath.Join(c.MainConfigDir, "lock")
}

func (c Config) ImportedInstructionsPath() string {
	return filepath.Join(c.WorkspaceRoot, ".borg", "imported_sessions", "docs", "auto-imported-agent-instructions.md")
}

func browserHost(host string) string {
	switch host {
	case "", "0.0.0.0", "::", "[::]":
		return "127.0.0.1"
	default:
		return host
	}
}
