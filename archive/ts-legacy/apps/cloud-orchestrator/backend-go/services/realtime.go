package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

var broadcastHook func(interface{})

// SetBroadcaster allows the API package to register the active websocket broadcast function
// without creating an import cycle back from services -> api.
func SetBroadcaster(fn func(interface{})) {
	broadcastHook = fn
}

func emitRealtime(message interface{}) {
	if broadcastHook != nil {
		broadcastHook(message)
	}
}

func emitDaemonEvent(eventType string, data interface{}) {
	emitRealtime(map[string]interface{}{
		"type": eventType,
		"data": data,
	})
}

func addKeeperLog(message, logType, sessionID string, details interface{}) {
	var metadata *string
	if details != nil {
		payload, err := json.Marshal(details)
		if err == nil {
			value := string(payload)
			metadata = &value
		}
	}

	entry := models.KeeperLog{
		ID:        fmt.Sprintf("log-%d", time.Now().UnixNano()),
		SessionID: sessionID,
		Type:      logType,
		Message:   message,
		Metadata:  metadata,
		CreatedAt: time.Now(),
	}

	_ = db.DB.Create(&entry).Error
	emitDaemonEvent("log_added", map[string]interface{}{"log": entry})

	// Auto-create notifications for important keeper events
	go AutoNotifyFromKeeperLog(entry)

	// Record audit trail for action/error events
	if details != nil {
		if detailMap, ok := details.(map[string]interface{}); ok {
			if event, ok := detailMap["event"].(string); ok {
				auditAction(event, logType, sessionID, message, detailMap)
			}
		}
	}
}

func auditAction(event, logType, sessionID, message string, details map[string]interface{}) {
	resourceType := "session"
	resourceID := sessionID
	actor := "daemon"
	status := "success"

	if strings.Contains(event, "index") {
		resourceType = "codebase"
		resourceID = "default"
	}
	if strings.Contains(event, "issue") {
		resourceType = "issue"
		if sourceID, ok := details["sourceId"].(string); ok {
			resourceID = sourceID
		}
	}
	if strings.Contains(event, "circuit_breaker") {
		resourceType = "provider"
		actor = "circuit_breaker"
		if provider, ok := details["provider"].(string); ok {
			resourceID = provider
		}
	}
	if strings.Contains(event, "scheduler") {
		actor = "scheduler"
	}
	if logType == "error" {
		status = "failure"
	}
	if strings.Contains(event, "skipped") || strings.Contains(event, "_skipped") {
		status = "skipped"
	}

	AuditAction(event, actor, resourceType, resourceID, status, message, WithDetails(details))
}
