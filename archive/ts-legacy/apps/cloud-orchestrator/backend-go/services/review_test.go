package services

import (
	"encoding/json"
	"testing"
)

func TestNormalizeReviewProviderInPackage(t *testing.T) {
	tests := []struct {
		name            string
		inputProvider   string
		inputAPIKey     string
		inputModel      string
		expectedProvider string
	}{
	{"anthropic alias", "anthropic", "", "claude-3", "anthropic"},
	{"openai alias", "openai", "", "gpt-4", "openai"},
	{"google alias", "google", "", "gemini-pro", "google"},
	{"gemini stays", "gemini", "", "gemini-pro", "gemini"},
	{"claude stays", "claude", "", "claude-3", "claude"},
	{"empty defaults to openai", "", "", "", "openai"},
	{"explicit api key", "openai", "sk-test-key", "gpt-4", "openai"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := ReviewRequest{
				Provider: tt.inputProvider,
				APIKey:   tt.inputAPIKey,
				Model:    tt.inputModel,
			}
			provider, apiKey, model := normalizeReviewProvider(req)

			if provider != tt.expectedProvider {
				t.Errorf("provider = %q, want %q", provider, tt.expectedProvider)
			}
			if tt.inputAPIKey != "" && apiKey != tt.inputAPIKey {
				t.Errorf("apiKey should preserve explicit key")
			}
			_ = model // model resolution depends on provider map
		})
	}
}

func TestRunCodeReviewEmptyContext(t *testing.T) {
	_, err := RunCodeReview(ReviewRequest{
		CodeContext: "",
	})
	if err == nil {
		t.Error("Expected error for empty code context")
	}
}

func TestRunCodeReviewWhitespaceContext(t *testing.T) {
	_, err := RunCodeReview(ReviewRequest{
		CodeContext: "   \t\n  ",
	})
	if err == nil {
		t.Error("Expected error for whitespace-only code context")
	}
}

func TestReviewResultJSON(t *testing.T) {
	result := ReviewResult{
		Summary: "Good code",
		Score:   85,
		Issues: []ReviewIssue{
			{
				Severity:    "medium",
				Category:    "Style",
				Description: "Variable naming",
				Suggestion:  "Use camelCase",
				Line:        10,
			},
		},
	}

	data, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var parsed ReviewResult
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}
	if parsed.Score != 85 {
		t.Errorf("Score = %d, want 85", parsed.Score)
	}
	if len(parsed.Issues) != 1 {
		t.Errorf("Issues count = %d, want 1", len(parsed.Issues))
	}
	if parsed.Issues[0].Severity != "medium" {
		t.Errorf("Issue severity = %q, want 'medium'", parsed.Issues[0].Severity)
	}
}

func TestReviewIssueFields(t *testing.T) {
	issue := ReviewIssue{
		Severity:    "high",
		Category:    "Security",
		File:        "auth.go",
		Line:        42,
		Description: "SQL injection risk",
		Suggestion:  "Use parameterized queries",
	}
	if issue.Severity != "high" {
		t.Errorf("Expected severity 'high'")
	}
	if issue.File != "auth.go" {
		t.Errorf("Expected file 'auth.go'")
	}
	if issue.Line != 42 {
		t.Errorf("Expected line 42")
	}
}

func TestReviewRequestDefaults(t *testing.T) {
	req := ReviewRequest{
		CodeContext: "func main() {}",
		Provider:    "openai",
	}
	if req.OutputFormat != "" {
		t.Error("Expected empty output format default")
	}
	if req.ReviewType != "" {
		t.Error("Expected empty review type default")
	}
}

func TestReviewPersonas(t *testing.T) {
	personas := []ReviewPersona{
		{Role: "Security Expert", Prompt: "Review for security"},
		{Role: "Performance Engineer", Prompt: "Review for perf"},
	}
	if len(personas) != 2 {
		t.Errorf("Expected 2 personas, got %d", len(personas))
	}
	if personas[0].Role != "Security Expert" {
		t.Errorf("Expected 'Security Expert', got '%s'", personas[0].Role)
	}
}
