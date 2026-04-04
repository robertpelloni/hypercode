package mcp

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

func TestLoadConfigServersFromJSONC(t *testing.T) {
	configDir := t.TempDir()
	content := `// comment
{
  "mcpServers": {
    "core": {
      "command": "node",
      "args": ["server.js"],
      "env": {"MODE": "test"},
      "_meta": {
        "tools": [
          {"name": "search_tools", "description": "Search tools", "inputSchema": {"type": "object"}}
        ]
      }
    }
  }
}`
	if err := os.WriteFile(filepath.Join(configDir, "mcp.jsonc"), []byte(content), 0o644); err != nil {
		t.Fatalf("failed to write mcp.jsonc: %v", err)
	}

	servers, err := loadConfigServers(configDir)
	if err != nil {
		t.Fatalf("loadConfigServers returned error: %v", err)
	}
	core, ok := servers["core"]
	if !ok {
		t.Fatalf("expected core server, got %#v", servers)
	}
	if core.Command != "node" || len(core.Args) != 1 || core.Args[0] != "server.js" {
		t.Fatalf("unexpected core config: %#v", core)
	}
	if len(core.Meta.Tools) != 1 || core.Meta.Tools[0].Name != "search_tools" {
		t.Fatalf("expected search_tools metadata, got %#v", core.Meta.Tools)
	}
}

func TestLoadInventoryFromConfigAndDatabase(t *testing.T) {
	workspace := t.TempDir()
	configDir := t.TempDir()

	configContent := `{
  "mcpServers": {
    "config-core": {
      "command": "node",
      "args": ["config-server.js"],
      "_meta": {
        "tools": [
          {"name": "config_search", "description": "Config search", "inputSchema": {"type": "object"}}
        ]
      }
    }
  }
}`
	if err := os.WriteFile(filepath.Join(configDir, "mcp.json"), []byte(configContent), 0o644); err != nil {
		t.Fatalf("failed to write mcp.json: %v", err)
	}

	dbDir := filepath.Join(workspace, "packages", "core")
	if err := os.MkdirAll(dbDir, 0o755); err != nil {
		t.Fatalf("failed to create db dir: %v", err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dbDir, "metamcp.db"))
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	defer db.Close()
	if _, err := db.Exec(`
		CREATE TABLE mcp_servers (
			uuid TEXT PRIMARY KEY,
			name TEXT,
			type TEXT,
			command TEXT,
			args BLOB,
			env BLOB,
			url TEXT,
			description TEXT,
			enabled BOOLEAN,
			always_on BOOLEAN
		);
		CREATE TABLE tools (
			name TEXT,
			description TEXT,
			mcp_server_uuid TEXT,
			always_on BOOLEAN,
			tool_schema BLOB
		);
		INSERT INTO mcp_servers (uuid, name, type, command, args, env, url, description, enabled, always_on)
		VALUES ('srv-db-1', 'db-core', 'STDIO', 'node', '["db-server.js"]', '{"MODE":"db"}', '', 'DB core', 1, 1);
		INSERT INTO tools (name, description, mcp_server_uuid, always_on, tool_schema)
		VALUES ('db_search', 'DB search', 'srv-db-1', 1, '{"type":"object"}');
	`); err != nil {
		t.Fatalf("failed to seed sqlite db: %v", err)
	}

	inventory, err := LoadInventory(workspace, configDir)
	if err != nil {
		t.Fatalf("LoadInventory returned error: %v", err)
	}
	if inventory.Source != "database" {
		t.Fatalf("expected inventory source database, got %q", inventory.Source)
	}
	if len(inventory.Servers) != 2 {
		t.Fatalf("expected 2 servers, got %#v", inventory.Servers)
	}
	if len(inventory.Tools) != 2 {
		t.Fatalf("expected 2 tools, got %#v", inventory.Tools)
	}

	foundConfigTool := false
	foundDBTool := false
	for _, tool := range inventory.Tools {
		if tool.OriginalName == "config_search" && tool.Server == "config-core" {
			foundConfigTool = true
		}
		if tool.OriginalName == "db_search" && tool.Server == "db-core" && tool.AlwaysOn {
			foundDBTool = true
		}
	}
	if !foundConfigTool || !foundDBTool {
		t.Fatalf("expected both config and db tools, got %#v", inventory.Tools)
	}
}
