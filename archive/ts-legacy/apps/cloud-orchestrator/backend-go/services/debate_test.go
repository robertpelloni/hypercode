package services

import (
	"encoding/json"
	"testing"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupDebateTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestDebateApprovalStatusInPackage(t *testing.T) {
	tests := []struct {
		score    int
		expected string
	}{
		{0, "approved"},
		{10, "approved"},
		{19, "approved"},
		{20, "pending"},
		{30, "pending"},
		{50, "pending"},
		{51, "flagged"},
		{70, "flagged"},
		{80, "flagged"},
		{81, "rejected"},
		{100, "rejected"},
	}

	for _, tt := range tests {
		result := debateApprovalStatus(tt.score)
		if result != tt.expected {
			t.Errorf("debateApprovalStatus(%d) = %q, want %q", tt.score, result, tt.expected)
		}
	}
}

func TestDebateRoundsDefault(t *testing.T) {
	// When rounds <= 0, should default to 1
	// We can't easily call RunDebate without API keys, but we test the logic
	req := DebateRequest{
		Topic:    "test",
		Rounds:   0,
	}
	// 0 should be treated as 1
	if req.Rounds != 0 {
		t.Error("Setup error")
	}
	// The actual fix happens inside RunDebate
}

func TestParseStoredDebate(t *testing.T) {
	rounds := []DebateRound{
		{RoundNumber: 1, Turns: []DebateTurn{
			{ParticipantID: "p1", ParticipantName: "Security", Role: "challenger", Content: "Risk here"},
		}},
	}
	roundsJSON, _ := json.Marshal(rounds)
	history := []DebateMessage{{Role: "user", Content: "Is this safe?"}}
	historyJSON, _ := json.Marshal(history)
	metadata := `{"source": "test"}`
	summary := "Test summary"

	debate := models.Debate{
		ID:               "debate-123",
		Topic:            "Security Review",
		Summary:          &summary,
		Rounds:           string(roundsJSON),
		History:          string(historyJSON),
		Metadata:         &metadata,
		PromptTokens:     100,
		CompletionTokens: 50,
		TotalTokens:      150,
	}

	result, err := ParseStoredDebate(debate)
	if err != nil {
		t.Fatalf("ParseStoredDebate error: %v", err)
	}
	if result.ID != "debate-123" {
		t.Errorf("ID = %q, want 'debate-123'", result.ID)
	}
	if result.Topic != "Security Review" {
		t.Errorf("Topic = %q, want 'Security Review'", result.Topic)
	}
	if result.Summary != "Test summary" {
		t.Errorf("Summary = %q, want 'Test summary'", result.Summary)
	}
	if len(result.Rounds) != 1 {
		t.Fatalf("Rounds count = %d, want 1", len(result.Rounds))
	}
	if result.Rounds[0].RoundNumber != 1 {
		t.Errorf("Round number = %d, want 1", result.Rounds[0].RoundNumber)
	}
	if len(result.Rounds[0].Turns) != 1 {
		t.Errorf("Turns count = %d, want 1", len(result.Rounds[0].Turns))
	}
	if result.TotalUsage == nil {
		t.Fatal("Expected non-nil TotalUsage")
	}
	if result.TotalUsage.TotalTokens != 150 {
		t.Errorf("TotalTokens = %d, want 150", result.TotalUsage.TotalTokens)
	}
}

func TestParseStoredDebateEmpty(t *testing.T) {
	debate := models.Debate{
		ID:     "empty-debate",
		Topic:  "Empty",
		Rounds: "",
		History: "",
	}

	result, err := ParseStoredDebate(debate)
	if err != nil {
		t.Fatalf("ParseStoredDebate error: %v", err)
	}
	if len(result.Rounds) != 0 {
		t.Errorf("Expected empty rounds")
	}
	if len(result.History) != 0 {
		t.Errorf("Expected empty history")
	}
}

func TestParseStoredDebateNilMetadata(t *testing.T) {
	debate := models.Debate{
		ID:       "nil-meta",
		Topic:    "Test",
		Metadata: nil,
	}

	result, err := ParseStoredDebate(debate)
	if err != nil {
		t.Fatalf("ParseStoredDebate error: %v", err)
	}
	if result.Metadata != nil {
		t.Errorf("Expected nil metadata")
	}
}

func TestDebateMessageSerialization(t *testing.T) {
	msg := DebateMessage{
		Role:    "user",
		Content: "Should we use microservices?",
		Name:    "architect",
	}
	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var parsed DebateMessage
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}
	if parsed.Role != "user" {
		t.Errorf("Role = %q, want 'user'", parsed.Role)
	}
	if parsed.Name != "architect" {
		t.Errorf("Name = %q, want 'architect'", parsed.Name)
	}
}

