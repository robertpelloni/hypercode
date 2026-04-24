package app

import (
	"context"

	"github.com/RunMaestro/Maestro/internal/fs"
	"github.com/RunMaestro/Maestro/internal/git"
	"github.com/RunMaestro/Maestro/internal/persistence"
	"github.com/RunMaestro/Maestro/internal/process"
	"github.com/RunMaestro/Maestro/internal/ssh"
	"github.com/RunMaestro/Maestro/internal/storage"
	"github.com/RunMaestro/Maestro/internal/types"
)

// App struct represents the core application state and its bound methods for the frontend.
type App struct {
	ctx            context.Context
	processManager *process.ProcessManager
	gitService     *git.GitService
	storage        *storage.SessionStorage
	fsService      *fs.FsService
	persistence    *persistence.PersistenceService
	sshService     *ssh.SshService
}

// NewApp creates a new App instance with its necessary services initialized.
func NewApp() *App {
	return &App{
		processManager: process.NewProcessManager(),
		gitService:     git.NewGitService(),
		storage:        storage.NewSessionStorage(),
		fsService:      fs.NewFsService(),
		persistence:    persistence.NewPersistenceService(""),
		sshService:     ssh.NewSshService(),
	}
}

// Startup is called when the application starts up.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

// ============================================================================
// SSH Methods (Bound to window.go.ssh.SshService)
// ============================================================================

func (a *App) TestSshConnection(config *types.SshRemoteConfig, agentCommand string) (*types.SshRemoteTestResult, error) {
	return a.sshService.TestConnection(config, agentCommand)
}

// ============================================================================
// Filesystem Methods (Bound to window.go.fs.FsService)
// ============================================================================

func (a *App) ReadFile(path string) (string, error) {
	return a.fsService.ReadFile(path)
}

func (a *App) WriteFile(path string, content string) error {
	return a.fsService.WriteFile(path, content)
}

func (a *App) ReadDir(path string) ([]fs.DirEntry, error) {
	return a.fsService.ReadDir(path)
}

// ============================================================================
// Persistence Methods (Bound to window.go.persistence.PersistenceService)
// ============================================================================

func (a *App) GetSettings() (map[string]interface{}, error) {
	return a.persistence.GetSettings()
}

func (a *App) SetSettings(settings map[string]interface{}) error {
	return a.persistence.SetSettings(settings)
}

func (a *App) GetStoragePath() string {
	return a.persistence.GetStoragePath()
}

// ============================================================================
// Git Methods (Bound to window.go.git.GitService in the frontend)
// ============================================================================

func (a *App) GetGitStatus(projectPath string) (*git.GitStatus, error) {
	return a.gitService.GetStatus(projectPath)
}

func (a *App) GetGitDiff(projectPath string) (*git.GitDiff, error) {
	return a.gitService.GetDiff(projectPath, nil)
}

// ============================================================================
// Session Storage Methods (Bound to window.go.storage.SessionStorage)
// ============================================================================

func (a *App) ListSessions(projectPath string) ([]types.AgentSessionInfo, error) {
	return a.storage.ListSessions(projectPath)
}

func (a *App) LoadMessages(sessionID string) (*types.SessionMessagesResult, error) {
	return a.storage.LoadMessages(sessionID)
}

// ============================================================================
// Process Management Methods (Bound to window.go.process.ProcessManager)
// ============================================================================

func (a *App) SpawnProcess(config *process.ProcessConfig) (*process.SpawnResult, error) {
	// Map types.ProcessConfig to process.ProcessConfig here if needed
	// For now, assume they are the same or mapped in the caller
	return a.processManager.Spawn(config)
}

func (a *App) KillProcess(sessionID string) bool {
	return a.processManager.Kill(sessionID)
}

func (a *App) WriteToProcess(sessionID string, data string) bool {
	return a.processManager.Write(sessionID, data)
}
