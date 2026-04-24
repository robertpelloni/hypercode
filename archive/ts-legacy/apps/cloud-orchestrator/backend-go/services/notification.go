package services

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// CreateNotification creates and broadcasts a new notification
func CreateNotification(notifType, category, title, message string, opts ...NotificationOption) models.Notification {
	now := time.Now()
	notif := models.Notification{
		ID:        uuid.New().String(),
		Type:      notifType,
		Category:  category,
		Title:     title,
		Message:   message,
		IsRead:    false,
		IsDismissed: false,
		Priority:  0,
		CreatedAt: now,
	}

	for _, opt := range opts {
		opt(&notif)
	}

	if err := db.DB.Create(&notif).Error; err != nil {
		log.Printf("[Notification] Failed to persist notification: %v", err)
		return notif
	}

	// Broadcast via websocket
	emitDaemonEvent("notification_created", map[string]interface{}{
		"id":        notif.ID,
		"type":      notif.Type,
		"category":  notif.Category,
		"title":     notif.Title,
		"message":   notif.Message,
		"priority":  notif.Priority,
		"createdAt": notif.CreatedAt.Format(time.RFC3339),
	})

	return notif
}

// NotificationOption is a functional option for notifications
type NotificationOption func(*models.Notification)

func WithSessionID(sessionID string) NotificationOption {
	return func(n *models.Notification) {
		n.SessionID = &sessionID
	}
}

func WithSourceID(sourceID string) NotificationOption {
	return func(n *models.Notification) {
		n.SourceID = &sourceID
	}
}

func WithMetadata(details interface{}) NotificationOption {
	return func(n *models.Notification) {
		if details != nil {
			payload, err := json.Marshal(details)
			if err == nil {
				value := string(payload)
				n.Metadata = &value
			}
		}
	}
}

func WithPriority(priority int) NotificationOption {
	return func(n *models.Notification) {
		n.Priority = priority
	}
}

