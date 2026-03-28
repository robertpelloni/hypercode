package harnesses

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"

	"github.com/borghq/borg-go/internal/controlplane"
)

type Definition struct {
	ID                  string   `json:"id"`
	Description         string   `json:"description"`
	Maturity            string   `json:"maturity"`
	Primary             bool     `json:"primary,omitempty"`
	SubmodulePath       string   `json:"submodulePath,omitempty"`
	Upstream            string   `json:"upstream,omitempty"`
	Runtime             string   `json:"runtime,omitempty"`
	LaunchCommand       string   `json:"launchCommand,omitempty"`
	Capabilities        []string `json:"capabilities,omitempty"`
	ParityNotes         string   `json:"parityNotes,omitempty"`
	ToolCallCount       int      `json:"toolCallCount,omitempty"`
	ToolCallNames       []string `json:"toolCallNames,omitempty"`
	ToolSource          string   `json:"toolSource,omitempty"`
	ToolInventoryStatus string   `json:"toolInventoryStatus"`
	IntegrationLevel    string   `json:"integrationLevel"`
	Installed           bool     `json:"installed"`
}

type Summary struct {
	SourceBackedHarnessCount    int `json:"sourceBackedHarnessCount"`
	MetadataOnlyHarnessCount    int `json:"metadataOnlyHarnessCount"`
	OperatorDefinedHarnessCount int `json:"operatorDefinedHarnessCount"`
	SourceBackedToolCount       int `json:"sourceBackedToolCount"`
}

func List(workspaceRoot string, tools []controlplane.Tool) []Definition {
	availableTools := make(map[string]bool, len(tools))
	for _, tool := range tools {
		if tool.Available {
			availableTools[tool.Type] = true
		}
	}

	hypercodeTools := hypercodeToolNames(workspaceRoot)
	externalHarnessNote := "External harness; Borg currently tracks install/runtime metadata only, not a source-backed tool registry."
	definitions := []Definition{
		{
			ID:                  "hypercode",
			Description:         "HyperCode Go CLI harness",
			Maturity:            "Experimental",
			Primary:             true,
			SubmodulePath:       "submodules/hypercode",
			Upstream:            "https://github.com/robertpelloni/hypercode",
			Runtime:             "Go / Cobra / TUI",
			LaunchCommand:       "go run .",
			Capabilities:        []string{"repl", "pipe", "borg-adapter", "tool-registry"},
			ParityNotes:         "Borg can read HyperCode tool calls directly from the assimilated submodule source.",
			ToolCallCount:       len(hypercodeTools),
			ToolCallNames:       hypercodeTools,
			ToolSource:          "submodules/hypercode/tools/*.go",
			ToolInventoryStatus: "source-backed",
			IntegrationLevel:    "source-backed",
			Installed:           pathExists(filepath.Join(workspaceRoot, "submodules", "hypercode")),
		},
		{
			ID:                  "aider",
			Description:         "Aider harness",
			Maturity:            "Beta",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["aider"],
		},
		{
			ID:                  "antigravity",
			Description:         "Google Antigravity desktop harness",
			Maturity:            "Experimental",
			Runtime:             "Desktop IDE / command surface",
			Upstream:            "https://antigravity.google/",
			ParityNotes:         "Docs-backed Antigravity editor surface; Borg does not yet have a source-backed shell contract or tool registry for parity-safe integration.",
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           false,
		},
		{
			ID:                  "opencode",
			Description:         "OpenCode harness",
			Maturity:            "Beta",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["opencode"],
		},
		{
			ID:                  "claude",
			Description:         "Claude Code harness",
			Maturity:            "Beta",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["claude-code"],
		},
		{
			ID:                  "codex",
			Description:         "Codex CLI harness",
			Maturity:            "Beta",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["codex"],
		},
		{
			ID:                  "gemini",
			Description:         "Gemini CLI harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["gemini"],
		},
		{
			ID:                  "goose",
			Description:         "Goose harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["goose"],
		},
		{
			ID:                  "qwen",
			Description:         "Qwen CLI harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["qwen"],
		},
		{
			ID:                  "superai-cli",
			Description:         "SuperAI CLI harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["superai-cli"],
		},
		{
			ID:                  "codebuff",
			Description:         "Codebuff harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["codebuff"],
		},
		{
			ID:                  "codemachine",
			Description:         "Codemachine harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["codemachine"],
		},
		{
			ID:                  "factory-droid",
			Description:         "Factory Droid harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["factory-droid"],
		},
		{
			ID:                  "cursor",
			Description:         "Cursor shell harness",
			Maturity:            "Experimental",
			Runtime:             "Editor shell bridge",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["cursor"],
		},
		{
			ID:                  "copilot",
			Description:         "GitHub Copilot CLI harness",
			Maturity:            "Experimental",
			Runtime:             "External CLI",
			ParityNotes:         externalHarnessNote,
			ToolInventoryStatus: "metadata-only",
			IntegrationLevel:    "metadata-only",
			Installed:           availableTools["copilot"],
		},
		{
			ID:                  "custom",
			Description:         "Operator-supplied custom harness",
			Maturity:            "Experimental",
			Runtime:             "Operator-defined",
			ParityNotes:         "Operator-defined harness; tool calls are not enumerable unless the operator supplies a bridge contract.",
			ToolInventoryStatus: "operator-defined",
			IntegrationLevel:    "operator-defined",
			Installed:           false,
		},
	}

	return definitions
}

func Summarize(definitions []Definition) Summary {
	summary := Summary{}
	for _, definition := range definitions {
		switch definition.ToolInventoryStatus {
		case "source-backed":
			summary.SourceBackedHarnessCount++
			summary.SourceBackedToolCount += definition.ToolCallCount
		case "operator-defined":
			summary.OperatorDefinedHarnessCount++
		default:
			summary.MetadataOnlyHarnessCount++
		}
	}
	return summary
}

func pathExists(target string) bool {
	_, err := os.Stat(target)
	return err == nil
}

func hypercodeToolNames(workspaceRoot string) []string {
	toolsDir := filepath.Join(workspaceRoot, "submodules", "hypercode", "tools")
	entries, err := os.ReadDir(toolsDir)
	if err != nil {
		return nil
	}

	namePattern := regexp.MustCompile(`Name:\s*"([^"]+)"`)
	names := map[string]struct{}{}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".go" {
			continue
		}

		content, err := os.ReadFile(filepath.Join(toolsDir, entry.Name()))
		if err != nil {
			continue
		}

		for _, match := range namePattern.FindAllStringSubmatch(string(content), -1) {
			if len(match) < 2 || match[1] == "" {
				continue
			}
			names[match[1]] = struct{}{}
		}
	}

	result := make([]string, 0, len(names))
	for name := range names {
		result = append(result, name)
	}
	sort.Strings(result)
	return result
}
