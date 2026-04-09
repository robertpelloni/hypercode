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
	"github.com/hypercodehq/hypercode-go/internal/harnesses"
)

type HighValueIngestor struct {
	dbPath     string
	skillStore *harnesses.SkillStore
}

func NewHighValueIngestor(dbPath string, skillStore *harnesses.SkillStore) *HighValueIngestor {
	return &HighValueIngestor{
		dbPath:     dbPath,
		skillStore: skillStore,
	}
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

	// 1. If it's a Skill, save it natively
	var analysis struct {
		IsSkill      bool   `json:"isSkill"`
		SkillContent string `json:"skillContent"`
		Summary      string `json:"summary"`
	}
	if err := json.Unmarshal([]byte(resp.Content), &analysis); err == nil && analysis.IsSkill && analysis.SkillContent != "" {
		skillID := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
		err := i.skillStore.SaveSkill(skillID, title, desc, analysis.SkillContent)
		if err == nil {
			fmt.Printf("[Go HighValue] 🧠 Saved new native skill: %s\n", skillID)
		}
	}

	fmt.Printf("[Go HighValue] 🔍 Analysis complete for %s\n", url)
}
