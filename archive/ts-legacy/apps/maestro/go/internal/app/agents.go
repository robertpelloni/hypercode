package app

import (
	"github.com/RunMaestro/Maestro/internal/agents"
)

type AgentsService struct {
	detector *agents.AgentDetector
}

func NewAgentsService() *AgentsService {
	return &AgentsService{
		detector: agents.NewAgentDetector(),
	}
}

func (s *AgentsService) DetectAll() []agents.Agent {
	return s.detector.DetectAll()
}

func (s *AgentsService) GetAgent(id string) (*agents.Agent, error) {
	return s.detector.GetAgent(id)
}

func (s *AgentsService) SetCustomPaths(paths map[string]string) {
	s.detector.SetCustomPaths(paths)
}
