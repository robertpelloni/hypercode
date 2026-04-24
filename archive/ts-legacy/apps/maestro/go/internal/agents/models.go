package agents

type AgentConfigOption struct {
	Key         string   `json:"key"`
	Type        string   `json:"type"` // "text", "number", "select"
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Options     []string `json:"options,omitempty"`
	Default     any      `json:"default"`
}

type AgentDefinition struct {
	ID                  string               `json:"id"`
	Name                string               `json:"name"`
	BinaryName          string               `json:"binaryName"`
	Command             string               `json:"command"`
	Args                []string             `json:"args"`
	RequiresPty         bool                 `json:"requiresPty"`
	Hidden              bool                 `json:"hidden"`
	BatchModePrefix     []string             `json:"batchModePrefix"`
	BatchModeArgs       []string             `json:"batchModeArgs"`
	JsonOutputArgs      []string             `json:"jsonOutputArgs"`
	ReadOnlyArgs        []string             `json:"readOnlyArgs"`
	ReadOnlyCliEnforced bool                 `json:"readOnlyCliEnforced"`
	YoloModeArgs        []string             `json:"yoloModeArgs"`
	DefaultEnvVars      map[string]string    `json:"defaultEnvVars"`
	ReadOnlyEnvOverrides map[string]string    `json:"readOnlyEnvOverrides"`
	NoPromptSeparator   bool                 `json:"noPromptSeparator"`
	ConfigOptions       []AgentConfigOption  `json:"configOptions"`
}

type Agent struct {
	AgentDefinition
	Available bool   `json:"available"`
	Path      string `json:"path"`
	Version   string `json:"version"`
	Error     string `json:"error,omitempty"`
}

type Config struct {
	CustomPath    string            `json:"customPath,omitempty"`
	CustomArgs    string            `json:"customArgs,omitempty"`
	CustomEnvVars map[string]string `json:"customEnvVars,omitempty"`
	Options       map[string]any    `json:"options,omitempty"`
}
