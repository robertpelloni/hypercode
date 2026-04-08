package httpapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type localCouncilMember struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Provider string `json:"provider"`
	Model    string `json:"model"`
	Active   bool   `json:"active"`
}

type localCouncilSession struct {
	ID         string   `json:"id"`
	Objective  string   `json:"objective"`
	Status     string   `json:"status"`
	Tags       []string `json:"tags"`
	Template   string   `json:"template"`
	CLIType    string   `json:"cliType"`
	Supervisor string   `json:"supervisor"`
	CreatedAt  int64    `json:"createdAt"`
	UpdatedAt  int64    `json:"updatedAt"`
	Logs       []string `json:"logs"`
	Guidance   []string `json:"guidance"`
}

type localCouncilConfig struct {
	DefaultSupervisor string `json:"defaultSupervisor"`
	MaxConcurrent     int    `json:"maxConcurrent"`
	DebateRounds      int    `json:"debateRounds"`
	QuotaEnabled      bool   `json:"quotaEnabled"`
}

type localCouncilState struct {
	Members    []localCouncilMember   `json:"members"`
	Sessions   []localCouncilSession  `json:"sessions"`
	Config     localCouncilConfig     `json:"config"`
	Templates  []map[string]any       `json:"templates"`
	UpdatedAt  int64                  `json:"updatedAt"`
}

type localCouncilManager struct {
	mu        sync.Mutex
	state     localCouncilState
	statePath string
}

func newLocalCouncilManager(workDir string) *localCouncilManager {
	return &localCouncilManager{
		statePath: filepath.Join(workDir, "council_state.json"),
		state: localCouncilState{
			Members:  []localCouncilMember{},
			Sessions: []localCouncilSession{},
			Config: localCouncilConfig{
				DefaultSupervisor: "auto",
				MaxConcurrent:     5,
				DebateRounds:      3,
				QuotaEnabled:      false,
			},
			Templates: []map[string]any{},
		},
	}
}

func (m *localCouncilManager) load() {
	m.mu.Lock()
	defer m.mu.Unlock()
	data, err := os.ReadFile(m.statePath)
	if err != nil {
		return
	}
	json.Unmarshal(data, &m.state)
}

func (m *localCouncilManager) save() {
	m.state.UpdatedAt = time.Now().UnixMilli()
	data, _ := json.MarshalIndent(m.state, "", "  ")
	os.WriteFile(m.statePath, data, 0o644)
}

// Members
func (m *localCouncilManager) ListMembers() []localCouncilMember {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Members
}

func (m *localCouncilManager) UpdateMembers(members []localCouncilMember) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Members = members
	m.save()
}

// Sessions
func (m *localCouncilManager) ListSessions() []localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Sessions
}

func (m *localCouncilManager) GetSession(id string) *localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.state.Sessions {
		if s.ID == id {
			return &s
		}
	}
	return nil
}

func (m *localCouncilManager) GetActiveSession() *localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.state.Sessions {
		if s.Status == "running" || s.Status == "active" {
			return &s
		}
	}
	return nil
}

func (m *localCouncilManager) StartSession(objective string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("council-%d", time.Now().UnixMilli())
	m.state.Sessions = append(m.state.Sessions, localCouncilSession{
		ID:        id,
		Objective: objective,
		Status:    "running",
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) StopSession(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions[i].Status = "stopped"
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) ResumeSession(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions[i].Status = "running"
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) DeleteSession(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions = append(m.state.Sessions[:i], m.state.Sessions[i+1:]...)
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) BulkStart(ids []string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := 0
	for i := range m.state.Sessions {
		for _, id := range ids {
			if m.state.Sessions[i].ID == id {
				m.state.Sessions[i].Status = "running"
				m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
				count++
			}
		}
	}
	if count > 0 {
		m.save()
	}
	return count
}

func (m *localCouncilManager) BulkStop() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := 0
	for i := range m.state.Sessions {
		if m.state.Sessions[i].Status == "running" {
			m.state.Sessions[i].Status = "stopped"
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			count++
		}
	}
	if count > 0 {
		m.save()
	}
	return count
}

func (m *localCouncilManager) BulkResume() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := 0
	for i := range m.state.Sessions {
		if m.state.Sessions[i].Status == "stopped" {
			m.state.Sessions[i].Status = "running"
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			count++
		}
	}
	if count > 0 {
		m.save()
	}
	return count
}

func (m *localCouncilManager) SendGuidance(id, guidance string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions[i].Guidance = append(m.state.Sessions[i].Guidance, guidance)
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) AppendLog(id, logEntry string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions[i].Logs = append(m.state.Sessions[i].Logs, logEntry)
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) GetLogs(id string) []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.state.Sessions {
		if s.ID == id {
			return s.Logs
		}
	}
	return []string{}
}

func (m *localCouncilManager) GetTemplates() []map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Templates
}

func (m *localCouncilManager) StartFromTemplate(template string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("council-%d", time.Now().UnixMilli())
	m.state.Sessions = append(m.state.Sessions, localCouncilSession{
		ID:        id,
		Status:    "running",
		Template:  template,
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) GetPersisted() []localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Sessions
}

func (m *localCouncilManager) GetByTag(tag string) []localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	var result []localCouncilSession
	for _, s := range m.state.Sessions {
		for _, t := range s.Tags {
			if t == tag {
				result = append(result, s)
				break
			}
		}
	}
	return result
}

func (m *localCouncilManager) GetByTemplate(template string) []localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	var result []localCouncilSession
	for _, s := range m.state.Sessions {
		if s.Template == template {
			result = append(result, s)
		}
	}
	return result
}

func (m *localCouncilManager) GetByCLI(cliType string) []localCouncilSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	var result []localCouncilSession
	for _, s := range m.state.Sessions {
		if s.CLIType == cliType {
			result = append(result, s)
		}
	}
	return result
}

func (m *localCouncilManager) UpdateTags(id string, tags []string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions[i].Tags = tags
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) AddTag(id, tag string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			m.state.Sessions[i].Tags = append(m.state.Sessions[i].Tags, tag)
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) RemoveTag(id, tag string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Sessions {
		if m.state.Sessions[i].ID == id {
			newTags := make([]string, 0)
			for _, t := range m.state.Sessions[i].Tags {
				if t != tag {
					newTags = append(newTags, t)
				}
			}
			m.state.Sessions[i].Tags = newTags
			m.state.Sessions[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

// Config
func (m *localCouncilManager) GetConfig() localCouncilConfig {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Config
}

func (m *localCouncilManager) UpdateConfig(cfg localCouncilConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Config = cfg
	m.save()
}

// Quota
func (m *localCouncilManager) GetQuotaStatus() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"enabled":       m.state.Config.QuotaEnabled,
		"maxConcurrent": m.state.Config.MaxConcurrent,
	}
}

func (m *localCouncilManager) SetQuotaEnabled(enabled bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Config.QuotaEnabled = enabled
	m.save()
}

func (m *localCouncilManager) GetStats() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	total := len(m.state.Sessions)
	active := 0
	stopped := 0
	for _, s := range m.state.Sessions {
		if s.Status == "running" || s.Status == "active" {
			active++
		} else {
			stopped++
		}
	}
	return map[string]any{
		"total":   total,
		"active":  active,
		"stopped": stopped,
		"members": len(m.state.Members),
	}
}
