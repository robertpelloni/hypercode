package httpapi

import (
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hypercodehq/hypercode-go/internal/mcp"
)

type localMCPInventoryView struct {
	Inventory                   *mcp.Inventory
	CachePath                   string
	CachePresent                bool
	InventorySource             string
	CachedAt                    string
	PersistedOverlayCheckedAt   string
	LiveOverlayCheckedAt        string
	PersistedOverlayServerCount int
	PersistedOverlayToolCount   int
	RuntimeOverlayServerCount   int
	RuntimeOverlayToolCount     int
	ServerSources               map[string]string
}

func (s *Server) localMCPInventoryCachePath() string {
	return filepath.Join(s.cfg.ConfigDir, "mcp_inventory_cache.json")
}

func (s *Server) localMCPInventory() (*mcp.Inventory, error) {
	return mcp.LoadInventoryWithCache(s.cfg.WorkspaceRoot, s.cfg.MainConfigDir, s.localMCPInventoryCachePath())
}

func (s *Server) syncRuntimeOverlayCache() error {
	return mcp.SyncRuntimeOverlayCache(s.localMCPInventoryCachePath(), runtimeOverlayServersFromRecords(s.runtimeServers.list()))
}

func (s *Server) localMCPInventoryView() (*localMCPInventoryView, error) {
	inventory, err := s.localMCPInventory()
	if err != nil {
		return nil, err
	}
	cachePath := s.localMCPInventoryCachePath()
	_, statErr := os.Stat(cachePath)
	view := &localMCPInventoryView{
		Inventory:       cloneInventory(inventory),
		CachePath:       cachePath,
		CachePresent:    statErr == nil,
		InventorySource: inventory.Source,
		CachedAt:        inventory.CachedAt,
		ServerSources:   map[string]string{},
	}
	for _, server := range view.Inventory.Servers {
		view.ServerSources[server.Name] = inventory.Source
	}
	if snapshot, snapshotErr := mcp.LoadInventoryCacheSnapshot(cachePath); snapshotErr == nil && snapshot != nil {
		view.applyPersistedRuntimeOverlay(snapshot.RuntimeOverlay)
		view.PersistedOverlayCheckedAt = freshestRuntimeOverlayCheck(snapshot.RuntimeOverlay, snapshot.CachedAt)
		if view.CachedAt == "" {
			view.CachedAt = snapshot.CachedAt
		}
	}
	liveOverlay := runtimeOverlayServersFromRecords(s.runtimeServers.list())
	view.LiveOverlayCheckedAt = freshestRuntimeOverlayCheck(liveOverlay, "")
	view.applyRuntimeOverlay(liveOverlay)
	return view, nil
}

func (v *localMCPInventoryView) applyPersistedRuntimeOverlay(records []mcp.RuntimeOverlayServer) {
	v.applyOverlay(records, true)
}

func (v *localMCPInventoryView) applyRuntimeOverlay(records []mcp.RuntimeOverlayServer) {
	v.applyOverlay(records, false)
}

func (v *localMCPInventoryView) applyOverlay(records []mcp.RuntimeOverlayServer, persisted bool) {
	if v == nil || v.Inventory == nil || len(records) == 0 {
		return
	}
	serverIndex := make(map[string]int, len(v.Inventory.Servers))
	toolIndex := make(map[string]int, len(v.Inventory.Tools))
	for i, server := range v.Inventory.Servers {
		serverIndex[server.Name] = i
	}
	for i, tool := range v.Inventory.Tools {
		toolKey := tool.Server + "::" + normalizedInventoryToolName(tool)
		toolIndex[toolKey] = i
	}

	for _, record := range records {
		if strings.TrimSpace(record.Name) == "" || len(record.Tools) == 0 {
			continue
		}
		if index, ok := serverIndex[record.Name]; ok {
			server := v.Inventory.Servers[index]
			server.Command = record.Command
			server.Args = append([]string(nil), record.Args...)
			server.Env = copyStringMap(record.Env)
			server.Enabled = true
			v.Inventory.Servers[index] = server
		} else {
			v.Inventory.Servers = append(v.Inventory.Servers, mcp.ServerEntry{
				UUID:        "runtime:" + record.Name,
				Name:        record.Name,
				DisplayName: record.Name,
				Type:        "STDIO",
				Command:     record.Command,
				Args:        append([]string(nil), record.Args...),
				Env:         copyStringMap(record.Env),
				Enabled:     true,
			})
			serverIndex[record.Name] = len(v.Inventory.Servers) - 1
			if persisted {
				v.PersistedOverlayServerCount++
			} else {
				v.RuntimeOverlayServerCount++
			}
		}
		source := record.Source
		if persisted {
			source = "go-persisted-runtime-overlay"
		}
		v.ServerSources[record.Name] = source
		for _, tool := range record.Tools {
			name := strings.TrimSpace(tool.Name)
			if name == "" {
				continue
			}
			entry := mcp.ToolEntryFromMetadata(record.Name, tool)
			toolKey := record.Name + "::" + name
			if index, ok := toolIndex[toolKey]; ok {
				v.Inventory.Tools[index] = entry
			} else {
				v.Inventory.Tools = append(v.Inventory.Tools, entry)
				toolIndex[toolKey] = len(v.Inventory.Tools) - 1
				if persisted {
					v.PersistedOverlayToolCount++
				} else {
					v.RuntimeOverlayToolCount++
				}
			}
		}
	}
}

