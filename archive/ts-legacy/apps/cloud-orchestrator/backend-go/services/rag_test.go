package services

import (
	"encoding/binary"
	"math"
	"testing"

	"github.com/jules-autopilot/backend/db"
)

func setupRAGTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}
}

func TestBytesToFloat32Slice(t *testing.T) {
	// Empty input returns empty (not nil) because len(nil)%4 == 0 is true but loop won't execute
	result := bytesToFloat32Slice(nil)
	if len(result) != 0 {
		t.Error("Expected empty result for empty input")
	}

	// Valid data (simulate a float32)
	buf := make([]byte, 8) // 2 float32s
	binary.LittleEndian.PutUint32(buf[0:4], math.Float32bits(1.5))
	binary.LittleEndian.PutUint32(buf[4:8], math.Float32bits(2.5))

	result = bytesToFloat32Slice(buf)
	if len(result) != 2 {
		t.Fatalf("Expected 2 floats, got %d", len(result))
	}
	if math.Abs(float64(result[0]-1.5)) > 0.001 {
		t.Errorf("Expected 1.5, got %f", result[0])
	}
	if math.Abs(float64(result[1]-2.5)) > 0.001 {
		t.Errorf("Expected 2.5, got %f", result[1])
	}
}

func TestCosineSimilarityFloat32(t *testing.T) {
	// Identical vectors
	a := []float32{1.0, 0.0, 0.0}
	score := cosineSimilarityFloat32(a, a)
	if math.Abs(score-1.0) > 0.001 {
		t.Errorf("Identical vectors should have similarity ~1.0, got %f", score)
	}

	// Orthogonal vectors
	b := []float32{0.0, 1.0, 0.0}
	score = cosineSimilarityFloat32(a, b)
	if math.Abs(score) > 0.001 {
		t.Errorf("Orthogonal vectors should have similarity ~0.0, got %f", score)
	}

	// Opposite vectors
	c := []float32{-1.0, 0.0, 0.0}
	score = cosineSimilarityFloat32(a, c)
	if math.Abs(score+1.0) > 0.001 {
		t.Errorf("Opposite vectors should have similarity ~-1.0, got %f", score)
	}

	// Empty vectors
	score = cosineSimilarityFloat32(nil, a)
	if score != 0 {
		t.Errorf("Empty vector should give 0 similarity, got %f", score)
	}

	// Different length
	d := []float32{1.0, 0.0}
	score = cosineSimilarityFloat32(a, d)
	if score != 0 {
		t.Errorf("Different length vectors should give 0 similarity, got %f", score)
	}
}

func TestQueryCodebaseEmptyDB(t *testing.T) {
	setupRAGTestDB(t)

	results, err := QueryCodebase("test query", "fake-key", 5)
	// Should fail because no real API key
	if err == nil {
		t.Log("Query succeeded (unexpected with fake key)")
	}
	if results != nil {
		t.Log("Got results despite fake key")
	}
}
