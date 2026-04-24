package agents

var AgentDefinitions = []AgentDefinition{
	{
		ID:                  "claude-code",
		Name:                "Claude Code",
		BinaryName:          "claude",
		Command:             "claude",
		Args:                []string{},
		BatchModePrefix:     []string{},
		BatchModeArgs:       []string{"--dangerously-skip-permissions"},
		JsonOutputArgs:      []string{"--print", "--verbose", "--output-format", "stream-json"},
		ReadOnlyArgs:        []string{"--dangerously-skip-permissions"}, // Claude handles this via prompt for now
		ReadOnlyCliEnforced: false,
		YoloModeArgs:        []string{"--dangerously-skip-permissions"},
		NoPromptSeparator:   false,
		DefaultEnvVars: map[string]string{
			"FORCE_COLOR": "1",
		},
		ConfigOptions: []AgentConfigOption{
			{
				Key:         "model",
				Type:        "text",
				Label:       "Model",
				Description: "Model override (e.g., claude-3-5-sonnet-20241022). Leave empty for default.",
				Default:     "",
			},
			{
				Key:         "contextWindow",
				Type:        "number",
				Label:       "Context Window Size",
				Description: "Maximum context window size in tokens.",
				Default:     200000,
			},
		},
	},
	{
		ID:                  "codex",
		Name:                "OpenAI Codex",
		BinaryName:          "codex",
		Command:             "codex",
		Args:                []string{},
		BatchModePrefix:     []string{"exec"},
		BatchModeArgs:       []string{"--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check"},
		JsonOutputArgs:      []string{"--json"},
		ReadOnlyArgs:        []string{"--sandbox", "read-only"},
		ReadOnlyCliEnforced: true,
		YoloModeArgs:        []string{"--dangerously-bypass-approvals-and-sandbox"},
		ConfigOptions: []AgentConfigOption{
			{
				Key:         "model",
				Type:        "text",
				Label:       "Model",
				Description: "Model override.",
				Default:     "",
			},
			{
				Key:         "contextWindow",
				Type:        "number",
				Label:       "Context Window Size",
				Description: "Max context window.",
				Default:     128000,
			},
		},
	},
	{
		ID:                  "gemini-cli",
		Name:                "Gemini CLI",
		BinaryName:          "gemini",
		Command:             "gemini",
		Args:                []string{},
		BatchModePrefix:     []string{},
		BatchModeArgs:       []string{"-y"},
		JsonOutputArgs:      []string{"--output-format", "stream-json"},
		ReadOnlyArgs:        []string{},
		ReadOnlyCliEnforced: false,
		YoloModeArgs:        []string{"-y"},
		ConfigOptions: []AgentConfigOption{
			{
				Key:         "model",
				Type:        "select",
				Label:       "Model",
				Description: "Model to use.",
				Options:     []string{"", "auto", "pro", "flash", "flash-lite", "gemini-2.5-pro", "gemini-2.5-flash"},
				Default:     "",
			},
			{
				Key:         "contextWindow",
				Type:        "number",
				Label:       "Context Window Size",
				Description: "Max context window.",
				Default:     1048576,
			},
		},
	},
	{
		ID:                  "opencode",
		Name:                "OpenCode",
		BinaryName:          "opencode",
		Command:             "opencode",
		Args:                []string{},
		BatchModePrefix:     []string{"run"},
		BatchModeArgs:       []string{},
		JsonOutputArgs:      []string{"--format", "json"},
		ReadOnlyArgs:        []string{"--agent", "plan"},
		ReadOnlyCliEnforced: true,
		YoloModeArgs:        []string{},
		DefaultEnvVars: map[string]string{
			"OPENCODE_CONFIG_CONTENT": `{"permission":{"*":"allow","external_directory":"allow","question":"deny"},"tools":{"question":false}}`,
		},
		ConfigOptions: []AgentConfigOption{
			{
				Key:         "model",
				Type:        "text",
				Label:       "Model",
				Description: "Model override.",
				Default:     "",
			},
			{
				Key:         "contextWindow",
				Type:        "number",
				Label:       "Context Window Size",
				Description: "Max context window.",
				Default:     128000,
			},
		},
	},
	{
		ID:                  "factory-droid",
		Name:                "Factory Droid",
		BinaryName:          "droid",
		Command:             "droid",
		Args:                []string{},
		BatchModePrefix:     []string{"exec"},
		BatchModeArgs:       []string{"--skip-permissions-unsafe"},
		JsonOutputArgs:      []string{"-o", "stream-json"},
		ReadOnlyArgs:        []string{},
		ReadOnlyCliEnforced: true,
		YoloModeArgs:        []string{"--skip-permissions-unsafe"},
		NoPromptSeparator:   true,
		ConfigOptions: []AgentConfigOption{
			{
				Key:         "model",
				Type:        "select",
				Label:       "Model",
				Options:     []string{"", "gpt-4o", "claude-3-5-sonnet-20241022"},
				Default:     "",
			},
		},
	},
}

func GetAgentDefinition(id string) *AgentDefinition {
	for i := range AgentDefinitions {
		if AgentDefinitions[i].ID == id {
			return &AgentDefinitions[i]
		}
	}
	return nil
}
