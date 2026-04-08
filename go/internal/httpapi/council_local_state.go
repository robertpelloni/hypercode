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

type localRotationRoom struct {
	ID            string           `json:"id"`
	Participants  []string         `json:"participants"`
	Messages      []map[string]any `json:"messages"`
	CurrentTurn   int              `json:"currentTurn"`
	Agreement     string           `json:"agreement"`
	SharedContext string           `json:"sharedContext"`
	Supervisor    string           `json:"supervisor"`
	Status        string           `json:"status"`
	CreatedAt     int64            `json:"createdAt"`
	UpdatedAt     int64            `json:"updatedAt"`
}

type localEvolutionRun struct {
	ID         string  `json:"id"`
	Status     string  `json:"status"`
	Generation int     `json:"generation"`
	BestScore  float64 `json:"bestScore"`
	CreatedAt  int64   `json:"createdAt"`
}

type localFinetuneDataset struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	TaskType  string `json:"taskType"`
	Size      int    `json:"size"`
	CreatedAt int64  `json:"createdAt"`
}

type localFinetuneJob struct {
	ID        string `json:"id"`
	DatasetID string `json:"datasetId"`
	Status    string `json:"status"`
	CreatedAt int64  `json:"createdAt"`
}

type localFinetuneModel struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	JobID     string `json:"jobId"`
	Deployed  bool   `json:"deployed"`
	CreatedAt int64  `json:"createdAt"`
}

type localHook struct {
	ID      string `json:"id"`
	Event   string `json:"event"`
	Action  string `json:"action"`
	Enabled bool   `json:"enabled"`
}

type localSmartPilotConfig struct {
	Enabled      bool `json:"enabled"`
	TriggerCount int  `json:"triggerCount"`
	MaxPerDay    int  `json:"maxPerDay"`
}

type localCouncilConfig struct {
	DefaultSupervisor string              `json:"defaultSupervisor"`
	MaxConcurrent     int                 `json:"maxConcurrent"`
	DebateRounds      int                 `json:"debateRounds"`
	QuotaEnabled      bool                `json:"quotaEnabled"`
	Enabled           bool                `json:"enabled"`
	MockSupervisors   []localCouncilMember `json:"mockSupervisors"`
	Supervisors       []localCouncilMember `json:"supervisors"`
}

type localCouncilState struct {
	Members       []localCouncilMember   `json:"members"`
	Sessions      []localCouncilSession  `json:"sessions"`
	Config        localCouncilConfig     `json:"config"`
	Templates     []map[string]any       `json:"templates"`
	RotationRooms []localRotationRoom    `json:"rotationRooms"`
	EvolutionRuns []localEvolutionRun    `json:"evolutionRuns"`
	Datasets      []localFinetuneDataset `json:"datasets"`
	FinetuneJobs  []localFinetuneJob     `json:"finetuneJobs"`
	Models        []localFinetuneModel   `json:"models"`
	Hooks         []localHook            `json:"hooks"`
	SmartPilot    localSmartPilotConfig  `json:"smartPilot"`
	IDETasks      []map[string]any       `json:"ideTasks"`
	UpdatedAt     int64                  `json:"updatedAt"`
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
			Members:       []localCouncilMember{},
			Sessions:      []localCouncilSession{},
			RotationRooms: []localRotationRoom{},
			EvolutionRuns: []localEvolutionRun{},
			Datasets:      []localFinetuneDataset{},
			FinetuneJobs:  []localFinetuneJob{},
			Models:        []localFinetuneModel{},
			Hooks:         []localHook{},
			IDETasks:      []map[string]any{},
			Config: localCouncilConfig{
				DefaultSupervisor: "auto",
				MaxConcurrent:     5,
				DebateRounds:      3,
				QuotaEnabled:      false,
				Enabled:           true,
			},
			Templates:  []map[string]any{},
			SmartPilot: localSmartPilotConfig{Enabled: false, TriggerCount: 0, MaxPerDay: 10},
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

// === Core Session methods ===

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

// === Rotation Room methods ===

func (m *localCouncilManager) ListRotationRooms() []localRotationRoom {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.RotationRooms
}

func (m *localCouncilManager) GetRotationRoom(roomID string) *localRotationRoom {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			return &m.state.RotationRooms[i]
		}
	}
	return nil
}

