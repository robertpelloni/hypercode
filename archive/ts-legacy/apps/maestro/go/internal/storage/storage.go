package storage

import (
	"database/sql"
	"encoding/json"
		"io/ioutil"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/RunMaestro/Maestro/internal/types"
	_ "modernc.org/sqlite"
)

type SessionStorage struct {
	dbPath     string
	storageDir string
	mu         sync.RWMutex
}

func NewSessionStorage() *SessionStorage {
	dataDir := getOpenCodeDataDir()
	return &SessionStorage{
		dbPath:     filepath.Join(dataDir, "opencode.db"),
		storageDir: filepath.Join(dataDir, "storage"),
	}
}

func getOpenCodeDataDir() string {
	home, _ := os.UserHomeDir()
	if runtime.GOOS == "windows" {
		appData := os.Getenv("APPDATA")
		if appData == "" {
			appData = filepath.Join(home, "AppData", "Roaming")
		}
		return filepath.Join(appData, "opencode")
	}
	return filepath.Join(home, ".local", "share", "opencode")
}

func (s *SessionStorage) ListSessions(projectPath string) ([]types.AgentSessionInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var allSessions []types.AgentSessionInfo

	// 1. Try SQLite
	sqliteSessions, err := s.listSessionsSqlite(projectPath)
	if err == nil && sqliteSessions != nil {
		allSessions = append(allSessions, sqliteSessions...)
	}

	// 2. Try JSON fallback (simplified for brevity)
	// In a full implementation, we would merge and deduplicate
	
	return allSessions, nil
}

func (s *SessionStorage) listSessionsSqlite(projectPath string) ([]types.AgentSessionInfo, error) {
	if _, err := os.Stat(s.dbPath); os.IsNotExist(err) {
		return nil, nil
	}

	db, err := sql.Open("sqlite", s.dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	normalizedPath := filepath.Clean(projectPath)

	// Simplified query logic mapping to TS implementation
	query := `
		SELECT s.id, s.directory, s.title, s.time_created, s.time_updated,
		       s.summary_additions, s.summary_deletions, s.summary_files
		FROM session s
		WHERE s.directory = ? OR s.directory LIKE ?
		ORDER BY s.time_updated DESC`

	rows, err := db.Query(query, normalizedPath, normalizedPath+string(filepath.Separator)+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []types.AgentSessionInfo
	for rows.Next() {
		var sess types.AgentSessionInfo
		var dir, title string
		var created, updated int64
		var add, del, files sql.NullInt64

		err := rows.Scan(&sess.SessionID, &dir, &title, &created, &updated, &add, &del, &files)
		if err != nil {
			continue
		}

		sess.ProjectPath = projectPath
		sess.Timestamp = time.Unix(created/1000, 0).Format(time.RFC3339)
		sess.ModifiedAt = time.Unix(updated/1000, 0).Format(time.RFC3339)
		sess.FirstMessage = title
		
		// In a real implementation, we'd also join with message/part tables for stats
		sessions = append(sessions, sess)
	}

	return sessions, nil
}

func (s *SessionStorage) LoadMessages(sessionID string) (*types.SessionMessagesResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// 1. Try SQLite
	res, err := s.loadMessagesSqlite(sessionID)
	if err == nil && res != nil {
		return res, nil
	}

	// 2. Fallback to JSON
	return s.loadMessagesJson(sessionID)
}

func (s *SessionStorage) loadMessagesSqlite(sessionID string) (*types.SessionMessagesResult, error) {
	if _, err := os.Stat(s.dbPath); os.IsNotExist(err) {
		return nil, nil
	}

	db, err := sql.Open("sqlite", s.dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, data, time_created FROM message WHERE session_id = ? ORDER BY time_created ASC", sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := &types.SessionMessagesResult{
		Messages: []types.OpenCodeMessage{},
		Parts:    make(map[string][]types.OpenCodePart),
	}

	for rows.Next() {
		var id, dataRaw string
		var created int64
		if err := rows.Scan(&id, &dataRaw, &created); err != nil {
			continue
		}

		var msg types.OpenCodeMessage
		if err := json.Unmarshal([]byte(dataRaw), &msg); err != nil {
			continue
		}
		msg.ID = id
		msg.SessionID = sessionID
		msg.Time = &types.OpenCodeTime{Created: created}
		
		result.Messages = append(result.Messages, msg)
		
		if msg.Tokens != nil {
			result.TotalInputTokens += msg.Tokens.Input
			result.TotalOutputTokens += msg.Tokens.Output
			if msg.Tokens.Cache != nil {
				result.TotalCacheReadTokens += msg.Tokens.Cache.Read
				result.TotalCacheWriteTokens += msg.Tokens.Cache.Write
			}
		}
		result.TotalCost += msg.Cost

		// Load parts
		partRows, err := db.Query("SELECT id, data FROM part WHERE message_id = ? ORDER BY time_created ASC", id)
		if err == nil {
			var parts []types.OpenCodePart
			for partRows.Next() {
				var pId, pDataRaw string
				if err := partRows.Scan(&pId, &pDataRaw); err == nil {
					var p types.OpenCodePart
					if err := json.Unmarshal([]byte(pDataRaw), &p); err == nil {
						p.ID = pId
						p.MessageID = id
						parts = append(parts, p)
					}
				}
			}
			partRows.Close()
			result.Parts[id] = parts
		}
	}

	return result, nil
}

func (s *SessionStorage) loadMessagesJson(sessionID string) (*types.SessionMessagesResult, error) {
	msgDir := filepath.Join(s.storageDir, "message", sessionID)
	files, err := ioutil.ReadDir(msgDir)
	if err != nil {
		return nil, err
	}

	result := &types.SessionMessagesResult{
		Messages: []types.OpenCodeMessage{},
		Parts:    make(map[string][]types.OpenCodePart),
	}

	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}
		
		data, err := ioutil.ReadFile(filepath.Join(msgDir, file.Name()))
		if err != nil {
			continue
		}

		var msg types.OpenCodeMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		
		result.Messages = append(result.Messages, msg)
		// ... (Aggregate tokens and load parts similar to SQLite logic)
	}

	return result, nil
}
