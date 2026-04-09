package memorystore

/**
 * @file reactor.go
 * @module go/internal/memorystore
 *
 * WHAT: Go-native memory reactor for automatic context harvesting.
 * Watches for workspace events and updates the knowledge graph.
 *
 * WHY: Total Autonomy — The Go sidecar must be capable of maintaining its 
 * own semantic index of the workspace without relying on the Node control plane.
 */

import (
	"context"
	"fmt"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

type MemoryReactor struct {
	workspaceRoot string
}

func NewMemoryReactor(workspaceRoot string) *MemoryReactor {
	return &MemoryReactor{workspaceRoot: workspaceRoot}
}

func (r *MemoryReactor) HandleFileChange(ctx context.Context, path string, content string) error {
	fmt.Printf("[Go Memory] 📥 Harvesting context from: %s\n", path)

	// 1. Semantic Chunking (Simulated for now)
	chunks := r.chunkText(content)
	fmt.Printf("[Go Memory] 🧩 Created %d chunks from %s\n", len(chunks), path)

	// 2. Generate Summaries for High-Value chunks
	for i, chunk := range chunks {
		if len(chunk) > 500 {
			summary, err := r.summarizeChunk(ctx, chunk)
			if err == nil {
				fmt.Printf("[Go Memory] 📝 Chunk %d summary: %s\n", i, summary)
			}
		}
	}

	return nil
}

func (r *MemoryReactor) chunkText(text string) []string {
	// Simple paragraph-based chunking as a placeholder
	return strings.Split(text, "\n\n")
}

func (r *MemoryReactor) summarizeChunk(ctx context.Context, chunk string) (string, error) {
	prompt := fmt.Sprintf("Summarize this code/text chunk in one short sentence:\n\n%s", chunk)
	
	messages := []ai.Message{
		{Role: "user", Content: prompt},
	}

	resp, err := ai.AutoRouteWithModel(ctx, "gemini-2.5-flash", messages)
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(resp.Content), nil
}