func runtimeOverlayServersFromRecords(records []runtimeServerRecord) []mcp.RuntimeOverlayServer {
	if len(records) == 0 {
		return []mcp.RuntimeOverlayServer{}
	}
	overlay := make([]mcp.RuntimeOverlayServer, 0, len(records))
	for _, record := range records {
		if strings.TrimSpace(record.Name) == "" || len(record.Tools) == 0 {
			continue
		}
		overlay = append(overlay, mcp.RuntimeOverlayServer{
			Name:                record.Name,
			Command:             record.Command,
			Args:                append([]string(nil), record.Args...),
			Env:                 copyStringMap(record.Env),
			RuntimeConnected:    record.RuntimeConnected,
			ToolCount:           record.ToolCount,
			ToolInventoryStatus: record.ToolInventoryStatus,
			IntegrationLevel:    record.IntegrationLevel,
			Source:              record.Source,
			Tools:               mcp.MetadataToolsFromAny(genericAnySlice(record.Tools)),
			LastCheckedAt:       record.LastCheckedAt,
			LastError:           record.LastError,
		})
	}
	return overlay
}

func cloneInventory(inventory *mcp.Inventory) *mcp.Inventory {
	if inventory == nil {
		return &mcp.Inventory{Servers: []mcp.ServerEntry{}, Tools: []mcp.ToolEntry{}, Source: "empty"}
	}
	return &mcp.Inventory{
		Servers:  append([]mcp.ServerEntry(nil), inventory.Servers...),
		Tools:    append([]mcp.ToolEntry(nil), inventory.Tools...),
		Source:   inventory.Source,
		CachedAt: inventory.CachedAt,
	}
}

func normalizedInventoryToolName(tool mcp.ToolEntry) string {
	if strings.TrimSpace(tool.OriginalName) != "" {
		return tool.OriginalName
	}
	if strings.TrimSpace(tool.Name) != "" {
		return tool.Name
	}
	if strings.TrimSpace(tool.AdvertisedName) != "" {
		return tool.AdvertisedName
	}
	return "unknown"
}

func normalizedInventoryTools(inventory *mcp.Inventory) []mcp.ToolEntry {
	if inventory == nil || len(inventory.Tools) == 0 {
		return []mcp.ToolEntry{}
	}
	tools := make([]mcp.ToolEntry, 0, len(inventory.Tools))
	for _, tool := range inventory.Tools {
		copyTool := tool
		copyTool.Name = normalizedInventoryToolName(tool)
		if strings.TrimSpace(copyTool.AdvertisedName) == "" {
			copyTool.AdvertisedName = tool.Name
		}
		tools = append(tools, copyTool)
	}
	return tools
}

func inventoryBridgeMeta(view *localMCPInventoryView) map[string]any {
	if view == nil {
		return map[string]any{}
	}
	meta := map[string]any{
		"inventorySource":             view.InventorySource,
		"cachedAt":                    nullableString(view.CachedAt),
		"cachePath":                   view.CachePath,
		"cachePresent":                view.CachePresent,
		"cacheAuthority":              "go-local-live-sync",
		"metadataAuthority":           "mcp.jsonc",
		"persistedOverlayServerCount": view.PersistedOverlayServerCount,
		"persistedOverlayToolCount":   view.PersistedOverlayToolCount,
		"runtimeOverlayServerCount":   view.RuntimeOverlayServerCount,
		"runtimeOverlayToolCount":     view.RuntimeOverlayToolCount,
	}
	for key, value := range freshnessBridgeMeta("baseInventory", view.CachedAt, 24*time.Hour) {
		meta[key] = value
	}
	for key, value := range freshnessBridgeMeta("persistedOverlay", view.PersistedOverlayCheckedAt, 15*time.Minute) {
		meta[key] = value
	}
	for key, value := range freshnessBridgeMeta("liveOverlay", view.LiveOverlayCheckedAt, 15*time.Minute) {
		meta[key] = value
	}
	return meta
}

