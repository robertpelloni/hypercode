// Package healer provides self-healing diagnosis and auto-fix capabilities
// ported from packages/core/src/services/HealerService.ts.
//
// It uses an LLM to analyze errors, diagnose root causes, and generate fixes.
// Supports: error analysis, fix generation, auto-heal, and heal history.
package healer

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

// Diagnosis represents an LLM-generated diagnosis of an error.
type Diagnosis struct {
	ErrorType    string  `json:"errorType"`
	Description  string  `json:"description"`
	File         string  `json:"file,omitempty"`
	Line         int     `json:"line,omitempty"`
	SuggestedFix string  `json:"suggestedFix"`
	Confidence   float64 `json:"confidence"`
}

// FixPlan represents a plan to fix a diagnosed error.
type FixPlan struct {
	ID           string              `json:"id"`
	Diagnosis    Diagnosis           `json:"diagnosis"`
	FilesToModify []FileModification `json:"filesToModify"`
	Explanation  string              `json:"explanation"`
}

// FileModification represents a file to be modified by a fix.
type FileModification struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// HealRecord tracks a single heal attempt.
type HealRecord struct {
	Timestamp int64    `json:"timestamp"`
	Error     string   `json:"error"`
	Fix       FixPlan  `json:"fix"`
	Success   bool     `json:"success"`
}

// HealerService provides self-healing capabilities.
type HealerService struct {
	mu       sync.RWMutex
	history  []HealRecord
	provider ai.Provider
	model    string
	onHeal   func(HealRecord)
}

// NewHealerService creates a new healer with the given LLM provider.
// If provider is nil, auto-heal will be degraded (diagnosis only).
func NewHealerService(provider ai.Provider, model string) *HealerService {
	if model == "" {
		model = "openrouter/auto"
	}
	return &HealerService{
		provider: provider,
		model:    model,
	}
}

// OnHeal registers a callback for heal events.
func (hs *HealerService) OnHeal(fn func(HealRecord)) {
	hs.onHeal = fn
}

// AnalyzeError uses an LLM to diagnose an error.
func (hs *HealerService) AnalyzeError(ctx context.Context, errorStr string, contextStr string) (*Diagnosis, error) {
	if contextStr == "" {
		contextStr = "No additional context."
	}

	prompt := fmt.Sprintf(`You are The Healer, an expert debugging agent.
Analyze the following error and context.
Provide a diagnosis and a suggested fix.

Error:
%s

Context:
%s

Return JSON format:
{
    "errorType": "SyntaxError|RuntimeError|LogicError|...",
    "description": "Short explanation",
    "file": "path/to/culprit.ts (if known)",
    "line": 123 (if known),
    "suggestedFix": "Code snippet or description of fix",
    "confidence": 0.0 to 1.0
}`, errorStr, contextStr)

	if hs.provider == nil {
		return &Diagnosis{
			ErrorType:    "Unknown",
			Description:  errorStr,
			SuggestedFix: "Manual review required (no LLM provider)",
			Confidence:   0,
		}, nil
	}

	resp, err := hs.provider.GenerateText(ctx, hs.model, []ai.Message{
		{Role: "system", Content: "You are a JSON-only debugging tool."},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, fmt.Errorf("LLM diagnosis failed: %w", err)
	}

	var diag Diagnosis
	text := extractJSON(resp.Content)
	if err := json.Unmarshal([]byte(text), &diag); err != nil {
		return &Diagnosis{
			ErrorType:    "Unknown",
			Description:  "Failed to parse LLM diagnosis",
			SuggestedFix: "Manual review required",
			Confidence:   0,
		}, nil
	}

	return &diag, nil
}

// GenerateFix creates a fix plan for the given diagnosis.
func (hs *HealerService) GenerateFix(ctx context.Context, diag *Diagnosis) (*FixPlan, error) {
	if diag.File == "" {
		return nil, fmt.Errorf("cannot generate fix without file path")
	}

	// Read file content
	content, err := os.ReadFile(diag.File)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", diag.File, err)
	}

	if hs.provider == nil {
		return &FixPlan{
			ID:        fmt.Sprintf("fix_%d", time.Now().UnixMilli()),
			Diagnosis: *diag,
			Explanation: "No LLM provider available for fix generation",
		}, nil
	}

	prompt := fmt.Sprintf(`You are The Healer.
Generate a fix for the following file based on the diagnosis.

Diagnosis: %s
Suggested Fix: %s

File Content:
%s

Return JSON format:
{
    "explanation": "Why this fix works",
    "newContent": "The entire new file content"
}`, diag.Description, diag.SuggestedFix, string(content))

	resp, err := hs.provider.GenerateText(ctx, hs.model, []ai.Message{
		{Role: "system", Content: "You are a code repair agent. Return only JSON with 'explanation' and 'newContent'."},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, fmt.Errorf("LLM fix generation failed: %w", err)
	}

	var result struct {
		Explanation string `json:"explanation"`
		NewContent  string `json:"newContent"`
	}
	text := extractJSON(resp.Content)
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("failed to parse fix plan")
	}

	return &FixPlan{
		ID:        fmt.Sprintf("fix_%d", time.Now().UnixMilli()),
		Diagnosis: *diag,
		FilesToModify: []FileModification{
			{Path: diag.File, Content: result.NewContent},
		},
		Explanation: result.Explanation,
	}, nil
}

