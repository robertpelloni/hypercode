package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/memorystore"
)

func (s *Server) handleMemoryArchiveSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		SessionData map[string]interface{} `json:"sessionData"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	// Try upstream first
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.archiveSession", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.archiveSession",
			},
		})
		return
	}

	// Fallback: local Go memory archiver
	archiveResult, err := s.memoryArchiver.ArchiveAndExtract(r.Context(), payload.SessionData)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    archiveResult,
		"bridge": map[string]any{
			"fallback": "go-local-archiver",
		},
	})
}

func (s *Server) handleMemorySearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	limit := 50
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "query parameter is required"})
		return
	}

	payload := map[string]any{"query": query, "limit": limit}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.query", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.query",
			},
		})
		return
	}

	sqliteResults, searchErr := memorystore.Search(s.cfg.WorkspaceRoot, query, limit)
	if searchErr != nil {
		sqliteResults = []memorystore.SearchResult{}
	}
	contextResults, localErr := s.localMemoryQueryResults(query, limit)
	if localErr != nil {
		contextResults = []map[string]any{}
	}

	merged := make([]map[string]any, 0, maxInt(len(sqliteResults), len(contextResults)))
	seen := map[string]struct{}{}
	for _, row := range sqliteResults {
		id := strings.TrimSpace(row.ID)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		merged = append(merged, map[string]any{
			"id":      id,
			"content": row.Content,
			"metadata": map[string]any{
				"type":      row.Type,
				"source":    row.Source,
				"url":       row.URL,
				"title":     row.Title,
				"createdAt": row.CreatedAt,
			},
			"score": 1,
		})
		if limit > 0 && len(merged) >= limit {
			break
		}
	}
	if limit <= 0 || len(merged) < limit {
		for _, row := range contextResults {
			id := strings.TrimSpace(stringValue(row["id"]))
			if id == "" {
				continue
			}
			if _, exists := seen[id]; exists {
				continue
			}
			seen[id] = struct{}{}
			merged = append(merged, row)
			if limit > 0 && len(merged) >= limit {
				break
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    merged,
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.query",
			"reason":    "upstream unavailable; using local persisted memory search",
		},
	})
}

func (s *Server) handleMemoryContexts(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.listContexts", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.listContexts",
			},
		})
		return
	}

	contexts, localErr := s.localMemoryContexts()
	if localErr != nil {
		contexts = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    contexts,
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.listContexts",
			"reason":    "upstream unavailable; using local memory context list",
		},
	})
}

func (s *Server) handleMemorySectionedStatus(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "memory.getSectionedMemoryStatus", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "memory.getSectionedMemoryStatus",
			},
		})
		return
	}

	status, localErr := memorystore.ReadStatus(s.cfg.WorkspaceRoot)
	if localErr != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": localErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    status,
		"bridge": map[string]any{
			"fallback":  "go-local-memory",
			"procedure": "memory.getSectionedMemoryStatus",
			"reason":    "upstream unavailable; using local sectioned memory status",
		},
	})
}