func freshestRuntimeOverlayCheck(records []mcp.RuntimeOverlayServer, fallback string) string {
	freshest := strings.TrimSpace(fallback)
	freshestTime := parseFreshnessTimestamp(freshest)
	for _, record := range records {
		candidate := strings.TrimSpace(record.LastCheckedAt)
		candidateTime := parseFreshnessTimestamp(candidate)
		if candidateTime.IsZero() {
			continue
		}
		if freshestTime.IsZero() || candidateTime.After(freshestTime) {
			freshest = candidate
			freshestTime = candidateTime
		}
	}
	return freshest
}

func freshnessBridgeMeta(prefix string, timestamp string, staleAfter time.Duration) map[string]any {
	meta := map[string]any{
		prefix + "CachedAt": nullableString(timestamp),
	}
	parsed := parseFreshnessTimestamp(timestamp)
	if parsed.IsZero() {
		meta[prefix+"AgeMs"] = nil
		meta[prefix+"StaleHeuristic"] = nil
		return meta
	}
	age := time.Since(parsed)
	if age < 0 {
		age = 0
	}
	meta[prefix+"AgeMs"] = age.Milliseconds()
	meta[prefix+"StaleHeuristic"] = age > staleAfter
	return meta
}

func parseFreshnessTimestamp(value string) time.Time {
	if strings.TrimSpace(value) == "" {
		return time.Time{}
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}
	}
	return parsed.UTC()
}

func genericAnySlice(items []map[string]any) []any {
	if len(items) == 0 {
		return []any{}
	}
	result := make([]any, 0, len(items))
	for _, item := range items {
		result = append(result, item)
	}
	return result
}

func inventoryToolSource(view *localMCPInventoryView, serverName string) string {
	if view == nil {
		return "unknown"
	}
	if source, ok := view.ServerSources[serverName]; ok && strings.TrimSpace(source) != "" {
		return source
	}
	return view.InventorySource
}

func fallbackMCPInventoryTools(view *localMCPInventoryView) []map[string]any {
	if view == nil {
		return []map[string]any{}
	}
	tools := normalizedInventoryTools(view.Inventory)
	result := make([]map[string]any, 0, len(tools))
	for _, tool := range tools {
		result = append(result, map[string]any{
			"name":              tool.Name,
			"description":       tool.Description,
			"server":            tool.Server,
			"alwaysShow":        tool.AlwaysOn,
			"source":            inventoryToolSource(view, tool.Server),
			"availability":      "cache-backed",
			"inventoryCachedAt": nullableString(view.CachedAt),
		})
	}
	return result
}

func fallbackSearchMCPInventoryTools(query string, view *localMCPInventoryView, limit int) []map[string]any {
	if view == nil {
		return []map[string]any{}
	}
	ranked := mcp.RankTools(query, normalizedInventoryTools(view.Inventory), limit)
	results := make([]map[string]any, 0, len(ranked))
	for _, item := range ranked {
		results = append(results, map[string]any{
			"name":              normalizedInventoryToolName(item.ToolEntry),
			"server":            item.Server,
			"alwaysShow":        item.AlwaysOn,
			"matchReason":       item.MatchReason,
			"score":             item.Score,
			"source":            inventoryToolSource(view, item.Server),
			"inventoryCachedAt": nullableString(view.CachedAt),
		})
	}
	return results
}

func fallbackControlToolsFromInventory(view *localMCPInventoryView) []map[string]any {
	if view == nil || view.Inventory == nil {
		return []map[string]any{}
	}
	serverUUIDs := make(map[string]string, len(view.Inventory.Servers))
	for _, server := range view.Inventory.Servers {
		if strings.TrimSpace(server.Name) != "" {
			serverUUIDs[server.Name] = server.UUID
		}
	}
	tools := normalizedInventoryTools(view.Inventory)
	result := make([]map[string]any, 0, len(tools))
	for _, tool := range tools {
		schemaParamCount := 0
		if inputSchemaMap, ok := tool.InputSchema.(map[string]any); ok {
			if properties, ok := inputSchemaMap["properties"].(map[string]any); ok {
				schemaParamCount = len(properties)
			}
		}
		result = append(result, map[string]any{
			"uuid":              tool.Name,
			"name":              tool.Name,
			"description":       nullableString(tool.Description),
			"server":            tool.Server,
			"inputSchema":       tool.InputSchema,
			"isDeferred":        false,
			"schemaParamCount":  schemaParamCount,
			"mcpServerUuid":     serverUUIDs[tool.Server],
			"always_on":         tool.AlwaysOn,
			"source":            inventoryToolSource(view, tool.Server),
			"inventoryCachedAt": nullableString(view.CachedAt),
		})
	}
	return result
}

func fallbackControlToolFromInventory(view *localMCPInventoryView, uuid string) any {
	for _, tool := range fallbackControlToolsFromInventory(view) {
		if stringValue(tool["uuid"]) == uuid || stringValue(tool["name"]) == uuid {
			return tool
		}
	}
	return nil
}
