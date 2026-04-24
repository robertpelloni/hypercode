package services

import (
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

var (
	shadowPilotMu      sync.Mutex
	shadowPilotRunning bool
	diffCheckInterval  = 5 * time.Minute
)

// DiffResult represents a detected change in a repository
type DiffResult struct {
	RepoPath     string
	FilesChanged []string
	Insertions   int
	Deletions    int
	Summary      string
}

// StartShadowPilot begins the background diff monitoring loop
func StartShadowPilot() {
	shadowPilotMu.Lock()
	if shadowPilotRunning {
		shadowPilotMu.Unlock()
		return
	}
	shadowPilotRunning = true
	shadowPilotMu.Unlock()

	go func() {
		ticker := time.NewTicker(diffCheckInterval)
		defer ticker.Stop()

		// Run initial check
		runDiffCheck()

		for range ticker.C {
			shadowPilotMu.Lock()
			if !shadowPilotRunning {
				shadowPilotMu.Unlock()
				return
			}
			shadowPilotMu.Unlock()

			runDiffCheck()
		}
	}()
}

// StopShadowPilot stops the background diff monitoring
func StopShadowPilot() {
	shadowPilotMu.Lock()
	defer shadowPilotMu.Unlock()
	shadowPilotRunning = false
}

// IsShadowPilotRunning returns whether the Shadow Pilot is active
func IsShadowPilotRunning() bool {
	shadowPilotMu.Lock()
	defer shadowPilotMu.Unlock()
	return shadowPilotRunning
}

func runDiffCheck() {
	database := db.DB
	if database == nil {
		return
	}

	// Get all known repo paths
	var repoPaths []models.RepoPath
	database.Find(&repoPaths)

	for _, repo := range repoPaths {
		if repo.LocalPath == "" {
			continue
		}

		// Check if git is available
		if _, err := exec.LookPath("git"); err != nil {
			continue
		}

		// Check if it's a valid git repo
		checkCmd := exec.Command("git", "-C", repo.LocalPath, "rev-parse", "--git-dir")
		if err := checkCmd.Run(); err != nil {
			continue
		}

		// Get the diff stats since last check
		diffResult := checkRepoDiff(repo.LocalPath, repo.SourceID)
		if diffResult == nil {
			continue
		}

		// Only create events for meaningful changes
		if diffResult.Insertions > 0 || diffResult.Deletions > 0 {
			// Record as an audit entry
			database.Create(&models.AuditEntry{
				ID:           uuid.New().String(),
				Action:       "shadow_pilot_diff_detected",
				Actor:        "shadow_pilot",
				ResourceType: "repository",
				ResourceID:   repo.SourceID,
				Status:       "success",
				Summary:      diffResult.Summary,
				Details:      strPtr(fmt.Sprintf("Files: %s", strings.Join(diffResult.FilesChanged, ", "))),
			})

			// Create notification for significant changes (>50 lines)
			totalLines := diffResult.Insertions + diffResult.Deletions
			if totalLines > 50 {
				CreateNotification(
					"action",
					"system",
					fmt.Sprintf("Significant changes detected in %s", repo.SourceID),
					fmt.Sprintf("%d insertions, %d deletions across %d files", diffResult.Insertions, diffResult.Deletions, len(diffResult.FilesChanged)),
					WithSourceID(repo.SourceID),
					WithPriority(1),
				)
			}

			// Detect potential issues: large deletions might indicate regressions
			if diffResult.Deletions > 100 && diffResult.Insertions < 10 {
				database.Create(&models.AnomalyRecord{
					ID:          uuid.New().String(),
					Type:        "potential_regression",
					Severity:    "medium",
					Title:       fmt.Sprintf("Large deletion in %s", repo.SourceID),
					Description: fmt.Sprintf("Detected %d deletions with only %d insertions. This might indicate a regression.", diffResult.Deletions, diffResult.Insertions),
					IsResolved:  false,
				})
			}
		}
	}
}

func checkRepoDiff(repoPath, sourceID string) *DiffResult {
	// Get shortstat diff from HEAD~1
	cmd := exec.Command("git", "-C", repoPath, "diff", "--shortstat", "HEAD~1", "HEAD")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Not a git repo or no commits yet
		return nil
	}

	result := &DiffResult{
		RepoPath: repoPath,
	}

	// Parse shortstat: " 3 files changed, 10 insertions(+), 5 deletions(-)"
	statStr := strings.TrimSpace(string(output))
	if statStr == "" {
		return nil
	}

	result.Insertions = extractStatNumber(statStr, "insertion")
	result.Deletions = extractStatNumber(statStr, "deletion")
	result.Summary = statStr

	// Get changed file names
	nameCmd := exec.Command("git", "-C", repoPath, "diff", "--name-only", "HEAD~1", "HEAD")
	nameOutput, err := nameCmd.CombinedOutput()
	if err == nil {
		files := strings.Split(strings.TrimSpace(string(nameOutput)), "\n")
		for _, f := range files {
			if f != "" {
				result.FilesChanged = append(result.FilesChanged, f)
			}
		}
	}

	return result
}

func extractStatNumber(stat, keyword string) int {
	parts := strings.Fields(stat)
	for i, part := range parts {
		if strings.HasPrefix(part, keyword) {
			if i > 0 {
				var num int
				fmt.Sscanf(parts[i-1], "%d", &num)
				return num
			}
		}
	}
	return 0
}

// GetShadowPilotStatus returns the current Shadow Pilot status
func GetShadowPilotStatus() map[string]interface{} {
	database := db.DB
	if database == nil {
		return map[string]interface{}{"running": false}
	}

	var repoCount int64
	database.Model(&models.RepoPath{}).Count(&repoCount)

	var diffEvents int64
	database.Model(&models.AuditEntry{}).Where("action = ?", "shadow_pilot_diff_detected").Count(&diffEvents)

	return map[string]interface{}{
		"running":    IsShadowPilotRunning(),
		"repoCount":  repoCount,
		"diffEvents": diffEvents,
		"interval":   diffCheckInterval.String(),
	}
}

func strPtr(s string) *string {
	return &s
}
