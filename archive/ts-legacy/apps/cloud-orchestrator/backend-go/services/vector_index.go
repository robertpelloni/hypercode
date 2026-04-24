package services

import (
	"math"
	"sort"
	"sync"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// VectorIndex provides fast approximate nearest neighbor search over embeddings.
// It pre-computes norms and uses dimensionality reduction for fast candidate pruning.
type VectorIndex struct {
	mu        sync.RWMutex
	entries   []indexEntry
	built     bool
	dimReduction int // Number of dimensions for coarse filtering (0 = disabled)
}

type indexEntry struct {
	ID         string
	Origin     string
	Filepath   string
	StartLine  int
	EndLine    int
	Content    string
	Vector     []float32
	Norm       float64 // Pre-computed L2 norm
	Reduced    []float32 // Dimensionality-reduced vector for coarse filter
}

var (
	globalVectorIndex *VectorIndex
	vecIndexOnce      sync.Once
)

// GetVectorIndex returns the singleton vector index
func GetVectorIndex() *VectorIndex {
	vecIndexOnce.Do(func() {
		globalVectorIndex = &VectorIndex{
			entries:    make([]indexEntry, 0),
			dimReduction: 64, // Reduce to 64 dims for coarse filter
		}
	})
	return globalVectorIndex
}

// Rebuild reconstructs the index from database chunks
func (vi *VectorIndex) Rebuild() error {
	vi.mu.Lock()
	defer vi.mu.Unlock()

	if db.DB == nil {
		return nil
	}

	var codeChunks []models.CodeChunk
	var memoryChunks []models.MemoryChunk
	db.DB.Find(&codeChunks)
	db.DB.Find(&memoryChunks)

	entries := make([]indexEntry, 0, len(codeChunks)+len(memoryChunks))

	for _, chunk := range codeChunks {
		if len(chunk.Embedding) == 0 {
			continue
		}
		vec := bytesToFloat32Slice(chunk.Embedding)
		entries = append(entries, indexEntry{
			ID:        chunk.ID,
			Origin:    "codebase",
			Filepath:  chunk.Filepath,
			StartLine: chunk.StartLine,
			EndLine:   chunk.EndLine,
			Content:   chunk.Content,
			Vector:    vec,
			Norm:      computeNorm(vec),
			Reduced:   reduceDimensions(vec, 64),
		})
	}

	for _, chunk := range memoryChunks {
		if len(chunk.Embedding) == 0 {
			continue
		}
		vec := bytesToFloat32Slice(chunk.Embedding)
		entries = append(entries, indexEntry{
			ID:      chunk.ID,
			Origin:  "history",
			Content: chunk.Content,
			Vector:  vec,
			Norm:    computeNorm(vec),
			Reduced: reduceDimensions(vec, 64),
		})
	}

	vi.entries = entries
	vi.built = true
	return nil
}

// Search performs fast approximate nearest neighbor search
// Uses two-phase approach:
//   1. Coarse filter using reduced-dimension dot products (fast rejection)
//   2. Full cosine similarity on candidates only
func (vi *VectorIndex) Search(query []float32, topK int) []RAGQueryResult {
	vi.mu.RLock()
	defer vi.mu.RUnlock()

	if !vi.built || len(vi.entries) == 0 {
		return nil
	}

	if topK <= 0 {
		topK = 5
	}

	queryNorm := computeNorm(query)
	if queryNorm == 0 {
		return nil
	}

	queryReduced := reduceDimensions(query, vi.dimReduction)

	// Phase 1: Coarse filter - compute reduced-dimension dot products
	// Take 3x topK candidates for phase 2
	candidateCount := topK * 3
	if candidateCount > len(vi.entries) {
		candidateCount = len(vi.entries)
	}

	type candidate struct {
		idx         int
		coarseScore float64
	}

	candidates := make([]candidate, 0, len(vi.entries))
	for i, entry := range vi.entries {
		if entry.Norm == 0 || len(entry.Reduced) == 0 {
			continue
		}
		// Fast reduced-dimension dot product
		var coarseDot float64
		minLen := min(len(queryReduced), len(entry.Reduced))
		for j := 0; j < minLen; j++ {
			coarseDot += float64(queryReduced[j]) * float64(entry.Reduced[j])
		}
		candidates = append(candidates, candidate{idx: i, coarseScore: coarseDot})
	}

	// Sort by coarse score descending, take top candidates
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].coarseScore > candidates[j].coarseScore
	})

	if len(candidates) > candidateCount {
		candidates = candidates[:candidateCount]
	}

	// Phase 2: Full cosine similarity on candidates
	results := make([]RAGQueryResult, 0, len(candidates))
	for _, c := range candidates {
		entry := vi.entries[c.idx]
		score := cosineSimilarityFast(query, entry.Vector, queryNorm, entry.Norm)
		results = append(results, RAGQueryResult{
			Filepath:  entry.Filepath,
			StartLine: entry.StartLine,
			EndLine:   entry.EndLine,
			Content:   entry.Content,
			Score:     score,
			Origin:    entry.Origin,
		})
	}

	// Final sort by actual score
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	if len(results) > topK {
		results = results[:topK]
	}

	return results
}

// Size returns the number of indexed vectors
func (vi *VectorIndex) Size() int {
	vi.mu.RLock()
	defer vi.mu.RUnlock()
	return len(vi.entries)
}

// IsBuilt returns whether the index has been built
func (vi *VectorIndex) IsBuilt() bool {
	vi.mu.RLock()
	defer vi.mu.RUnlock()
	return vi.built
}

// Stats returns index statistics
func (vi *VectorIndex) Stats() map[string]interface{} {
	vi.mu.RLock()
	defer vi.mu.RUnlock()

	codeCount := 0
	historyCount := 0
	totalDims := 0
	for _, e := range vi.entries {
		if e.Origin == "codebase" {
			codeCount++
		} else {
			historyCount++
		}
		if len(e.Vector) > totalDims {
			totalDims = len(e.Vector)
		}
	}

	return map[string]interface{}{
		"built":          vi.built,
		"totalVectors":   len(vi.entries),
		"codebaseChunks": codeCount,
		"historyChunks":  historyCount,
		"dimensions":     totalDims,
		"reductionDims":  vi.dimReduction,
		"phase":          "coarse_filter + full_cosine",
	}
}

// computeNorm calculates the L2 norm of a vector
func computeNorm(v []float32) float64 {
	var sum float64
	for _, x := range v {
		sum += float64(x) * float64(x)
	}
	return math.Sqrt(sum)
}

// cosineSimilarityFast computes cosine similarity using pre-computed norms
func cosineSimilarityFast(a, b []float32, normA, normB float64) float64 {
	if normA == 0 || normB == 0 || len(a) != len(b) {
		return 0
	}
	var dot float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
	}
	return dot / (normA * normB)
}

// reduceDimensions performs simple dimensionality reduction by averaging blocks
func reduceDimensions(v []float32, targetDims int) []float32 {
	if targetDims <= 0 || len(v) <= targetDims {
		return v
	}

	result := make([]float32, targetDims)
	blockSize := float64(len(v)) / float64(targetDims)

	for i := 0; i < targetDims; i++ {
		start := int(float64(i) * blockSize)
		end := int(float64(i+1) * blockSize)
		if end > len(v) {
			end = len(v)
		}
		if start >= end {
			continue
		}
		var sum float32
		for _, x := range v[start:end] {
			sum += x
		}
		result[i] = sum / float32(end-start)
	}

	return result
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
