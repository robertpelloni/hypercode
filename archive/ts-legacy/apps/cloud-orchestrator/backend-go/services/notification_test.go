package services

import (
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	// Use in-memory SQLite for testing
	database, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}
	_ = database
}

func TestCreateNotification(t *testing.T) {
	setupTestDB(t)

	notif := CreateNotification("info", "session", "Test Title", "Test message body",
		WithSessionID("sess-123"),
		WithPriority(1),
		WithMetadata(map[string]interface{}{"key": "value"}),
	)

	if notif.ID == "" {
		t.Error("Expected notification to have an ID")
	}
	if notif.Type != "info" {
		t.Errorf("Expected type 'info', got '%s'", notif.Type)
	}
	if notif.Category != "session" {
		t.Errorf("Expected category 'session', got '%s'", notif.Category)
	}
	if notif.Title != "Test Title" {
		t.Errorf("Expected title 'Test Title', got '%s'", notif.Title)
	}
	if notif.IsRead {
		t.Error("New notification should not be read")
	}
	if notif.SessionID == nil || *notif.SessionID != "sess-123" {
		t.Error("Expected session ID to be set")
	}
	if notif.Priority != 1 {
		t.Errorf("Expected priority 1, got %d", notif.Priority)
	}
}

func TestGetNotifications(t *testing.T) {
	setupTestDB(t)

	// Create some test notifications
	CreateNotification("info", "session", "First", "First message")
	CreateNotification("error", "system", "Second", "Second message")
	CreateNotification("success", "session", "Third", "Third message")

	// Get all unread
	notifs, total, err := GetNotifications(NotificationFilter{IncludeRead: true})
	if err != nil {
		t.Fatalf("Failed to get notifications: %v", err)
	}
	if total != 3 {
		t.Errorf("Expected 3 notifications, got %d", total)
	}
	if len(notifs) != 3 {
		t.Errorf("Expected 3 notification results, got %d", len(notifs))
	}

	// Filter by category
	_, sessionTotal, err := GetNotifications(NotificationFilter{Category: "session", IncludeRead: true})
	if err != nil {
		t.Fatalf("Failed to filter by category: %v", err)
	}
	if sessionTotal != 2 {
		t.Errorf("Expected 2 session notifications, got %d", sessionTotal)
	}

	// Filter by type
	_, errorTotal, err := GetNotifications(NotificationFilter{Type: "error", IncludeRead: true})
	if err != nil {
		t.Fatalf("Failed to filter by type: %v", err)
	}
	if errorTotal != 1 {
		t.Errorf("Expected 1 error notification, got %d", errorTotal)
	}
}

func TestMarkNotificationRead(t *testing.T) {
	setupTestDB(t)

	notif := CreateNotification("info", "session", "Read Test", "Mark me as read")
	if notif.IsRead {
		t.Error("New notification should not be read")
	}

	err := MarkNotificationRead(notif.ID)
	if err != nil {
		t.Fatalf("Failed to mark notification as read: %v", err)
	}

	count, _ := GetUnreadNotificationCount()
	if count != 0 {
		t.Errorf("Expected 0 unread after marking as read, got %d", count)
	}
}

func TestDismissNotification(t *testing.T) {
	setupTestDB(t)

	notif := CreateNotification("info", "session", "Dismiss Test", "Dismiss me")

	err := DismissNotification(notif.ID)
	if err != nil {
		t.Fatalf("Failed to dismiss notification: %v", err)
	}

	// Dismissed notifications should not appear in default queries
	_, total, _ := GetNotifications(NotificationFilter{})
	if total != 0 {
		t.Errorf("Expected 0 non-dismissed notifications, got %d", total)
	}
}

func TestMarkAllNotificationsRead(t *testing.T) {
	setupTestDB(t)

	CreateNotification("info", "session", "N1", "M1")
	CreateNotification("error", "system", "N2", "M2")
	CreateNotification("success", "debate", "N3", "M3")

	err := MarkAllNotificationsRead()
	if err != nil {
		t.Fatalf("Failed to mark all as read: %v", err)
	}

	count, _ := GetUnreadNotificationCount()
	if count != 0 {
		t.Errorf("Expected 0 unread after mark all read, got %d", count)
	}
}

func TestNotificationPagination(t *testing.T) {
	setupTestDB(t)

	for i := 0; i < 10; i++ {
		CreateNotification("info", "session", "Paginated", "Message")
	}

	// Get first page
	page1, total, _ := GetNotifications(NotificationFilter{IncludeRead: true, Limit: 5, Offset: 0})
	if total != 10 {
		t.Errorf("Expected total 10, got %d", total)
	}
	if len(page1) != 5 {
		t.Errorf("Expected 5 items on page 1, got %d", len(page1))
	}

	// Get second page
	page2, _, _ := GetNotifications(NotificationFilter{IncludeRead: true, Limit: 5, Offset: 5})
	if len(page2) != 5 {
		t.Errorf("Expected 5 items on page 2, got %d", len(page2))
	}
}

func TestCleanupOldNotifications(t *testing.T) {
	setupTestDB(t)

	// Create a notification and immediately dismiss it
	notif := CreateNotification("info", "session", "Old Notif", "Old message")
	DismissNotification(notif.ID)

	// Manually backdate it
	db.DB.Model(&models.Notification{}).Where("id = ?", notif.ID).
		Update("created_at", time.Now().Add(-100*24*time.Hour))

	count, err := CleanupOldNotifications(90)
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected 1 cleaned up notification, got %d", count)
	}
}
