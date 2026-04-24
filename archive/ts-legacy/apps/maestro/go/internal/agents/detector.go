package agents

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"sync"
)

type AgentDetector struct {
	mu            sync.RWMutex
	customPaths   map[string]string
	detectedCache map[string]*Agent
}

func NewAgentDetector() *AgentDetector {
	return &AgentDetector{
		customPaths:   make(map[string]string),
		detectedCache: make(map[string]*Agent),
	}
}

func (d *AgentDetector) SetCustomPaths(paths map[string]string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.customPaths = paths
	// Invalidate cache
	d.detectedCache = make(map[string]*Agent)
}

func (d *AgentDetector) GetAgent(id string) (*Agent, error) {
	d.mu.RLock()
	if agent, ok := d.detectedCache[id]; ok {
		d.mu.RUnlock()
		return agent, nil
	}
	d.mu.RUnlock()

	def := GetAgentDefinition(id)
	if def == nil {
		return nil, fmt.Errorf("agent definition not found for %s", id)
	}

	d.mu.RLock()
	customPath := d.customPaths[id]
	d.mu.RUnlock()

	agent := &Agent{
		AgentDefinition: *def,
		Available:       false,
	}

	binaryToFind := def.BinaryName
	if customPath != "" {
		binaryToFind = customPath
	}

	path, err := exec.LookPath(binaryToFind)
	if err == nil {
		agent.Path = path
		agent.Available = true
		// Try to get version
		cmd := exec.Command(path, "--version")
		if runtime.GOOS == "windows" {
			// Windows sometimes needs cmd /c
			cmd = exec.Command("cmd", "/c", path, "--version")
		}
		out, err := cmd.CombinedOutput()
		if err == nil {
			agent.Version = strings.TrimSpace(string(out))
		}
	} else {
		agent.Error = err.Error()
	}

	d.mu.Lock()
	d.detectedCache[id] = agent
	d.mu.Unlock()

	return agent, nil
}

func (d *AgentDetector) DetectAll() []Agent {
	var agents []Agent
	for _, def := range AgentDefinitions {
		agent, _ := d.GetAgent(def.ID)
		if agent != nil {
			agents = append(agents, *agent)
		}
	}
	return agents
}
