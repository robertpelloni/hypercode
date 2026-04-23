package httpapi

import (
	"encoding/json"
	"net/http"
)

func (s *Server) handleMemoryList(w http.ResponseWriter, r *http.Request) {
	memories := s.memoryManager.GetMemories()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(memories)
}

func (s *Server) handleMemoryAdd(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.memoryManager.AddMemory(req.Content)
	w.WriteHeader(http.StatusCreated)
}