// ApplyFix writes the fix plan's files to disk.
func (hs *HealerService) ApplyFix(plan *FixPlan) error {
	for _, fm := range plan.FilesToModify {
		dir := filepath.Dir(fm.Path)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
		if err := os.WriteFile(fm.Path, []byte(fm.Content), 0644); err != nil {
			return fmt.Errorf("failed to write file %s: %w", fm.Path, err)
		}
	}
	return nil
}

// Heal performs a full heal cycle: diagnose → generate fix → apply.
func (hs *HealerService) Heal(ctx context.Context, errorStr string, contextStr string) (bool, error) {
	diag, err := hs.AnalyzeError(ctx, errorStr, contextStr)
	if err != nil {
		return false, err
	}

	if diag.Confidence < 0.8 {
		return false, fmt.Errorf("confidence too low for auto-heal (%.2f)", diag.Confidence)
	}

	if diag.File == "" {
		return false, fmt.Errorf("no file identified to fix")
	}

	plan, err := hs.GenerateFix(ctx, diag)
	if err != nil {
		return false, err
	}

	if err := hs.ApplyFix(plan); err != nil {
		hs.recordHeal(errorStr, *plan, false)
		return false, err
	}

	hs.recordHeal(errorStr, *plan, true)
	return true, nil
}

// AutoHeal performs a one-shot auto-heal on an error log string.
func (hs *HealerService) AutoHeal(ctx context.Context, errorLog string) (*HealResult, error) {
	diag, err := hs.AnalyzeError(ctx, errorLog, "")
	if err != nil {
		return nil, err
	}

	if diag.File == "" || diag.SuggestedFix == "" {
		return &HealResult{Success: false, Diagnosis: diag}, nil
	}

	// Resolve file path
	filePath := diag.File
	if !filepath.IsAbs(filePath) {
		if cwd, err := os.Getwd(); err == nil {
			filePath = filepath.Join(cwd, filePath)
		}
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return &HealResult{Success: false, Diagnosis: diag, File: filePath}, nil
	}

	diag.File = filePath
	plan, err := hs.GenerateFix(ctx, diag)
	if err != nil {
		return nil, err
	}

	if err := hs.ApplyFix(plan); err != nil {
		hs.recordHeal(errorLog, *plan, false)
		return &HealResult{Success: false, File: filePath, Fix: diag.SuggestedFix}, err
	}

	hs.recordHeal(errorLog, *plan, true)
	return &HealResult{Success: true, File: filePath, Fix: diag.SuggestedFix}, nil
}

// HealResult is the result of an auto-heal attempt.
type HealResult struct {
	Success    bool       `json:"success"`
	File       string     `json:"file,omitempty"`
	Fix        string     `json:"fix,omitempty"`
	Diagnosis  *Diagnosis `json:"diagnosis,omitempty"`
}

// GetHistory returns all heal records.
func (hs *HealerService) GetHistory() []HealRecord {
	hs.mu.RLock()
	defer hs.mu.RUnlock()
	result := make([]HealRecord, len(hs.history))
	copy(result, hs.history)
	return result
}

func (hs *HealerService) recordHeal(errorStr string, plan FixPlan, success bool) {
	record := HealRecord{
		Timestamp: time.Now().UnixMilli(),
		Error:     errorStr,
		Fix:       plan,
		Success:   success,
	}

	hs.mu.Lock()
	hs.history = append(hs.history, record)
	hs.mu.Unlock()

	if hs.onHeal != nil {
		hs.onHeal(record)
	}
}

// --- helpers ---

var jsonBlockRe = regexp.MustCompile("(?s)```(?:json)?\\s*?(.*?)\\s*?```")

// extractJSON extracts a JSON object from text, handling markdown fences.
func extractJSON(text string) string {
	// Try fenced code block first
	if match := jsonBlockRe.FindStringSubmatch(text); len(match) > 1 {
		return strings.TrimSpace(match[1])
	}

	// Try finding raw braces
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start >= 0 && end > start {
		return strings.TrimSpace(text[start : end+1])
	}

	return strings.TrimSpace(text)
}
