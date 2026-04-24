package services

import (
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// CIFailure represents a detected CI pipeline failure
type CIFailure struct {
	ID          string   `json:"id"`
	RepoPath    string   `json:"repoPath"`
	SourceID    string   `json:"sourceId"`
	Branch      string   `json:"branch"`
	CommitHash  string   `json:"commitHash"`
	CommitMsg   string   `json:"commitMsg"`
	Stage       string   `json:"stage"` // "build", "test", "lint", "deploy"
	Output      string   `json:"output"`
	ErrorLines  []string `json:"errorLines"`
	Severity    string   `json:"severity"` // "low", "medium", "high", "critical"
	IsAutoFixed bool     `json:"isAutoFixed"`
	FixStrategy string   `json:"fixStrategy,omitempty"`
	FixResult   string   `json:"fixResult,omitempty"`
	DetectedAt  time.Time `json:"detectedAt"`
}

// CIFixer analyzes CI failures and generates fix strategies
type CIFixer struct{}

// DetectCIFailures checks for CI failures in tracked repositories
func DetectCIFailures() []CIFailure {
	if db.DB == nil {
		return nil
	}

	var repos []models.RepoPath
	db.DB.Find(&repos)

	var failures []CIFailure
	for _, repo := range repos {
		if repo.LocalPath == "" {
			continue
		}

		// Check if git is available
		if _, err := exec.LookPath("git"); err != nil {
			continue
		}

		// Check if it's a valid git repo
		if err := exec.Command("git", "-C", repo.LocalPath, "rev-parse", "--git-dir").Run(); err != nil {
			continue
		}

		// Check for failed CI indicators
		repoFailures := checkRepoCIStatus(repo)
		failures = append(failures, repoFailures...)
	}

	return failures
}

func checkRepoCIStatus(repo models.RepoPath) []CIFailure {
	var failures []CIFailure

	// Check last commit for common CI failure indicators
	// 1. Check if there are uncommitted changes that might indicate a failed rebase/merge
	statusOutput, err := exec.Command("git", "-C", repo.LocalPath, "status", "--porcelain").CombinedOutput()
	if err != nil {
		return failures
	}

	if len(strings.TrimSpace(string(statusOutput))) > 0 {
		// Has uncommitted changes - potential issue
		lines := strings.Split(strings.TrimSpace(string(statusOutput)), "\n")

		// Check for merge conflict markers
		conflicts := detectMergeConflicts(repo.LocalPath)
		if len(conflicts) > 0 {
			failures = append(failures, CIFailure{
				ID:         uuid.New().String(),
				RepoPath:   repo.LocalPath,
				SourceID:   repo.SourceID,
				Stage:      "merge",
				Output:     fmt.Sprintf("Merge conflicts detected in %d files", len(conflicts)),
				ErrorLines: conflicts,
				Severity:   "high",
				DetectedAt: time.Now(),
			})
		}

		// Check for large number of uncommitted changes (might indicate interrupted work)
		if len(lines) > 50 {
			failures = append(failures, CIFailure{
				ID:          uuid.New().String(),
				RepoPath:    repo.LocalPath,
				SourceID:    repo.SourceID,
				Stage:       "build",
				Output:      fmt.Sprintf("Large number of uncommitted changes: %d files", len(lines)),
				Severity:    "medium",
				DetectedAt:  time.Now(),
			})
		}
	}

	// 2. Check last commit message for failure indicators
	lastMsg, err := exec.Command("git", "-C", repo.LocalPath, "log", "-1", "--format=%s").CombinedOutput()
	if err == nil {
		msg := strings.ToLower(string(lastMsg))
		if strings.Contains(msg, "fixup!") || strings.Contains(msg, "wip") {
			// WIP or fixup commits that might need squashing
			commitHash, _ := exec.Command("git", "-C", repo.LocalPath, "log", "-1", "--format=%H").CombinedOutput()
			branch, _ := exec.Command("git", "-C", repo.LocalPath, "rev-parse", "--abbrev-ref", "HEAD").CombinedOutput()

			failures = append(failures, CIFailure{
				ID:         uuid.New().String(),
				RepoPath:   repo.LocalPath,
				SourceID:   repo.SourceID,
				Branch:     strings.TrimSpace(string(branch)),
				CommitHash: strings.TrimSpace(string(commitHash)),
				CommitMsg:  strings.TrimSpace(string(lastMsg)),
				Stage:      "lint",
				Output:     "WIP or fixup commit detected",
				Severity:   "low",
				DetectedAt: time.Now(),
			})
		}
	}

	// 3. Check if tests can be discovered
	testFiles := discoverTestFiles(repo.LocalPath)
	if len(testFiles) > 0 {
		// Try running a quick syntax check on test files
		for _, tf := range testFiles {
			if hasSyntaxErrors(tf) {
				failures = append(failures, CIFailure{
					ID:         uuid.New().String(),
					RepoPath:   repo.LocalPath,
					SourceID:   repo.SourceID,
					Stage:      "test",
					Output:     fmt.Sprintf("Syntax error in test file: %s", tf),
					Severity:   "high",
					DetectedAt: time.Now(),
				})
			}
		}
	}

	return failures
}

func detectMergeConflicts(repoPath string) []string {
	output, err := exec.Command("git", "-C", repoPath, "diff", "--name-only", "--diff-filter=U").CombinedOutput()
	if err != nil {
		return nil
	}
	var files []string
	for _, f := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if f != "" {
			files = append(files, f)
		}
	}
	return files
}

