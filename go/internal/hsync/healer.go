package hsync

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

type Diagnosis struct {
	ErrorType    string  `json:"errorType"`
	Description  string  `json:"description"`
	File         string  `json:"file,omitempty"`
	Line         int     `json:"line,omitempty"`
	SuggestedFix string  `json:"suggestedFix"`
	Confidence   float64 `json:"confidence"`
}

type HealResult struct {
	Success bool   `json:"success"`
	File    string `json:"file,omitempty"`
	Fix     string `json:"fix,omitempty"`
}

func DiagnoseError(ctx context.Context, errorStr, contextStr string) (*Diagnosis, error) {
	prompt := fmt.Sprintf(`You are The Healer, an expert debugging agent.
Analyze the following error and context.
Provide a diagnosis and a suggested fix.

Error:
%s

Context:
%s

Respond strictly in valid JSON format matching this schema:
{
  "errorType": "string",
  "description": "string",
  "file": "string (optional path)",
  "line": 0 (optional integer),
  "suggestedFix": "string",
  "confidence": 0.95
}`, errorStr, contextStr)

	resp, err := ai.AutoRouteWithModel(ctx, defaultOpenRouterFreeModel, []ai.Message{
		{Role: "system", Content: "You are a JSON-only debugging expert."},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, err
	}

	cleaned := strings.TrimSpace(resp.Content)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var diagnosis Diagnosis
	if err := json.Unmarshal([]byte(cleaned), &diagnosis); err != nil {
		return nil, err
	}

	return &diagnosis, nil
}

func AutoHeal(ctx context.Context, workspaceRoot string, errorLog string) (*HealResult, error) {
	diagnosis, err := DiagnoseError(ctx, errorLog, "")
	if err != nil {
		return &HealResult{Success: false}, err
	}

	if diagnosis.File == "" || diagnosis.SuggestedFix == "" {
		return &HealResult{Success: false}, nil
	}

	filePath := diagnosis.File
	if !filepath.IsAbs(filePath) {
		filePath = filepath.Join(workspaceRoot, filePath)
	}

	contentBytes, err := os.ReadFile(filePath)
	if err != nil {
		return &HealResult{Success: false}, nil
	}
	currentContent := string(contentBytes)

	prompt := fmt.Sprintf(`You are an Expert Linter and Fixer.
Original File Content:
%s

Diagnosis: %s
Suggested Fix: %s

Output the COMPLETE, CORRECTED file content. Do not include markdown fences.`, currentContent, diagnosis.Description, diagnosis.SuggestedFix)

	resp, err := ai.AutoRouteWithModel(ctx, defaultOpenRouterFreeModel, []ai.Message{
		{Role: "system", Content: "You are a code fixer. Output only the raw file content without formatting."},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return &HealResult{Success: false}, err
	}

	newContent := strings.TrimPrefix(resp.Content, "```typescript")
	newContent = strings.TrimPrefix(newContent, "```")
	newContent = strings.TrimSuffix(newContent, "```")
	newContent = strings.TrimSpace(newContent)

	if err := os.WriteFile(filePath, []byte(newContent), 0o644); err != nil {
		return &HealResult{Success: false}, err
	}

	return &HealResult{
		Success: true,
		File:    filePath,
		Fix:     diagnosis.SuggestedFix,
	}, nil
}
