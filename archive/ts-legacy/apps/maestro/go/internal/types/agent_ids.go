package types

// AgentId represents the union type of all valid agent IDs
type AgentId string

const (
	AgentTerminal             AgentId = "terminal"
	AgentClaudeCode           AgentId = "claude-code"
	AgentCodex                AgentId = "codex"
	AgentGeminiCLI            AgentId = "gemini-cli"
	AgentQwen3Coder           AgentId = "qwen3-coder"
	AgentOpencode             AgentId = "opencode"
	AgentFactoryDroid         AgentId = "factory-droid"
	AgentAider                AgentId = "aider"
	AgentAdrenalineCLI        AgentId = "adrenaline-cli"
	AgentAmazonQCLI           AgentId = "amazon-q-cli"
	AgentAmazonQDeveloperCLI  AgentId = "amazon-q-developer-cli"
	AgentAmpCodeCLI           AgentId = "amp-code-cli"
	AgentAuggieCLI            AgentId = "auggie-cli"
	AgentAzureOpenaiCLI       AgentId = "azure-openai-cli"
	AgentCodeCLI              AgentId = "code-cli"
	AgentCodebuffCLI          AgentId = "codebuff-cli"
	AgentCodemachineCLI       AgentId = "codemachine-cli"
	AgentCopilotCLI           AgentId = "copilot-cli"
	AgentCrushCLI             AgentId = "crush-cli"
	AgentFactoryCLI           AgentId = "factory-cli"
	AgentGooseCLI             AgentId = "goose-cli"
	AgentGrokCLI              AgentId = "grok-cli"
	AgentKiloCodeCLI          AgentId = "kilo-code-cli"
	AgentKimiCLI              AgentId = "kimi-cli"
	AgentManusCLI             AgentId = "manus-cli"
	AgentMistralVibeCLI       AgentId = "mistral-vibe-cli"
	AgentOllamaCLI            AgentId = "ollama-cli"
	AgentOpenInterpreterCLI   AgentId = "open-interpreter-cli"
	AgentPiCLI                AgentId = "pi-cli"
	AgentRovoCLI              AgentId = "rovo-cli"
	AgentTraeCLI              AgentId = "trae-cli"
	AgentWarpCLI              AgentId = "warp-cli"
)

// AllAgentIDs returns a list of all available agent IDs
func AllAgentIDs() []AgentId {
	return []AgentId{
		AgentTerminal,
		AgentClaudeCode,
		AgentCodex,
		AgentGeminiCLI,
		AgentQwen3Coder,
		AgentOpencode,
		AgentFactoryDroid,
		AgentAider,
		AgentAdrenalineCLI,
		AgentAmazonQCLI,
		AgentAmazonQDeveloperCLI,
		AgentAmpCodeCLI,
		AgentAuggieCLI,
		AgentAzureOpenaiCLI,
		AgentCodeCLI,
		AgentCodebuffCLI,
		AgentCodemachineCLI,
		AgentCopilotCLI,
		AgentCrushCLI,
		AgentFactoryCLI,
		AgentGooseCLI,
		AgentGrokCLI,
		AgentKiloCodeCLI,
		AgentKimiCLI,
		AgentManusCLI,
		AgentMistralVibeCLI,
		AgentOllamaCLI,
		AgentOpenInterpreterCLI,
		AgentPiCLI,
		AgentRovoCLI,
		AgentTraeCLI,
		AgentWarpCLI,
	}
}

// IsValidAgentId checks if a string is a valid agent ID
func IsValidAgentId(id string) bool {
	for _, validId := range AllAgentIDs() {
		if string(validId) == id {
			return true
		}
	}
	return false
}