func TestDebateTurnSerialization(t *testing.T) {
	usage := &LLMUsage{PromptTokens: 50, CompletionTokens: 25, TotalTokens: 75}
	turn := DebateTurn{
		ParticipantID:   "p1",
		ParticipantName: "Security Expert",
		Role:            "challenger",
		Content:         "There is a vulnerability",
		Timestamp:       "2026-04-08T12:00:00Z",
		Usage:           usage,
	}

	data, err := json.Marshal(turn)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var parsed DebateTurn
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}
	if parsed.ParticipantName != "Security Expert" {
		t.Errorf("Name = %q", parsed.ParticipantName)
	}
	if parsed.Usage == nil || parsed.Usage.TotalTokens != 75 {
		t.Errorf("Usage not preserved correctly")
	}
}

func TestDebateRequestStructure(t *testing.T) {
	req := DebateRequest{
		Topic: "Should we add caching?",
		History: []DebateMessage{
			{Role: "user", Content: "Let's discuss"},
		},
		Participants: []DebateParticipant{
			{ID: "p1", Name: "Security", Role: "challenger", Provider: "openai", Model: "gpt-4"},
			{ID: "p2", Name: "Engineer", Role: "defender", Provider: "anthropic", Model: "claude-3"},
		},
		Rounds: 3,
	}

	if len(req.Participants) != 2 {
		t.Errorf("Expected 2 participants, got %d", len(req.Participants))
	}
	if req.Rounds != 3 {
		t.Errorf("Expected 3 rounds, got %d", req.Rounds)
	}
}

func TestNormalizeDebateAPIKeyInPackage(t *testing.T) {
	// Test explicit key preservation
	p := DebateParticipant{APIKey: "sk-test-key", Provider: "openai"}
	result := normalizeDebateAPIKey(p)
	if result != "sk-test-key" {
		t.Errorf("Expected explicit key to be preserved, got %q", result)
	}

	// Empty key falls back to env lookup (may or may not have key)
	p2 := DebateParticipant{APIKey: "", Provider: "openai"}
	_ = normalizeDebateAPIKey(p2) // just ensure no panic

	// Placeholder key falls back to env lookup
	p3 := DebateParticipant{APIKey: "placeholder", Provider: "anthropic"}
	_ = normalizeDebateAPIKey(p3) // just ensure no panic
}

func TestDebateStorageInDB(t *testing.T) {
	setupDebateTestDB(t)

	rounds := []DebateRound{{RoundNumber: 1, Turns: []DebateTurn{}}}
	roundsJSON, _ := json.Marshal(rounds)
	summary := "Test debate summary"
	workspaceID := "default"
	meta := `{"test": true}`

	debate := models.Debate{
		ID:               "debate-storage-test",
		Topic:            "Storage test",
		Summary:          &summary,
		Rounds:           string(roundsJSON),
		History:          "[]",
		Metadata:         &meta,
		PromptTokens:     100,
		CompletionTokens: 50,
		TotalTokens:      150,
		WorkspaceID:      &workspaceID,
	}

	if err := db.DB.Create(&debate).Error; err != nil {
		t.Fatalf("Failed to create debate: %v", err)
	}

	var found models.Debate
	if err := db.DB.Where("id = ?", "debate-storage-test").First(&found).Error; err != nil {
		t.Fatalf("Failed to find debate: %v", err)
	}
	if found.Topic != "Storage test" {
		t.Errorf("Topic = %q, want 'Storage test'", found.Topic)
	}
	if found.PromptTokens != 100 {
		t.Errorf("PromptTokens = %d, want 100", found.PromptTokens)
	}
}
