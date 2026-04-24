package services

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type RAGQueryResult struct {
	Filepath  string  `json:"filepath"`
	StartLine int     `json:"startLine"`
	EndLine   int     `json:"endLine"`
	Content   string  `json:"content"`
	Score     float64 `json:"score"`
	Origin    string  `json:"origin"`
}

func bytesToFloat32Slice(data []byte) []float32 {
	if len(data)%4 != 0 {
		return nil
	}
	result := make([]float32, 0, len(data)/4)
	for i := 0; i < len(data); i += 4 {
		bits := binary.LittleEndian.Uint32(data[i : i+4])
		result = append(result, math.Float32frombits(bits))
	}
	return result
}

func cosineSimilarityFloat32(a, b []float32) float64 {
	if len(a) == 0 || len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float64
	for i := range a {
		av := float64(a[i])
		bv := float64(b[i])
		dotProduct += av * bv
		normA += av * av
		normB += bv * bv
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

func fetchQueryEmbedding(query, apiKey string) ([]float32, error) {
	payload, _ := json.Marshal(map[string]string{
		"input": query,
		"model": "text-embedding-3-small",
	})

	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/embeddings", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("failed to generate embedding for query (status %d)", resp.StatusCode)
	}

	var body struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	if len(body.Data) == 0 {
		return nil, fmt.Errorf("embedding response contained no vectors")
	}

	result := make([]float32, 0, len(body.Data[0].Embedding))
	for _, value := range body.Data[0].Embedding {
		result = append(result, float32(value))
	}
	return result, nil
}

func QueryCodebase(query, apiKey string, topK int) ([]RAGQueryResult, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("API key required for RAG querying")
	}
	if topK <= 0 {
		topK = 5
	}

	queryEmbedding, err := fetchQueryEmbedding(query, apiKey)
	if err != nil {
		return nil, err
	}

	// Try vector index first (optimized path)
	index := GetVectorIndex()
	if index.IsBuilt() && index.Size() > 0 {
		results := index.Search(queryEmbedding, topK)
		if len(results) > 0 {
			return results, nil
		}
	}

	// Fallback: rebuild index and search
	if err := index.Rebuild(); err == nil {
		results := index.Search(queryEmbedding, topK)
		if len(results) > 0 {
			return results, nil
		}
	}

	// Final fallback: brute force scan
	return queryCodebaseBruteForce(queryEmbedding, topK)
}

func queryCodebaseBruteForce(queryEmbedding []float32, topK int) ([]RAGQueryResult, error) {

	var codeChunks []models.CodeChunk
	var memoryChunks []models.MemoryChunk
	if err := db.DB.Find(&codeChunks).Error; err != nil {
		return nil, err
	}
	if err := db.DB.Find(&memoryChunks).Error; err != nil {
		return nil, err
	}

	results := make([]RAGQueryResult, 0, len(codeChunks)+len(memoryChunks))
	for _, chunk := range codeChunks {
		if len(chunk.Embedding) == 0 {
			continue
		}
		chunkEmbedding := bytesToFloat32Slice(chunk.Embedding)
		results = append(results, RAGQueryResult{
			Filepath:  chunk.Filepath,
			StartLine: chunk.StartLine,
			EndLine:   chunk.EndLine,
			Content:   chunk.Content,
			Score:     cosineSimilarityFloat32(queryEmbedding, chunkEmbedding),
			Origin:    "codebase",
		})
	}

	for _, chunk := range memoryChunks {
		if len(chunk.Embedding) == 0 {
			continue
		}
		chunkEmbedding := bytesToFloat32Slice(chunk.Embedding)
		results = append(results, RAGQueryResult{
			Filepath:  fmt.Sprintf("session:%s", chunk.SessionID),
			StartLine: 0,
			EndLine:   0,
			Content:   chunk.Content,
			Score:     cosineSimilarityFloat32(queryEmbedding, chunkEmbedding),
			Origin:    "history",
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	if len(results) > topK {
		results = results[:topK]
	}
	return results, nil
}