func discoverTestFiles(repoPath string) []string {
	output, err := exec.Command("git", "-C", repoPath, "ls-files", "*_test.go", "*_test.ts", "*_test.tsx", "*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx").CombinedOutput()
	if err != nil {
		return nil
	}
	var files []string
	for _, f := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if f != "" {
			files = append(files, f)
		}
	}
	return files
}

func hasSyntaxErrors(filePath string) bool {
	// Basic check: if file contains obvious syntax errors
	// In a real implementation, this would use a proper parser
	return false
}

// AnalyzeFailure uses LLM to analyze a CI failure and suggest a fix
func AnalyzeFailure(failure CIFailure) (string, error) {
	provider := getSupervisorProvider()
	apiKey := getSupervisorAPIKey(provider, nil)
	model := resolveModel(provider, "")

	if apiKey == "" {
		return heuristicAnalysis(failure), nil
	}

	prompt := `You are a CI/CD expert. Analyze the following CI failure and provide a concise fix strategy.
Include:
1. Root cause analysis (1-2 sentences)
2. Recommended fix steps (numbered list)
3. Confidence level (high/medium/low)`

	context := fmt.Sprintf("Stage: %s\nSeverity: %s\nOutput:\n%s",
		failure.Stage, failure.Severity, failure.Output)
	if len(failure.ErrorLines) > 0 {
		context += fmt.Sprintf("\nError lines:\n%s", strings.Join(failure.ErrorLines, "\n"))
	}

	result, err := generateLLMText(provider, apiKey, model, prompt, []LLMMessage{{
		Role:    "user",
		Content: context,
	}})
	if err != nil {
		return heuristicAnalysis(failure), nil
	}

	return result.Content, nil
}

func heuristicAnalysis(failure CIFailure) string {
	switch failure.Stage {
	case "merge":
		return "Merge conflict detected. Resolve conflicts manually or use git rerere for automatic resolution."
	case "build":
		return "Build issue detected. Check compilation errors and ensure all dependencies are installed."
	case "test":
		return "Test failure detected. Review test output for assertion errors or runtime exceptions."
	case "lint":
		return "Lint/style issue detected. Run linter with auto-fix flag to resolve common issues."
	default:
		return "CI failure detected. Review output for specific error messages."
	}
}

// RecordCIFailure persists a CI failure for tracking
func RecordCIFailure(failure CIFailure) {
	if db.DB == nil {
		return
	}

	// Store as anomaly
	details := fmt.Sprintf("CI %s failure in %s: %s", failure.Stage, failure.SourceID, failure.Output)

	anomaly := models.AnomalyRecord{
		ID:          failure.ID,
		Type:        fmt.Sprintf("ci_failure_%s", failure.Stage),
		Severity:    failure.Severity,
		Title:       fmt.Sprintf("CI Failure: %s (%s)", failure.Stage, failure.SourceID),
		Description: details,
		IsResolved:  false,
	}
	if err := db.DB.Create(&anomaly).Error; err != nil {
		log.Printf("[CI Monitor] Failed to record anomaly: %v", err)
		return
	}

	// Create notification (best-effort)
	CreateNotification(
		"error",
		"system",
		fmt.Sprintf("CI Failure: %s", failure.Stage),
		details,
		WithSourceID(failure.SourceID),
		WithPriority(1),
	)

	// Audit (best-effort)
	AuditAction("ci_failure_detected", "ci_monitor", "repository", failure.SourceID, "failure", details)
}

// RunCIMonitor is the main CI monitoring loop entry point
func RunCIMonitor() {
	log.Println("[CI Monitor] Running CI failure detection...")
	failures := DetectCIFailures()

	if len(failures) > 0 {
		log.Printf("[CI Monitor] Detected %d CI failures", len(failures))

		for _, failure := range failures {
			// Analyze the failure
			analysis, err := AnalyzeFailure(failure)
			if err != nil {
				log.Printf("[CI Monitor] Analysis failed for %s: %v", failure.ID, err)
				continue
			}

			failure.FixStrategy = analysis

			// Record for tracking
			RecordCIFailure(failure)

			// If high severity and actionable, enqueue a fix job
			if failure.Severity == "high" || failure.Severity == "critical" {
				_, _ = AddJob("ci_auto_fix", map[string]interface{}{
					"failureId":  failure.ID,
					"repoPath":   failure.RepoPath,
					"sourceId":   failure.SourceID,
					"stage":      failure.Stage,
					"fixStrategy": analysis,
				})
			}
		}
	} else {
		log.Println("[CI Monitor] No CI failures detected")
	}
}
