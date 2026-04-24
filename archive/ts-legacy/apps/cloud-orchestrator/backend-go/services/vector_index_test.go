package services

import (
	"testing"
)

func TestComputeNorm(t *testing.T) {
	tests := []struct {
		vec  []float32
		want float64
	}{
		{[]float32{3, 4}, 5},
		{[]float32{1, 0, 0}, 1},
		{[]float32{0, 0, 0}, 0},
		{[]float32{1, 1, 1}, 1.7320508075688772},
		{[]float32{}, 0},
		{nil, 0},
	}

	for _, tt := range tests {
		got := computeNorm(tt.vec)
		if tt.want > 0 && (got < tt.want-0.001 || got > tt.want+0.001) {
			t.Errorf("computeNorm(%v) = %f, want %f", tt.vec, got, tt.want)
		}
	}
}

func TestCosineSimilarityFast(t *testing.T) {
	tests := []struct {
		name  string
		a, b  []float32
		nA, nB float64
		want  float64
	}{
		{"identical", []float32{1, 0, 0}, []float32{1, 0, 0}, 1, 1, 1},
		{"orthogonal", []float32{1, 0, 0}, []float32{0, 1, 0}, 1, 1, 0},
		{"opposite", []float32{1, 0, 0}, []float32{-1, 0, 0}, 1, 1, -1},
		{"zero norm", []float32{1, 0}, []float32{0, 0}, 1, 0, 0},
		{"different lengths", []float32{1, 0}, []float32{1}, 1, 1, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := cosineSimilarityFast(tt.a, tt.b, tt.nA, tt.nB)
			if got < tt.want-0.001 || got > tt.want+0.001 {
				t.Errorf("cosineSimilarityFast() = %f, want %f", got, tt.want)
			}
		})
	}
}

func TestReduceDimensions(t *testing.T) {
	vec := []float32{1, 2, 3, 4, 5, 6, 7, 8}

	reduced := reduceDimensions(vec, 4)
	if len(reduced) != 4 {
		t.Errorf("len(reduced) = %d, want 4", len(reduced))
	}

	// When target >= len, return original
	same := reduceDimensions(vec, 10)
	if len(same) != len(vec) {
		t.Error("Expected original vector when target >= len")
	}

	// Zero dims returns original
	same2 := reduceDimensions(vec, 0)
	if len(same2) != len(vec) {
		t.Error("Expected original for targetDims=0")
	}
}

func TestReduceDimensionsUniform(t *testing.T) {
	// Uniform vector should reduce to uniform
	vec := []float32{2, 2, 2, 2, 2, 2}
	reduced := reduceDimensions(vec, 2)
	for _, v := range reduced {
		if v < 1.9 || v > 2.1 {
			t.Errorf("Expected ~2.0 in reduced uniform vector, got %f", v)
		}
	}
}

func TestGetVectorIndex(t *testing.T) {
	idx := GetVectorIndex()
	if idx == nil {
		t.Fatal("Expected non-nil index")
	}
	idx2 := GetVectorIndex()
	if idx != idx2 {
		t.Error("Expected singleton")
	}
}

func TestVectorIndexStatsEmpty(t *testing.T) {
	idx := GetVectorIndex()
	stats := idx.Stats()
	if stats["built"] != false {
		t.Error("Expected not built initially")
	}
	if stats["totalVectors"] != 0 {
		t.Error("Expected 0 vectors")
	}
}

func TestVectorIndexSizeEmpty(t *testing.T) {
	idx := GetVectorIndex()
	if idx.Size() != 0 {
		t.Error("Expected size 0")
	}
}

func TestVectorIndexSearchEmpty(t *testing.T) {
	idx := GetVectorIndex()
	results := idx.Search([]float32{1, 0, 0}, 5)
	if results != nil {
		t.Error("Expected nil results from empty index")
	}
}

func TestVectorIndexSearchNotBuilt(t *testing.T) {
	idx := GetVectorIndex()
	results := idx.Search(nil, 5)
	if results != nil {
		t.Error("Expected nil results from unbuilt index")
	}
}

func TestMinFunc(t *testing.T) {
	if min(3, 5) != 3 {
		t.Error("min(3,5) should be 3")
	}
	if min(5, 3) != 3 {
		t.Error("min(5,3) should be 3")
	}
	if min(3, 3) != 3 {
		t.Error("min(3,3) should be 3")
	}
}