func (m *localCouncilManager) CreateRotationRoom() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("room-%d", time.Now().UnixMilli())
	m.state.RotationRooms = append(m.state.RotationRooms, localRotationRoom{
		ID:        id,
		Status:    "running",
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) AddParticipantToRoom(roomID, participant string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Participants = append(m.state.RotationRooms[i].Participants, participant)
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) PostMessageToRoom(roomID, sender, content string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Messages = append(m.state.RotationRooms[i].Messages, map[string]any{
				"sender":    sender,
				"content":   content,
				"timestamp": time.Now().UnixMilli(),
			})
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) SetRoomAgreement(roomID, agreement string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Agreement = agreement
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) AdvanceRoomTurn(roomID string) (bool, int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].CurrentTurn++
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true, m.state.RotationRooms[i].CurrentTurn
		}
	}
	return false, 0
}

func (m *localCouncilManager) ConfigureRoomSupervisor(roomID, supervisor string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Supervisor = supervisor
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) UpdateRoomSharedContext(roomID, ctx string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].SharedContext = ctx
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) PauseRoom(roomID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Status = "paused"
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) ResumeRoom(roomID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Status = "running"
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) StartRoomExecution(roomID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Status = "running"
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) CompleteRoom(roomID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.RotationRooms {
		if m.state.RotationRooms[i].ID == roomID {
			m.state.RotationRooms[i].Status = "completed"
			m.state.RotationRooms[i].UpdatedAt = time.Now().UnixMilli()
			m.save()
			return true
		}
	}
	return false
}

// === Evolution methods ===

