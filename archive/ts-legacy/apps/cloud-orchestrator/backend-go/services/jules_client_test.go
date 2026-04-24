package services

import (
	"testing"
)

func TestNormalizeGitHubRepo(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		hasError bool
	}{
		{"simple owner/repo", "owner/repo", "owner/repo", false},
		{"sources/github prefix", "sources/github/owner/repo", "owner/repo", false},
		{"github prefix", "github/owner/repo", "owner/repo", false},
		{"invalid - no slash", "invalid", "", true},
		{"empty", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := normalizeGitHubRepo(tt.input)
			if tt.hasError {
				if err == nil {
					t.Errorf("Expected error for input %q", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error for input %q: %v", tt.input, err)
				}
				if result != tt.expected {
					t.Errorf("normalizeGitHubRepo(%q) = %q, want %q", tt.input, result, tt.expected)
				}
			}
		})
	}
}

func TestNormalizeSourceForCreate(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"already has sources prefix", "sources/github/owner/repo", "sources/github/owner/repo"},
		{"simple owner/repo", "owner/repo", "sources/github/owner/repo"},
		{"leading slash", "/owner/repo", "sources/github/owner/repo"},
		{"empty", "", "sources/github/"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeSourceForCreate(tt.input)
			if result != tt.expected {
				t.Errorf("normalizeSourceForCreate(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestMapStateValues(t *testing.T) {
	// Test known mappings
	if mapState("COMPLETED") != "completed" {
		t.Errorf("COMPLETED should map to 'completed', got %q", mapState("COMPLETED"))
	}
	if mapState("FAILED") != "failed" {
		t.Errorf("FAILED should map to 'failed', got %q", mapState("FAILED"))
	}
	if mapState("ACTIVE") != "active" {
		t.Errorf("ACTIVE should map to 'active', got %q", mapState("ACTIVE"))
	}
	if mapState("PLANNING") != "active" {
		t.Errorf("PLANNING should map to 'active', got %q", mapState("PLANNING"))
	}
	if mapState("AWAITING_PLAN_APPROVAL") != "awaiting_approval" {
		t.Errorf("AWAITING_PLAN_APPROVAL should map to 'awaiting_approval', got %q", mapState("AWAITING_PLAN_APPROVAL"))
	}
	if mapState("PAUSED") != "paused" {
		t.Errorf("PAUSED should map to 'paused', got %q", mapState("PAUSED"))
	}
	// Unknown states default to active
	if mapState("UNKNOWN_STATE") != "active" {
		t.Errorf("UNKNOWN_STATE should default to 'active', got %q", mapState("UNKNOWN_STATE"))
	}
}

func TestNewJulesClient(t *testing.T) {
	client := NewJulesClient()
	if client == nil {
		t.Fatal("Expected non-nil client")
	}
}

func TestNewJulesClientWithExplicitKey(t *testing.T) {
	client := NewJulesClient("test-key")
	if client == nil {
		t.Fatal("Expected non-nil client")
	}
}

func TestJulesClientIsConfigured(t *testing.T) {
	client := NewJulesClient()
	_ = client.isConfigured() // Just verify no panic
}

func TestJulesClientWithExplicitKey(t *testing.T) {
	client := NewJulesClient("explicit-test-key")
	if !client.isConfigured() {
		t.Error("Expected client with explicit key to be configured")
	}
}
