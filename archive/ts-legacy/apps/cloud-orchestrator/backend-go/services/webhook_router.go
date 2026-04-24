package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// WebhookProvider identifies the source of an inbound webhook
type WebhookProvider string

const (
	WebhookProviderBorg      WebhookProvider = "borg"
	WebhookProviderGitHub    WebhookProvider = "github"
	WebhookProviderSlack     WebhookProvider = "slack"
	WebhookProviderLinear    WebhookProvider = "linear"
	WebhookProviderGeneric   WebhookProvider = "generic"
	WebhookProviderHypercode WebhookProvider = "hypercode"
)

// WebhookRule defines a routing rule for inbound webhooks
type WebhookRule struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Provider     WebhookProvider   `json:"provider"`
	EventFilter  string            `json:"eventFilter,omitempty"` // regex or specific event type
	Action       string            `json:"action"`                // "log", "enqueue", "notify", "delegate"
	JobType      string            `json:"jobType,omitempty"`     // for "enqueue" action
	JobPayload   map[string]string `json:"jobPayload,omitempty"` // static payload additions
	IsEnabled    bool              `json:"isEnabled"`
	CreatedAt    time.Time         `json:"createdAt"`
}

// WebhookEvent represents a normalized inbound webhook event
type WebhookEvent struct {
	ID        string                 `json:"id"`
	Provider  WebhookProvider        `json:"provider"`
	EventType string                 `json:"eventType"`
	RawBody   map[string]interface{} `json:"rawBody"`
	Headers   map[string]string      `json:"headers,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

var (
	webhookRules   []WebhookRule
	webhookRulesMu sync.RWMutex
)

func init() {
	// Default rules
	webhookRules = []WebhookRule{
		{
			ID:          "default-borg-signal",
			Name:        "Borg Collective Signal",
			Provider:    WebhookProviderBorg,
			EventFilter: "",
			Action:      "log",
			IsEnabled:   true,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "default-github-issues",
			Name:        "GitHub Issue Events",
			Provider:    WebhookProviderGitHub,
			EventFilter: "issues",
			Action:      "enqueue",
			JobType:     "check_issues",
			IsEnabled:   true,
			CreatedAt:   time.Now(),
		},
	}
}

// ProcessWebhook processes an inbound webhook event through the routing engine
func ProcessWebhook(event WebhookEvent) error {
	event.ID = uuid.New().String()
	event.Timestamp = time.Now()

	// Store the event
	storeWebhookEvent(event)

	// Match against rules
	webhookRulesMu.RLock()
	rules := webhookRules
	webhookRulesMu.RUnlock()

	matched := 0
	for _, rule := range rules {
		if !rule.IsEnabled {
			continue
		}
		if rule.Provider != event.Provider && rule.Provider != WebhookProviderGeneric {
			continue
		}
		if rule.EventFilter != "" && rule.EventFilter != event.EventType {
			continue
		}

		if err := executeWebhookRule(rule, event); err != nil {
			log.Printf("[Webhook] Rule %s failed: %v", rule.Name, err)
		}
		matched++
	}

	log.Printf("[Webhook] Processed %s/%s event, matched %d rules", event.Provider, event.EventType, matched)
	return nil
}

func executeWebhookRule(rule WebhookRule, event WebhookEvent) error {
	switch rule.Action {
	case "log":
		message := fmt.Sprintf("[%s] %s event received", event.Provider, event.EventType)
		addKeeperLog(message, "info", "global", map[string]interface{}{
			"event":    "webhook_received",
			"provider": string(event.Provider),
			"rule":     rule.Name,
		})
		return nil

	case "enqueue":
		payload := make(map[string]interface{})
		// Add static payload fields
		for k, v := range rule.JobPayload {
			payload[k] = v
		}
		// Add event data
		if event.RawBody != nil {
			for k, v := range event.RawBody {
				payload[k] = v
			}
		}
		if rule.JobType == "" {
			return fmt.Errorf("rule %s: enqueue action requires jobType", rule.Name)
		}
		_, err := AddJob(rule.JobType, payload)
		return err

	case "notify":
		title := fmt.Sprintf("Webhook: %s %s", event.Provider, event.EventType)
		message := fmt.Sprintf("Received from %s", event.Provider)
		if body, err := json.Marshal(event.RawBody); err == nil && len(body) < 500 {
			message = string(body)
		}
		CreateNotification("info", "webhook", title, message, WithPriority(3))
		return nil

	case "delegate":
		// Delegate to the daemon's issue checking
		if sourceID, ok := event.RawBody["sourceId"].(string); ok {
			_, err := AddJob("check_issues", map[string]interface{}{"sourceId": sourceID})
			return err
		}
		return fmt.Errorf("rule %s: delegate requires sourceId in payload", rule.Name)

	default:
		return fmt.Errorf("unknown action: %s", rule.Action)
	}
}

func storeWebhookEvent(event WebhookEvent) {
	if db.DB == nil {
		return
	}

	entry := models.KeeperLog{
		ID:        fmt.Sprintf("wh-%d", time.Now().UnixNano()),
		SessionID: "global",
		Type:      "info",
		Message:   fmt.Sprintf("[Webhook] %s/%s received", event.Provider, event.EventType),
		CreatedAt: time.Now(),
	}

	if event.RawBody != nil {
		payload, _ := json.Marshal(event.RawBody)
		meta := string(payload)
		if len(meta) > 10000 {
			meta = meta[:10000]
		}
		entry.Metadata = &meta
	}

	db.DB.Create(&entry)
	emitDaemonEvent("webhook_received", map[string]interface{}{
		"provider":  event.Provider,
		"eventType": event.EventType,
		"id":        event.ID,
	})
}

// GetWebhookRules returns all configured webhook routing rules
func GetWebhookRules() []WebhookRule {
	webhookRulesMu.RLock()
	defer webhookRulesMu.RUnlock()
	result := make([]WebhookRule, len(webhookRules))
	copy(result, webhookRules)
	return result
}

// AddWebhookRule adds a new webhook routing rule
func AddWebhookRule(rule WebhookRule) error {
	webhookRulesMu.Lock()
	defer webhookRulesMu.Unlock()

	if rule.ID == "" {
		rule.ID = uuid.New().String()
	}
	rule.CreatedAt = time.Now()

	// Validate action
	switch rule.Action {
	case "log", "enqueue", "notify", "delegate":
		// valid
	default:
		return fmt.Errorf("invalid action: %s", rule.Action)
	}

	webhookRules = append(webhookRules, rule)
	return nil
}

// RemoveWebhookRule removes a webhook routing rule by ID
func RemoveWebhookRule(ruleID string) error {
	webhookRulesMu.Lock()
	defer webhookRulesMu.Unlock()

	for i, rule := range webhookRules {
		if rule.ID == ruleID {
			webhookRules = append(webhookRules[:i], webhookRules[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("rule %s not found", ruleID)
}

// ToggleWebhookRule enables or disables a webhook routing rule
func ToggleWebhookRule(ruleID string, enabled bool) error {
	webhookRulesMu.Lock()
	defer webhookRulesMu.Unlock()

	for i := range webhookRules {
		if webhookRules[i].ID == ruleID {
			webhookRules[i].IsEnabled = enabled
			return nil
		}
	}
	return fmt.Errorf("rule %s not found", ruleID)
}

// ProcessGitHubWebhook handles GitHub-specific webhook payload normalization
func ProcessGitHubWebhook(eventType string, body map[string]interface{}) WebhookEvent {
	return WebhookEvent{
		Provider:  WebhookProviderGitHub,
		EventType: eventType,
		RawBody:   body,
	}
}

// ProcessSlackWebhook handles Slack-specific webhook payload normalization
func ProcessSlackWebhook(body map[string]interface{}) WebhookEvent {
	eventType := "message"
	if t, ok := body["type"].(string); ok {
		eventType = t
	}
	return WebhookEvent{
		Provider:  WebhookProviderSlack,
		EventType: eventType,
		RawBody:   body,
	}
}

// ProcessLinearWebhook handles Linear-specific webhook payload normalization
func ProcessLinearWebhook(body map[string]interface{}) WebhookEvent {
	eventType := "update"
	if t, ok := body["action"].(string); ok {
		eventType = t
	}
	return WebhookEvent{
		Provider:  WebhookProviderLinear,
		EventType: eventType,
		RawBody:   body,
	}
}
