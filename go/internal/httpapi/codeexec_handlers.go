package httpapi

import (
	"encoding/json"
	"net/http"
)

func (s *Server) handleCodeExec(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Language string `json:"language"`
		Code     string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := s.codeExecutor.Execute(req.Language, req.Code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
