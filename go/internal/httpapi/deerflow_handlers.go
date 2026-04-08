package httpapi

import "net/http"

func (s *Server) handleDeerFlowStatus(w http.ResponseWriter, r *http.Request) {
	// deerFlow.status: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleDeerFlowModels(w http.ResponseWriter, r *http.Request) {
	// deerFlow.models: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleDeerFlowSkills(w http.ResponseWriter, r *http.Request) {
	// deerFlow.skills: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleDeerFlowMemory(w http.ResponseWriter, r *http.Request) {
	// deerFlow.memory: upstream bridge call replaced with local fallback, nil)
}
