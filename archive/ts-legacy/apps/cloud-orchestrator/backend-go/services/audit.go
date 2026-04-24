package services

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// AuditAction records an immutable audit trail entry
func AuditAction(action, actor, resourceType, resourceID, status, summary string, opts ...AuditOption) models.AuditEntry {
	entry := models.AuditEntry{
		ID:           uuid.New().String(),
		Action:       action,
		Actor:        actor,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Status:       status,
		Summary:      summary,
		CreatedAt:    time.Now(),
	}

	for _, opt := range opts {
		opt(&entry)
	}

	if err := db.DB.Create(&entry).Error; err != nil {
		log.Printf("[Audit] Failed to persist audit entry: %v", err)
	}
	return entry
}

// AuditOption is a functional option for audit entries
type AuditOption func(*models.AuditEntry)

func WithDetails(details interface{}) AuditOption {
	return func(e *models.AuditEntry) {
		if details != nil {
			payload, err := json.Marshal(details)
			if err == nil {
				value := string(payload)
				e.Details = &value
			}
		}
	}
}

func WithProvider(provider string) AuditOption {
	return func(e *models.AuditEntry) {
		e.Provider = &provider
	}
}

func WithModel(model string) AuditOption {
	return func(e *models.AuditEntry) {
		e.Model = &model
	}
}

func WithTokenUsage(usage int) AuditOption {
	return func(e *models.AuditEntry) {
		e.TokenUsage = &usage
	}
}

func WithDuration(ms int64) AuditOption {
	return func(e *models.AuditEntry) {
		e.DurationMs = &ms
	}
}

// AuditFilter defines query parameters for listing audit entries
type AuditFilter struct {
	Action       string `json:"action"`
	Actor        string `json:"actor"`
	ResourceType string `json:"resourceType"`
	ResourceID   string `json:"resourceId"`
	Status       string `json:"status"`
	From         string `json:"from"`
	To           string `json:"to"`
	Limit        int    `json:"limit"`
	Offset       int    `json:"offset"`
}

// GetAuditEntries retrieves audit entries with optional filtering
func GetAuditEntries(filter AuditFilter) ([]models.AuditEntry, int64, error) {
	query := db.DB.Model(&models.AuditEntry{})

	if filter.Action != "" {
		query = query.Where("action = ?", filter.Action)
	}
	if filter.Actor != "" {
		query = query.Where("actor = ?", filter.Actor)
	}
	if filter.ResourceType != "" {
		query = query.Where("resource_type = ?", filter.ResourceType)
	}
	if filter.ResourceID != "" {
		query = query.Where("resource_id = ?", filter.ResourceID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.From != "" {
		if t, err := time.Parse(time.RFC3339, filter.From); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if filter.To != "" {
		if t, err := time.Parse(time.RFC3339, filter.To); err == nil {
			query = query.Where("created_at <= ?", t)
		}
	}

	var total int64
	query.Count(&total)

	if filter.Limit <= 0 {
		filter.Limit = 100
	}
	if filter.Limit > 500 {
		filter.Limit = 500
	}

	var entries []models.AuditEntry
	err := query.Order("created_at desc").Offset(filter.Offset).Limit(filter.Limit).Find(&entries).Error
	return entries, total, err
}

// GetAuditStats returns aggregate statistics about audit entries
func GetAuditStats() (map[string]interface{}, error) {
	var totalCount int64
	db.DB.Model(&models.AuditEntry{}).Count(&totalCount)

	// Count by action type
	type actionCount struct {
		Action string `json:"action"`
		Count  int64  `json:"count"`
	}
	var actionCounts []actionCount
	db.DB.Model(&models.AuditEntry{}).Select("action, count(*) as count").Group("action").Scan(&actionCounts)

	// Count by actor
	type actorCount struct {
		Actor string `json:"actor"`
		Count int64  `json:"count"`
	}
	var actorCounts []actorCount
	db.DB.Model(&models.AuditEntry{}).Select("actor, count(*) as count").Group("actor").Scan(&actorCounts)

	// Count by status
	type statusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var statusCounts []statusCount
	db.DB.Model(&models.AuditEntry{}).Select("status, count(*) as count").Group("status").Scan(&statusCounts)

	// Total token usage
	var totalTokens *int
	db.DB.Model(&models.AuditEntry{}).Select("sum(token_usage)").Scan(&totalTokens)

	// Recent 24h count
	cutoff := time.Now().Add(-24 * time.Hour)
	var recentCount int64
	db.DB.Model(&models.AuditEntry{}).Where("created_at >= ?", cutoff).Count(&recentCount)

	actions := make(map[string]int64)
	for _, ac := range actionCounts {
		actions[ac.Action] = ac.Count
	}
	actors := make(map[string]int64)
	for _, ac := range actorCounts {
		actors[ac.Actor] = ac.Count
	}
	statuses := make(map[string]int64)
	for _, sc := range statusCounts {
		statuses[sc.Status] = sc.Count
	}

	tokens := 0
	if totalTokens != nil {
		tokens = *totalTokens
	}

	return map[string]interface{}{
		"total":     totalCount,
		"last24h":   recentCount,
		"tokens":    tokens,
		"byAction":  actions,
		"byActor":   actors,
		"byStatus":  statuses,
		"generated": fmt.Sprintf("%d audit trail entries", totalCount),
	}, nil
}