// GetNotifications retrieves notifications with optional filtering
func GetNotifications(filter NotificationFilter) ([]models.Notification, int64, error) {
	query := db.DB.Model(&models.Notification{})

	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Type != "" {
		query = query.Where("type = ?", filter.Type)
	}
	if !filter.IncludeDismissed {
		query = query.Where("is_dismissed = ?", false)
	}
	if !filter.IncludeRead {
		query = query.Where("is_read = ?", false)
	}
	if filter.SessionID != "" {
		query = query.Where("session_id = ?", filter.SessionID)
	}

	var total int64
	query.Count(&total)

	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > 200 {
		filter.Limit = 200
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	var notifications []models.Notification
	err := query.Order("created_at desc").Offset(filter.Offset).Limit(filter.Limit).Find(&notifications).Error
	return notifications, total, err
}

// NotificationFilter defines query parameters for listing notifications
type NotificationFilter struct {
	Category         string `json:"category"`
	Type             string `json:"type"`
	SessionID        string `json:"sessionId"`
	IncludeRead      bool   `json:"includeRead"`
	IncludeDismissed bool   `json:"includeDismissed"`
	Limit            int    `json:"limit"`
	Offset           int    `json:"offset"`
}

// MarkNotificationRead marks a notification as read
func MarkNotificationRead(id string) error {
	now := time.Now()
	return db.DB.Model(&models.Notification{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_read": true,
		"read_at": &now,
	}).Error
}

// MarkAllNotificationsRead marks all notifications as read
func MarkAllNotificationsRead() error {
	now := time.Now()
	return db.DB.Model(&models.Notification{}).Where("is_read = ?", false).Updates(map[string]interface{}{
		"is_read": true,
		"read_at": &now,
	}).Error
}

// DismissNotification marks a notification as dismissed
func DismissNotification(id string) error {
	now := time.Now()
	return db.DB.Model(&models.Notification{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_dismissed": true,
		"dismissed_at": &now,
	}).Error
}

// DismissAllNotifications dismisses all notifications
func DismissAllNotifications() error {
	now := time.Now()
	return db.DB.Model(&models.Notification{}).Where("is_dismissed = ?", false).Updates(map[string]interface{}{
		"is_dismissed": true,
		"dismissed_at": &now,
	}).Error
}

// GetUnreadNotificationCount returns the count of unread notifications
func GetUnreadNotificationCount() (int64, error) {
	var count int64
	err := db.DB.Model(&models.Notification{}).Where("is_read = ? AND is_dismissed = ?", false, false).Count(&count).Error
	return count, err
}

// CleanupOldNotifications removes notifications older than the retention period
func CleanupOldNotifications(retentionDays int) (int64, error) {
	if retentionDays <= 0 {
		retentionDays = 90
	}
	cutoff := time.Now().Add(-time.Duration(retentionDays) * 24 * time.Hour)
	result := db.DB.Where("created_at < ? AND is_dismissed = ?", cutoff, true).Delete(&models.Notification{})
	return result.RowsAffected, result.Error
}

// AutoNotifyFromKeeperLog watches for high-priority keeper log entries and creates notifications
func AutoNotifyFromKeeperLog(log models.KeeperLog) {
	// Only create notifications for actionable/error events
	switch log.Type {
	case "action", "error":
		// These are worth notifying about
	default:
		return
	}

	// Parse metadata to determine category
	category := "system"
	priority := 0

	var details map[string]interface{}
	if log.Metadata != nil {
		_ = json.Unmarshal([]byte(*log.Metadata), &details)
	}

	if details != nil {
		if event, ok := details["event"].(string); ok {
			switch {
			case strings.Contains(event, "session_nudged"):
				category = "session"
				title := fmt.Sprintf("Session Nudged")
				message := log.Message
				if sessionTitle, ok := details["sessionTitle"].(string); ok {
					title = fmt.Sprintf("Session Nudged: %s", sessionTitle)
				}
				CreateNotification("info", category, title, message,
					WithSessionID(log.SessionID),
					WithMetadata(details),
				)
				return
			case strings.Contains(event, "session_approved"):
				category = "session"
				CreateNotification("success", category, "Plan Auto-Approved", log.Message,
					WithSessionID(log.SessionID),
					WithMetadata(details),
				)
				return
			case strings.Contains(event, "session_debate_escalated"):
				category = "debate"
				priority = 1
				CreateNotification("warning", category, "Plan Escalated to Council Debate", log.Message,
					WithSessionID(log.SessionID),
					WithMetadata(details),
					WithPriority(priority),
				)
				return
			case strings.Contains(event, "session_debate_resolved"):
				category = "debate"
				CreateNotification("info", category, "Council Debate Resolved", log.Message,
					WithSessionID(log.SessionID),
					WithMetadata(details),
				)
				return
			case strings.Contains(event, "session_recovery"):
				category = "recovery"
				priority = 1
				notifType := "info"
				if strings.Contains(event, "completed") {
					notifType = "success"
				}
				CreateNotification(notifType, category, "Session Recovery", log.Message,
					WithSessionID(log.SessionID),
					WithMetadata(details),
					WithPriority(priority),
				)
				return
			case strings.Contains(event, "codebase_index"):
				category = "indexing"
				CreateNotification("info", category, "Codebase Indexing", log.Message,
					WithMetadata(details),
				)
				return
			case strings.Contains(event, "issue_session_spawned"):
				category = "issues"
				priority = 1
				CreateNotification("action", category, "Autonomous Session Spawned", log.Message,
					WithMetadata(details),
					WithPriority(priority),
				)
				return
			case strings.Contains(event, "circuit_breaker_tripped"):
				category = "circuit_breaker"
				priority = 2
				CreateNotification("error", category, "Circuit Breaker Tripped", log.Message,
					WithMetadata(details),
					WithPriority(priority),
				)
				return
			case strings.Contains(event, "llm_fallback_success"):
				category = "circuit_breaker"
				CreateNotification("warning", category, "LLM Fallback Activated", log.Message,
					WithMetadata(details),
				)
				return
			}
		}
	}

	// Generic fallback for important keeper log entries
	if log.Type == "error" {
		priority = 1
		CreateNotification("error", category, "Daemon Error", log.Message,
			WithSessionID(log.SessionID),
			WithMetadata(details),
			WithPriority(priority),
		)
	}
}
