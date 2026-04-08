package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

// configKVStore provides durable key-value config storage backed by SQLite.
type configKVStore struct {
	mu sync.Mutex
	db *sql.DB
}

func newConfigKVStore(dataDir string) (*configKVStore, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("create config data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "config.db")
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("open config db: %w", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS config_kv (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at INTEGER NOT NULL
	)`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create config table: %w", err)
	}

	return &configKVStore{db: db}, nil
}

func (s *configKVStore) close() error {
	return s.db.Close()
}

func (s *configKVStore) Upsert(key string, value any) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal config value: %w", err)
	}

	_, err = s.db.Exec(
		`INSERT INTO config_kv (key, value, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
		key, string(b), time.Now().UnixMilli(),
	)
	return err
}

func (s *configKVStore) Get(key string) (any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var raw string
	err := s.db.QueryRow(`SELECT value FROM config_kv WHERE key = ?`, key).Scan(&raw)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var result any
	return result, json.Unmarshal([]byte(raw), &result)
}

func (s *configKVStore) GetAll() (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`SELECT key, value FROM config_kv`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := map[string]any{}
	for rows.Next() {
		var k, raw string
		if err := rows.Scan(&k, &raw); err != nil {
			continue
		}
		var v any
		if json.Unmarshal([]byte(raw), &v) == nil {
			result[k] = v
		}
	}
	return result, nil
}

func (s *configKVStore) Delete(key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM config_kv WHERE key = ?`, key)
	return err
}

// configMutationFallback provides Go-native config mutation logic.
func configMutationFallback(ctx context.Context, store *configKVStore, procedure string, payload map[string]any) (map[string]any, error) {
	switch procedure {
	case "config.upsert":
		key, _ := payload["key"].(string)
		if key == "" {
			return nil, fmt.Errorf("missing config key")
		}
		if err := store.Upsert(key, payload["value"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true, "key": key}, nil

	case "config.delete":
		key, _ := payload["key"].(string)
		if key == "" {
			return nil, fmt.Errorf("missing config key")
		}
		if err := store.Delete(key); err != nil {
			return nil, err
		}
		return map[string]any{"success": true, "key": key}, nil

	case "config.update":
		key, _ := payload["key"].(string)
		if key == "" {
			return nil, fmt.Errorf("missing config key")
		}
		if err := store.Upsert(key, payload["value"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true, "key": key}, nil

	case "config.setMcpTimeout":
		if err := store.Upsert("mcpTimeout", payload["timeout"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setMcpMaxAttempts":
		if err := store.Upsert("mcpMaxAttempts", payload["maxAttempts"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setMcpMaxTotalTimeout":
		if err := store.Upsert("mcpMaxTotalTimeout", payload["maxTotalTimeout"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setMcpResetTimeoutOnProgress":
		if err := store.Upsert("mcpResetTimeoutOnProgress", payload["enabled"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setSessionLifetime":
		if err := store.Upsert("sessionLifetime", payload["lifetime"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setSignupDisabled":
		if err := store.Upsert("signupDisabled", payload["disabled"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setSsoSignupDisabled":
		if err := store.Upsert("ssoSignupDisabled", payload["disabled"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setBasicAuthDisabled":
		if err := store.Upsert("basicAuthDisabled", payload["disabled"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	case "config.setAlwaysVisibleTools":
		if err := store.Upsert("alwaysVisibleTools", payload["tools"]); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil

	default:
		return nil, fmt.Errorf("unsupported config procedure: %s", procedure)
	}
}
