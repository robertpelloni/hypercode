package hsync

/**
 * @file high_value.go
 * @module go/internal/hsync
 *
 * WHAT: Go-native implementation of the HighValueIngestor.
 * Performs deep semantic extraction for high-value external resources.
 */

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

type HighValueIngestor struct {
	dbPath string
}

func NewHighValueIngestor(dbPath string) *HighValueIngestor {
	return &HighValueIngestor{dbPath: dbPath}
}

func (i *HighValueIngestor) ProcessHighValueQueue(ctx context.Context, limit int) error {
	db, err := sql.Open("sqlite", i.dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	// Select items with many stars or specific tags
	rows, err := db.QueryContext(ctx, `
		SELECT uuid, url, page_title, page_description, tags
		FROM links_backlog
		WHERE research_status = 'done'
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var uuid, url, title, desc, tagsRaw string
		if err := rows.Scan(&uuid, &url, &title, &desc, &tagsRaw); err != nil {
			continue
		}

		// Filter for "High Value" (placeholder heuristic: mcp-server tag)
		if strings.Contains(tagsRaw, "mcp-server") || strings.Contains(tagsRaw, "high-value") {
			fmt.Printf("[Go HighValue] 💎 Deep diving into: %s\n", url)
			i.deepDive(ctx, uuid, url, title, desc)
		}
	}

	return nil
}

func (i *HighValueIngestor) deepDive(ctx context.Context, uuidValue, url, title, desc string) {
	prompt := fmt.Sprintf(`
		Analyze this resource for the HyperCode Control Plane:
		Title: %s
		Description: %s
		URL: %s

		Extract:
		1. MCP recipe (JSON) if it's a server.
		2. Skill instructions if it's a runbook.
		
		Return JSON only.
	`, title, desc, url)

	resp, err := ai.AutoRoute(ctx, []ai.Message{
		{Role: "system", Content: "You are a technical analyst."},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return
	}

	// In a real implementation, we would parse and save to mcp.jsonc or skills/
	fmt.Printf("[Go HighValue] 🔍 Analysis complete for %s: %s\n", url, resp.Content[:min(100, len(resp.Content))])
}
