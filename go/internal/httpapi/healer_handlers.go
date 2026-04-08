package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/hypercodehq/hypercode-go/internal/hsync"
)

func (s *Server) handleHealerDiagnose(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "healer.diagnose", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "healer.diagnose",
			},
		})
		return
	}

	var payload struct {
		Error   string `json:"error"`
		Context string `json:"context,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid request body"})
		return
	}

	diagnosis, fallbackErr := hsync.DiagnoseError(r.Context(), payload.Error, payload.Context)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   fallbackErr.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    diagnosis,
		"bridge": map[string]any{
			"fallback":  "go-local-healer",
			"procedure": "healer.diagnose",
			"reason":    "upstream unavailable; executing native Go healer diagnosis",
		},
	})
}

func (s *Server) handleHealerHeal(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "healer.heal", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "healer.heal",
			},
		})
		return
	}

	var payload struct {
		Error string `json:"error"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid request body"})
		return
	}

	res, fallbackErr := hsync.AutoHeal(r.Context(), s.cfg.WorkspaceRoot, payload.Error)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   fallbackErr.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    res,
		"bridge": map[string]any{
			"fallback":  "go-local-healer",
			"procedure": "healer.heal",
			"reason":    "upstream unavailable; executing native Go auto-heal",
		},
	})
}

func (s *Server) handleHealerHistory(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "healer.getHistory", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "healer.getHistory",
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge": map[string]any{
			"fallback":  "go-local-healer",
			"procedure": "healer.getHistory",
			"reason":    "upstream unavailable; healer history is empty without an active TypeScript healer runtime",
		},
	})
}
