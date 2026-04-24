package memorystore

/**
 * @file archiver.go
 * @module go/internal/memorystore
 *
 * WHAT: Go-native implementation of session transcript archiving.
 * Converts raw JSON sessions into compressed plaintext archives.
 *
 * WHY: Total Autonomy — The Go sidecar should be able to manage session 
 * lifecycle and archiving independently of the Node control plane.
 */

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

type ArchivedSessionMetadata struct {
	OriginalID     string `json:"originalId"`
	SourceTool     string `json:"sourceTool"`
	Title          string `json:"title"`
	Timestamp      int64  `json:"timestamp"`
	CompressedSize int64  `json:"compressedSize"`
}

type MemoryArchiver struct {
	workspaceRoot string
	archivePath   string
}

func NewMemoryArchiver(workspaceRoot string) *MemoryArchiver {
	return &MemoryArchiver{
		workspaceRoot: workspaceRoot,
		archivePath:   filepath.Join(workspaceRoot, "data", "archives", "sessions.zip"),
	}
}

func (a *MemoryArchiver) ArchiveAndExtract(ctx context.Context, sessionData map[string]interface{}) (*ArchivedSessionMetadata, error) {
	sessionID, _ := sessionData["id"].(string)
	if sessionID == "" {
		sessionID = fmt.Sprintf("session-%d", time.Now().UnixMilli())
	}

	title, _ := sessionData["title"].(string)
	if title == "" {
		title = sessionID
	}

	sourceTool, _ := sessionData["sourceTool"].(string)
	if sourceTool == "" {
		sourceTool = "unknown"
	}

	transcript := a.formatToPlaintext(sessionData)
	if transcript == "" {
		return nil, fmt.Errorf("empty transcript or unrecognized format")
	}

	// 1. Extract Valuable Memories (Simulated or via AI package)
	err := a.extractValuableMemories(ctx, transcript, title)
	if err != nil {
		fmt.Printf("[Go Archiver] Memory extraction failed: %v\n", err)
	}

	// 2. Add to Compressed Archive
	compressedSize, err := a.writeToZip(sessionID, transcript, sourceTool)
	if err != nil {
		return nil, err
	}

	return &ArchivedSessionMetadata{
		OriginalID:     sessionID,
		SourceTool:     sourceTool,
		Title:          title,
		Timestamp:      time.Now().UnixMilli(),
		CompressedSize: compressedSize,
	}, nil
}

func (a *MemoryArchiver) formatToPlaintext(sessionData map[string]interface{}) string {
	messages, ok := sessionData["messages"].([]interface{})
	if !ok {
		messages, ok = sessionData["conversation"].([]interface{})
	}
	if !ok {
		return ""
	}

	var sb strings.Builder
	for i, m := range messages {
		msgMap, ok := m.(map[string]interface{})
		if !ok {
			continue
		}

		role, _ := msgMap["role"].(string)
		if role == "" {
			role = "unknown"
		}

		content := ""
		if c, ok := msgMap["content"].(string); ok {
			content = c
		} else {
			jsonData, _ := json.Marshal(msgMap["content"])
			content = string(jsonData)
		}

		if i > 0 {
			sb.WriteString("\n\n---\n\n")
		}
		sb.WriteString(strings.ToUpper(role))
		sb.WriteString(": ")
		sb.WriteString(content)
	}

	return sb.String()
}

func (a *MemoryArchiver) extractValuableMemories(ctx context.Context, transcript string, title string) error {
	prompt := fmt.Sprintf(`
		Analyze the following session transcript titled "%s".
		Identify the MOST VALUABLE pieces of knowledge, decisions made, or technical discoveries.
		Ignore small talk, errors, or redundant steps.
		
		Return ONLY a JSON array of strings.
		
		TRANSCRIPT:
		%s
	`, title, transcript[:min(8000, len(transcript))])

	messages := []ai.Message{
		{Role: "user", Content: prompt},
	}

	resp, err := ai.AutoRoute(ctx, messages)
	if err != nil {
		return err
	}

	// Heuristic parsing of JSON array
	start := strings.Index(resp.Content, "[")
	end := strings.LastIndex(resp.Content, "]")
	if start == -1 || end == -1 {
		return fmt.Errorf("no JSON array found in LLM response")
	}

	var memories []string
	if err := json.Unmarshal([]byte(resp.Content[start:end+1]), &memories); err != nil {
		return err
	}

	// In a real implementation, we would save these to the Go-native memory store
	fmt.Printf("[Go Archiver] Extracted %d memories from %s\n", len(memories), title)
	return nil
}

func (a *MemoryArchiver) writeToZip(sessionID, transcript, sourceTool string) (int64, error) {
	err := os.MkdirAll(filepath.Dir(a.archivePath), 0755)
	if err != nil {
		return 0, err
	}

	// Read existing or create new
	var buf bytes.Buffer
	var zipWriter *zip.Writer

	if _, err := os.Stat(a.archivePath); err == nil {
		data, err := os.ReadFile(a.archivePath)
		if err != nil {
			return 0, err
		}
		buf.Write(data)
		
		// This is a simplified approach. In a real world, you'd use a temporary file.
		// For this implementation, we overwrite with a new zip.
	}

	zipWriter = zip.NewWriter(&buf)
	
	f, err := zipWriter.Create(sessionID + ".txt")
	if err != nil {
		return 0, err
	}
	
	_, err = f.Write([]byte(transcript))
	if err != nil {
		return 0, err
	}

	err = zipWriter.Close()
	if err != nil {
		return 0, err
	}

	err = os.WriteFile(a.archivePath, buf.Bytes(), 0644)
	if err != nil {
		return 0, err
	}

	return int64(buf.Len()), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
