package agents

import (
	"os/exec"
)

type Agent struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Binary    string `json:"binary"`
	Available bool   `json:"available"`
}

func Detect() []Agent {
	agents := []Agent{
		{ID: "claude-code", Name: "Claude Code", Binary: "claude"},
		{ID: "codex", Name: "Codex", Binary: "codex"},
		{ID: "gemini-cli", Name: "Gemini CLI", Binary: "gemini"},
		{ID: "opencode", Name: "OpenCode", Binary: "opencode"},
		{ID: "aider", Name: "Aider", Binary: "aider"},
	}

	for i := range agents {
		path, err := exec.LookPath(agents[i].Binary)
		agents[i].Available = (err == nil && path != "")
	}

	return agents
}
