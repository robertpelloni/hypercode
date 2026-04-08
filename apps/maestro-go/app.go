package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"maestro-go/internal/agents"
)

type SupervisedSession struct {
	ID                        string            `json:"id"`
	Name                      string            `json:"name"`
	CliType                   string            `json:"cliType"`
	Command                   string            `json:"command"`
	Args                      []string          `json:"args"`
	Env                       map[string]string `json:"env"`
	ExecutionProfile          string            `json:"executionProfile"`
	RequestedWorkingDirectory string            `json:"requestedWorkingDirectory"`
	WorkingDirectory          string            `json:"workingDirectory"`
	WorktreePath              string            `json:"worktreePath,omitempty"`
	AutoRestart               bool              `json:"autoRestart"`
	IsolateWorktree           bool              `json:"isolateWorktree"`
	Status                    string            `json:"status"`
	PID                       int               `json:"pid,omitempty"`
	RestartCount              int               `json:"restartCount"`
	MaxRestarts               int               `json:"maxRestartAttempts"`
	CreatedAt                 int64             `json:"createdAt"`
	StartedAt                 int64             `json:"startedAt,omitempty"`
	StoppedAt                 int64             `json:"stoppedAt,omitempty"`
	ScheduledRestartAt        int64             `json:"scheduledRestartAt,omitempty"`
	LastActivityAt            int64             `json:"lastActivityAt"`
	LastError                 string            `json:"lastError,omitempty"`
	LastExitCode              int               `json:"lastExitCode,omitempty"`
	LastExitSignal            string            `json:"lastExitSignal,omitempty"`
	Metadata                  map[string]any    `json:"metadata"`
}

// App struct
type App struct {
	ctx        context.Context
	processes  map[string]*exec.Cmd
	processMu  sync.Mutex
	apiBaseURL string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		processes:  make(map[string]*exec.Cmd),
		apiBaseURL: "http://127.0.0.1:4000", // Default to HyperCode control plane
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetAgents returns the list of detected agents
func (a *App) ListAgents() []agents.Agent {
	return agents.Detect()
}

func (a *App) apiPost(endpoint string, payload any) error {
	data, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(a.ctx, http.MethodPost, a.apiBaseURL+endpoint, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("API error: %d", resp.StatusCode)
	}
	return nil
}

// CreateSupervisedSession initializes a new background task via the supervisor
func (a *App) CreateSupervisedSession(id, command string, args []string, env map[string]string, cwd string, maxRestarts int) error {
	return a.apiPost("/api/sessions/supervisor/create", map[string]any{
		"id":          id,
		"command":     command,
		"args":        args,
		"env":         env,
		"cwd":         cwd,
		"maxRestarts": maxRestarts,
	})
}

// StartSupervisedSession starts the background task
func (a *App) StartSupervisedSession(id string) error {
	return a.apiPost("/api/sessions/supervisor/start", map[string]any{"id": id})
}

// StopSupervisedSession kills the background task
func (a *App) StopSupervisedSession(id string) error {
	return a.apiPost("/api/sessions/supervisor/stop", map[string]any{"id": id})
}

// ListSupervisedSessions gets all active and stopped tasks
func (a *App) ListSupervisedSessions() []SupervisedSession {
	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, a.apiBaseURL+"/api/sessions/supervisor/list", nil)
	if err != nil {
		return []SupervisedSession{}
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return []SupervisedSession{}
	}
	defer resp.Body.Close()
	
	var payload struct {
		Sessions []SupervisedSession `json:"sessions"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return []SupervisedSession{}
	}
	return payload.Sessions
}

// ExecuteCommand runs a command and streams output to frontend
func (a *App) ExecuteCommand(id string, command string, args []string, cwd string) error {
	cmd := exec.Command(command, args...)
	cmd.Dir = cwd
	
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	a.processMu.Lock()
	a.processes[id] = cmd
	a.processMu.Unlock()

	go a.streamOutput(id, stdout, "stdout")
	go a.streamOutput(id, stderr, "stderr")

	go func() {
		err := cmd.Wait()
		runtime.EventsEmit(a.ctx, "process:exit", map[string]interface{}{
			"id":       id,
			"exitCode": cmd.ProcessState.ExitCode(),
			"error":    err != nil,
		})
		a.processMu.Lock()
		delete(a.processes, id)
		a.processMu.Unlock()
	}()

	return nil
}

func (a *App) streamOutput(id string, rc io.ReadCloser, source string) {
	reader := bufio.NewReader(rc)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			break
		}
		runtime.EventsEmit(a.ctx, "process:data", map[string]interface{}{
			"id":     id,
			"data":   line,
			"source": source,
		})
	}
}

// ResizeProcess changes terminal dimensions
func (a *App) ResizeProcess(id string, cols, rows int) error {
	// PTY resize not implemented in standard os/exec
	// requires a PTY library
	return nil
}

// GetConfig returns the current settings
func (a *App) GetConfig() (map[string]interface{}, error) {
	return map[string]interface{}{
		"activeThemeId": "dracula",
		"llmProvider":   "openrouter",
		"modelSlug":     "anthropic/claude-3.5-sonnet",
	}, nil
}

// ReadDir returns the contents of a directory
func (a *App) ReadDir(path string) ([]map[string]interface{}, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(entries))
	for _, entry := range entries {
		info, _ := entry.Info()
		result = append(result, map[string]interface{}{
			"name":  entry.Name(),
			"isDir": entry.IsDir(),
			"size":  info.Size(),
			"mtime": info.ModTime().UnixMilli(),
		})
	}
	return result, nil
}

// ReadFile returns the content of a file
func (a *App) ReadFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}
