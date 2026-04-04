package httpapi

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/mcp"
)

type localMCPInventoryView struct {
	Inventory                 *mcp.Inventory
	CachePath                 string
	CachePresent              bool
	InventorySource           string
	CachedAt                  string
	RuntimeOverlayServerCount int
	RuntimeOverlayToolCount   int
	ServerSources             map[string]string
}

func (s *Server) localMCPInventoryCachePath() string {
	return filepath.Join(s.cfg.ConfigDir, "mcp_inventory_cache.json")
}

func (s *Server) localMCPInventory() (*mcp.Inventory, error) {
	return mcp.LoadInventoryWithCache(s.cfg.WorkspaceRoot, s.cfg.MainConfigDir, s.localMCPInventoryCachePath())
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
	view.applyRuntimeOverlay(s.runtimeServers.list())
	return view, nil
}

func (v *localMCPInventoryView) applyRuntimeOverlay(records []runtimeServerRecord) {
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
			v.RuntimeOverlayServerCount++
		}
		v.ServerSources[record.Name] = record.Source
		for _, rawTool := range record.Tools {
			name := strings.TrimSpace(stringValue(rawTool["name"]))
			if name == "" {
				continue
			}
			entry := mcp.ToolEntry{
				Name:              record.Name + "__" + name,
				Description:       stringValue(rawTool["description"]),
				Server:            record.Name,
				ServerDisplayName: record.Name,
				AdvertisedName:    record.Name + "__" + name,
				OriginalName:      name,
				InputSchema:       rawTool["inputSchema"],
			}
			toolKey := record.Name + "::" + name
			if index, ok := toolIndex[toolKey]; ok {
				v.Inventory.Tools[index] = entry
			} else {
				v.Inventory.Tools = append(v.Inventory.Tools, entry)
				toolIndex[toolKey] = len(v.Inventory.Tools) - 1
				v.RuntimeOverlayToolCount++
			}
		}
	}
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
	return map[string]any{
		"inventorySource":           view.InventorySource,
		"cachedAt":                  nullableString(view.CachedAt),
		"cachePath":                 view.CachePath,
		"cachePresent":              view.CachePresent,
		"runtimeOverlayServerCount": view.RuntimeOverlayServerCount,
		"runtimeOverlayToolCount":   view.RuntimeOverlayToolCount,
	}
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
