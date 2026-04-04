package httpapi

import (
	"net/http"
	"strings"
)

func (s *Server) handleMCPStatus(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.getStatus", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getStatus",
			},
		})
		return
	}

	_, summary, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"initialized":              true,
			"connected":                summary.SourceBackedHarnessCount > 0,
			"toolCount":                summary.SourceBackedToolCount,
			"serverCount":              summary.InstalledHarnessCount,
			"connectedCount":           summary.SourceBackedHarnessCount,
			"sourceBackedHarnessCount": summary.SourceBackedHarnessCount,
			"source":                   "source-backed-local-summary",
			"lazySessionMode":          s.lifecycleModes["lazySessionMode"],
			"singleActiveServerMode":   s.lifecycleModes["singleActiveServerMode"],
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getStatus",
			"reason":    "upstream unavailable; using local MCP harness summary",
		},
	})
}

func (s *Server) handleMCPTools(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.listTools", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listTools",
			},
		})
		return
	}

	view, invErr := s.localMCPInventoryView()
	if invErr == nil && view != nil && len(view.Inventory.Tools) > 0 {
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    "upstream unavailable; using local MCP inventory cache",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackMCPInventoryTools(view),
			"bridge":  bridge,
		})
		return
	}

	_, summary, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		if invErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
			return
		}
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    "upstream unavailable; local MCP inventory cache is empty",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    []map[string]any{},
			"bridge":  bridge,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackMCPTools(summary.InstalledHarnesses),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    "upstream unavailable; using local MCP tool inventory",
		},
	})
}

func (s *Server) handleMCPSearchTools(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	payload := map[string]any{"query": query}
	if profile := strings.TrimSpace(r.URL.Query().Get("profile")); profile != "" {
		payload["profile"] = profile
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.searchTools", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.searchTools",
			},
		})
		return
	}

	view, invErr := s.localMCPInventoryView()
	if invErr == nil && view != nil && len(view.Inventory.Tools) > 0 {
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.searchTools",
			"reason":    "upstream unavailable; using local MCP inventory cache",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackSearchMCPInventoryTools(query, view, 20),
			"bridge":  bridge,
		})
		return
	}

	_, summary, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		if invErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
			return
		}
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.searchTools",
			"reason":    "upstream unavailable; local MCP inventory cache is empty",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    []map[string]any{},
			"bridge":  bridge,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    fallbackSearchMCPTools(summary.InstalledHarnesses, query),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.searchTools",
			"reason":    "upstream unavailable; using local MCP tool search results",
		},
	})
}

func (s *Server) handleMCPRuntimeServers(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.listServers", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listServers",
			},
		})
		return
	}

	_, summary, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
		return
	}
	baseServers := fallbackRuntimeServers(summary.InstalledHarnesses)
	runtimeRecords := s.runtimeServers.list()
	for _, record := range runtimeRecords {
		baseServers = append(baseServers, map[string]any{
			"name":                record.Name,
			"runtimeConnected":    record.RuntimeConnected,
			"toolCount":           record.ToolCount,
			"toolInventoryStatus": record.ToolInventoryStatus,
			"integrationLevel":    record.IntegrationLevel,
			"source":              record.Source,
			"command":             record.Command,
			"args":                record.Args,
			"lastCheckedAt":       record.LastCheckedAt,
			"lastError":           nullableString(record.LastError),
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    baseServers,
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listServers",
			"reason":    "upstream unavailable; using local MCP runtime server summary",
		},
	})
}
