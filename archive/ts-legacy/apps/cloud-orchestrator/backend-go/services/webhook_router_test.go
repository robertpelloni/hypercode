package services

import (
	"testing"

	"github.com/jules-autopilot/backend/db"
)

func setupWebhookTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}
}

func TestProcessWebhookLog(t *testing.T) {
	setupWebhookTestDB(t)

	event := WebhookEvent{
		Provider:  WebhookProviderBorg,
		EventType: "signal",
		RawBody:   map[string]interface{}{"key": "value"},
	}

	err := ProcessWebhook(event)
	if err != nil {
		t.Fatalf("ProcessWebhook error: %v", err)
	}
}

func TestProcessWebhookEnqueue(t *testing.T) {
	setupWebhookTestDB(t)

	// Add an enqueue rule
	AddWebhookRule(WebhookRule{
		Name:        "test enqueue",
		Provider:    WebhookProviderGitHub,
		EventFilter: "push",
		Action:      "enqueue",
		JobType:     "index_codebase",
		IsEnabled:   true,
	})

	event := WebhookEvent{
		Provider:  WebhookProviderGitHub,
		EventType: "push",
		RawBody:   map[string]interface{}{"ref": "refs/heads/main"},
	}

	err := ProcessWebhook(event)
	if err != nil {
		t.Fatalf("ProcessWebhook error: %v", err)
	}
}

func TestProcessWebhookNotify(t *testing.T) {
	setupWebhookTestDB(t)

	AddWebhookRule(WebhookRule{
		Name:      "test notify",
		Provider:  WebhookProviderSlack,
		Action:    "notify",
		IsEnabled: true,
	})

	event := WebhookEvent{
		Provider:  WebhookProviderSlack,
		EventType: "message",
		RawBody:   map[string]interface{}{"text": "hello"},
	}

	err := ProcessWebhook(event)
	if err != nil {
		t.Fatalf("ProcessWebhook error: %v", err)
	}
}

func TestGetWebhookRules(t *testing.T) {
	rules := GetWebhookRules()
	if len(rules) < 2 {
		t.Errorf("Expected at least 2 default rules, got %d", len(rules))
	}
}

func TestAddWebhookRule(t *testing.T) {
	initialCount := len(GetWebhookRules())

	err := AddWebhookRule(WebhookRule{
		Name:      "test rule",
		Provider:  WebhookProviderGeneric,
		Action:    "log",
		IsEnabled: true,
	})
	if err != nil {
		t.Fatalf("AddWebhookRule error: %v", err)
	}

	rules := GetWebhookRules()
	if len(rules) != initialCount+1 {
		t.Errorf("Expected %d rules, got %d", initialCount+1, len(rules))
	}
}

func TestAddWebhookRuleInvalidAction(t *testing.T) {
	err := AddWebhookRule(WebhookRule{
		Name:   "bad rule",
		Action: "invalid_action",
	})
	if err == nil {
		t.Error("Expected error for invalid action")
	}
}

func TestRemoveWebhookRule(t *testing.T) {
	AddWebhookRule(WebhookRule{
		Name:     "to-remove",
		Provider: WebhookProviderGeneric,
		Action:   "log",
	})

	rules := GetWebhookRules()
	var targetID string
	for _, r := range rules {
		if r.Name == "to-remove" {
			targetID = r.ID
			break
		}
	}

	if targetID == "" {
		t.Fatal("Could not find rule to remove")
	}

	err := RemoveWebhookRule(targetID)
	if err != nil {
		t.Fatalf("RemoveWebhookRule error: %v", err)
	}

	// Verify removed
	for _, r := range GetWebhookRules() {
		if r.ID == targetID {
			t.Error("Rule should have been removed")
		}
	}
}

func TestRemoveWebhookRuleNotFound(t *testing.T) {
	err := RemoveWebhookRule("nonexistent-id")
	if err == nil {
		t.Error("Expected error for nonexistent rule")
	}
}

func TestToggleWebhookRule(t *testing.T) {
	AddWebhookRule(WebhookRule{
		Name:      "to-toggle",
		Provider:  WebhookProviderGeneric,
		Action:    "log",
		IsEnabled: true,
	})

	rules := GetWebhookRules()
	var targetID string
	for _, r := range rules {
		if r.Name == "to-toggle" {
			targetID = r.ID
			break
		}
	}

	err := ToggleWebhookRule(targetID, false)
	if err != nil {
		t.Fatalf("ToggleWebhookRule error: %v", err)
	}

	for _, r := range GetWebhookRules() {
		if r.ID == targetID && r.IsEnabled {
			t.Error("Expected rule to be disabled")
		}
	}
}

func TestProcessGitHubWebhook(t *testing.T) {
	event := ProcessGitHubWebhook("issues", map[string]interface{}{"action": "opened"})
	if event.Provider != WebhookProviderGitHub {
		t.Errorf("Provider = %q, want 'github'", event.Provider)
	}
	if event.EventType != "issues" {
		t.Errorf("EventType = %q, want 'issues'", event.EventType)
	}
}

func TestProcessSlackWebhook(t *testing.T) {
	event := ProcessSlackWebhook(map[string]interface{}{"type": "message", "text": "hello"})
	if event.Provider != WebhookProviderSlack {
		t.Errorf("Provider = %q, want 'slack'", event.Provider)
	}
	if event.EventType != "message" {
		t.Errorf("EventType = %q, want 'message'", event.EventType)
	}
}

func TestProcessLinearWebhook(t *testing.T) {
	event := ProcessLinearWebhook(map[string]interface{}{"action": "create"})
	if event.Provider != WebhookProviderLinear {
		t.Errorf("Provider = %q, want 'linear'", event.Provider)
	}
	if event.EventType != "create" {
		t.Errorf("EventType = %q, want 'create'", event.EventType)
	}
}

func TestProcessLinearWebhookDefaultType(t *testing.T) {
	event := ProcessLinearWebhook(map[string]interface{}{})
	if event.EventType != "update" {
		t.Errorf("Default EventType = %q, want 'update'", event.EventType)
	}
}

func TestWebhookRuleMatchByProvider(t *testing.T) {
	setupWebhookTestDB(t)

	// Add a generic rule
	AddWebhookRule(WebhookRule{
		Name:     "generic-catch-all",
		Provider: WebhookProviderGeneric,
		Action:   "log",
	})

	// This event should match the generic rule
	event := WebhookEvent{
		Provider:  WebhookProviderBorg,
		EventType: "test",
		RawBody:   map[string]interface{}{},
	}
	if err := ProcessWebhook(event); err != nil {
		t.Fatalf("ProcessWebhook error: %v", err)
	}
}

func TestWebhookRuleDisabledSkipped(t *testing.T) {
	setupWebhookTestDB(t)

	AddWebhookRule(WebhookRule{
		Name:      "disabled-rule",
		Provider:  WebhookProviderGeneric,
		Action:    "log",
		IsEnabled: false,
	})

	event := WebhookEvent{
		Provider:  WebhookProviderGeneric,
		EventType: "test",
	}
	if err := ProcessWebhook(event); err != nil {
		t.Fatalf("ProcessWebhook error: %v", err)
	}
}
