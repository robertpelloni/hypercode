package adapters

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/robertpelloni/hypercode/borg"
)

type HyperCodeStatus struct {
	Assimilated       bool           `json:"assimilated"`
	BorgCoreURL       string         `json:"borgCoreUrl,omitempty"`
	MemoryContext     string         `json:"memoryContext,omitempty"`
	Provider          ProviderStatus `json:"provider"`
	MCPServerNames    []string       `json:"mcpServerNames,omitempty"`
	MCPConfigPath     string         `json:"mcpConfigPath,omitempty"`
	HyperCodeRepoPath string         `json:"hypercodeRepoPath,omitempty"`
	Warnings          []string       `json:"warnings,omitempty"`
}

type HyperCodeAdapter struct {
	borgAdapter *borg.Adapter
	workingDir  string
	homeDir     string
}

func NewHyperCodeAdapter(workingDir string) *HyperCodeAdapter {
	homeDir, _ := os.UserHomeDir()
	return &HyperCodeAdapter{
		borgAdapter: borg.NewAdapter(),
		workingDir:  workingDir,
		homeDir:     homeDir,
	}
}

func (a *HyperCodeAdapter) Status() HyperCodeStatus {
	status := HyperCodeStatus{
		Assimilated:   a.borgAdapter != nil && a.borgAdapter.Assimilated,
		MemoryContext: a.MemoryContext(),
		Provider:      BuildProviderStatus(),
	}
	if a.borgAdapter != nil {
		status.BorgCoreURL = a.borgAdapter.BorgCoreURL
	}
	if repoPath, ok := a.findHyperCodeRepo(); ok {
		status.HyperCodeRepoPath = repoPath
	} else {
		status.Warnings = append(status.Warnings, "adjacent hypercode repo not found")
	}
	if configPath, names, err := a.listMCPServers(); err == nil {
		status.MCPConfigPath = configPath
		status.MCPServerNames = names
	} else {
		status.Warnings = append(status.Warnings, err.Error())
	}
	return status
}

func (a *HyperCodeAdapter) MemoryContext() string {
	if a.borgAdapter == nil {
		return ""
	}
	return a.borgAdapter.GetMemoryContext()
}

func (a *HyperCodeAdapter) RouteMCP(request string) string {
	if a.borgAdapter == nil {
		return request
	}
	return a.borgAdapter.RouteMCP(request)
}

func (a *HyperCodeAdapter) BuildSystemContext() string {
	status := a.Status()
	parts := []string{
		"[HyperCode Adapter]",
		fmt.Sprintf("Assimilated: %t", status.Assimilated),
	}
	if status.BorgCoreURL != "" {
		parts = append(parts, fmt.Sprintf("Borg Core URL: %s", status.BorgCoreURL))
	}
	if status.MemoryContext != "" {
		parts = append(parts, status.MemoryContext)
	}
	if len(status.Provider.Available) > 0 {
		parts = append(parts, BuildProviderContext())
	}
	if len(status.MCPServerNames) > 0 {
		parts = append(parts, fmt.Sprintf("Configured MCP servers: %s", strings.Join(status.MCPServerNames, ", ")))
	}
	if status.HyperCodeRepoPath != "" {
		parts = append(parts, fmt.Sprintf("HyperCode repo: %s", status.HyperCodeRepoPath))
	}
	if len(status.Warnings) > 0 {
		parts = append(parts, fmt.Sprintf("Warnings: %s", strings.Join(status.Warnings, "; ")))
	}
	return strings.Join(parts, "\n")
}

func (a *HyperCodeAdapter) listMCPServers() (string, []string, error) {
	configPath, config, err := ParseMCPConfig(a.homeDir)
	if err != nil {
		return configPath, nil, fmt.Errorf("mcp config unavailable: %w", err)
	}
	names := make([]string, 0, len(config.MCPServers))
	for name := range config.MCPServers {
		names = append(names, name)
	}
	sort.Strings(names)
	return configPath, names, nil
}

func (a *HyperCodeAdapter) findHyperCodeRepo() (string, bool) {
	candidates := []string{}
	if a.workingDir != "" {
		candidates = append(candidates,
			filepath.Join(a.workingDir, "..", "hypercode"),
			filepath.Join(a.workingDir, "../hypercode"),
		)
	}
	if a.homeDir != "" {
		candidates = append(candidates, filepath.Join(a.homeDir, "workspace", "hypercode"))
	}
	for _, candidate := range candidates {
		clean := filepath.Clean(candidate)
		if stat, err := os.Stat(filepath.Join(clean, "README.md")); err == nil && !stat.IsDir() {
			return clean, true
		}
	}
	return "", false
}