func (m *localCouncilManager) StartEvolution() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("evo-%d", time.Now().UnixMilli())
	m.state.EvolutionRuns = append(m.state.EvolutionRuns, localEvolutionRun{
		ID:         id,
		Status:     "running",
		Generation: 1,
		CreatedAt:  time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) StopEvolution(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.EvolutionRuns {
		if m.state.EvolutionRuns[i].ID == id {
			m.state.EvolutionRuns[i].Status = "stopped"
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) OptimizeEvolution(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.EvolutionRuns {
		if m.state.EvolutionRuns[i].ID == id && m.state.EvolutionRuns[i].Status == "running" {
			m.state.EvolutionRuns[i].Generation++
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) ListEvolutionRuns() []localEvolutionRun {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.EvolutionRuns
}

// === Finetune methods ===

func (m *localCouncilManager) ListDatasets(taskType string) []localFinetuneDataset {
	m.mu.Lock()
	defer m.mu.Unlock()
	if taskType == "" {
		return m.state.Datasets
	}
	var result []localFinetuneDataset
	for _, d := range m.state.Datasets {
		if d.TaskType == taskType {
			result = append(result, d)
		}
	}
	return result
}

func (m *localCouncilManager) CreateDataset(name, taskType string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("ds-%d", time.Now().UnixMilli())
	m.state.Datasets = append(m.state.Datasets, localFinetuneDataset{
		ID:        id,
		Name:      name,
		TaskType:  taskType,
		CreatedAt: time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) GetDataset(id string) *localFinetuneDataset {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Datasets {
		if m.state.Datasets[i].ID == id {
			return &m.state.Datasets[i]
		}
	}
	return nil
}

func (m *localCouncilManager) CreateFinetuneJob(datasetID string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("ftj-%d", time.Now().UnixMilli())
	m.state.FinetuneJobs = append(m.state.FinetuneJobs, localFinetuneJob{
		ID:        id,
		DatasetID: datasetID,
		Status:    "pending",
		CreatedAt: time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) ListFinetuneJobs() []localFinetuneJob {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.FinetuneJobs
}

func (m *localCouncilManager) StartFinetuneJob(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.FinetuneJobs {
		if m.state.FinetuneJobs[i].ID == id {
			m.state.FinetuneJobs[i].Status = "running"
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) ListModels() []localFinetuneModel {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Models
}

func (m *localCouncilManager) RegisterModel(name, jobID string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("ftm-%d", time.Now().UnixMilli())
	m.state.Models = append(m.state.Models, localFinetuneModel{
		ID:        id,
		Name:      name,
		JobID:     jobID,
		CreatedAt: time.Now().UnixMilli(),
	})
	m.save()
	return id
}

func (m *localCouncilManager) DeployModel(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Models {
		if m.state.Models[i].ID == id {
			m.state.Models[i].Deployed = true
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) GetFinetuneStats() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"datasets": len(m.state.Datasets),
		"jobs":     len(m.state.FinetuneJobs),
		"models":   len(m.state.Models),
	}
}

// === Hooks methods ===

func (m *localCouncilManager) ListHooks() []localHook {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.Hooks
}

func (m *localCouncilManager) RegisterHook(event, action string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("hook-%d", time.Now().UnixMilli())
	m.state.Hooks = append(m.state.Hooks, localHook{
		ID:      id,
		Event:   event,
		Action:  action,
		Enabled: true,
	})
	m.save()
	return id
}

func (m *localCouncilManager) UnregisterHook(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.state.Hooks {
		if m.state.Hooks[i].ID == id {
			m.state.Hooks = append(m.state.Hooks[:i], m.state.Hooks[i+1:]...)
			m.save()
			return true
		}
	}
	return false
}

func (m *localCouncilManager) ClearHooks() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := len(m.state.Hooks)
	m.state.Hooks = []localHook{}
	m.save()
	return count
}

// === IDE methods ===

func (m *localCouncilManager) GetIDEStatus() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"connected":    true,
		"pendingTasks": len(m.state.IDETasks),
	}
}

func (m *localCouncilManager) SubmitIDETask(task map[string]any) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := fmt.Sprintf("idetask-%d", time.Now().UnixMilli())
	task["id"] = id
	task["createdAt"] = time.Now().UnixMilli()
	task["status"] = "pending"
	m.state.IDETasks = append(m.state.IDETasks, task)
	m.save()
	return id
}

// === SmartPilot methods ===

func (m *localCouncilManager) GetSmartPilotStatus() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"enabled":      m.state.SmartPilot.Enabled,
		"triggerCount": m.state.SmartPilot.TriggerCount,
		"maxPerDay":    m.state.SmartPilot.MaxPerDay,
	}
}

func (m *localCouncilManager) GetSmartPilotConfig() localSmartPilotConfig {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state.SmartPilot
}

func (m *localCouncilManager) UpdateSmartPilotConfig(cfg localSmartPilotConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SmartPilot = cfg
	m.save()
}

func (m *localCouncilManager) TriggerSmartPilot() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SmartPilot.TriggerCount++
	m.save()
	return m.state.SmartPilot.TriggerCount
}

func (m *localCouncilManager) ResetSmartPilotCount() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SmartPilot.TriggerCount = 0
	m.save()
}

func (m *localCouncilManager) ResetSmartPilotAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SmartPilot = localSmartPilotConfig{Enabled: false, TriggerCount: 0, MaxPerDay: 10}
	m.save()
}

// === Visual / Diagram methods ===

func (m *localCouncilManager) GetSystemDiagram() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	nodes := []map[string]any{}
	for _, mem := range m.state.Members {
		nodes = append(nodes, map[string]any{"id": mem.ID, "label": mem.Name, "role": mem.Role, "type": "member"})
	}
	for _, sess := range m.state.Sessions {
		nodes = append(nodes, map[string]any{"id": sess.ID, "label": sess.Objective, "status": sess.Status, "type": "session"})
	}
	return map[string]any{
		"nodes": nodes,
		"edges": []map[string]any{},
	}
}

// === Base council methods ===

func (m *localCouncilManager) GetStatus() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"enabled":        m.state.Config.Enabled,
		"members":        len(m.state.Members),
		"activeSessions": countByStatus(m.state.Sessions, "running"),
		"totalSessions":  len(m.state.Sessions),
		"rotationRooms":  len(m.state.RotationRooms),
		"hooks":          len(m.state.Hooks),
		"smartPilot":     m.state.SmartPilot.Enabled,
	}
}

func countByStatus(sessions []localCouncilSession, status string) int {
	count := 0
	for _, s := range sessions {
		if s.Status == status {
			count++
		}
	}
	return count
}

func (m *localCouncilManager) Toggle(enabled bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Config.Enabled = enabled
	m.save()
}

func (m *localCouncilManager) AddMockSupervisor(member localCouncilMember) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Config.MockSupervisors = append(m.state.Config.MockSupervisors, member)
	m.save()
}

func (m *localCouncilManager) AddSupervisor(member localCouncilMember) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Config.Supervisors = append(m.state.Config.Supervisors, member)
	m.state.Members = append(m.state.Members, member)
	m.save()
}

func (m *localCouncilManager) ClearSupervisors() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := len(m.state.Config.Supervisors)
	m.state.Config.Supervisors = []localCouncilMember{}
	m.save()
	return count
}
