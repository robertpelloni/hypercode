package git

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// GitFileStatus represents a file change from git status output
type GitFileStatus struct {
	Path   string `json:"path"`
	Status string `json:"status"`
}

// GitStatus represents git status information
type GitStatus struct {
	Files  []GitFileStatus `json:"files"`
	Branch string          `json:"branch,omitempty"`
}

// GitDiff represents git diff information
type GitDiff struct {
	Diff string `json:"diff"`
}

// GitNumstatFile represents a file with numstat information
type GitNumstatFile struct {
	Path      string `json:"path"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
}

// GitNumstat represents line-level statistics for changes
type GitNumstat struct {
	Files []GitNumstatFile `json:"files"`
}

// GitLogEntry represents a single commit in the git log
type GitLogEntry struct {
	Hash      string   `json:"hash"`
	ShortHash string   `json:"shortHash"`
	Author    string   `json:"author"`
	Date      string   `json:"date"`
	Refs      []string `json:"refs"`
	Subject   string   `json:"subject"`
	Additions int      `json:"additions"`
	Deletions int      `json:"deletions"`
}

// WorktreeInfo represents information about a git worktree
type WorktreeInfo struct {
	Exists        bool   `json:"exists"`
	IsWorktree    bool   `json:"isWorktree"`
	CurrentBranch string `json:"currentBranch,omitempty"`
	RepoRoot      string `json:"repoRoot,omitempty"`
}

// WorktreeSetupResult represents the result of setting up a worktree
type WorktreeSetupResult struct {
	Success         bool   `json:"success"`
	Error           string `json:"error,omitempty"`
	Created         bool   `json:"created"`
	CurrentBranch   string `json:"currentBranch"`
	RequestedBranch string `json:"requestedBranch"`
	BranchMismatch  bool   `json:"branchMismatch"`
}

// GitService provides methods for interacting with git repositories
type GitService struct {}

// NewGitService creates a new GitService
func NewGitService() *GitService {
	return &GitService{}
}

// execGit executes a git command and returns stdout and stderr
func (s *GitService) execGit(args []string, cwd string) (string, string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = cwd
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

// IsRepo checks if a directory is a git repository
func (s *GitService) IsRepo(cwd string) (bool, error) {
	_, _, err := s.execGit([]string{"rev-parse", "--is-inside-work-tree"}, cwd)
	if err != nil {
		return false, nil
	}
	return true, nil
}

// GetStatus returns git status and current branch
func (s *GitService) GetStatus(cwd string) (*GitStatus, error) {
	statusStdout, _, err := s.execGit([]string{"status", "--porcelain"}, cwd)
	if err != nil {
		return nil, fmt.Errorf("failed to get git status: %w", err)
	}

	branchStdout, _, err := s.execGit([]string{"rev-parse", "--abbrev-ref", "HEAD"}, cwd)
	if err != nil {
		// Might be an empty repo with no HEAD
		branchStdout = ""
	}

	files := s.ParseGitStatusPorcelain(statusStdout)
	return &GitStatus{
		Files:  files,
		Branch: strings.TrimSpace(branchStdout),
	}, nil
}

// GetDiff returns git diff for specific files or all changes
func (s *GitService) GetDiff(cwd string, files []string) (*GitDiff, error) {
	args := []string{"diff"}
	if len(files) > 0 {
		args = append(args, "--")
		args = append(args, files...)
	}

	stdout, _, err := s.execGit(args, cwd)
	if err != nil {
		return nil, fmt.Errorf("failed to get git diff: %w", err)
	}

	return &GitDiff{Diff: stdout}, nil
}

// GetNumstat returns line-level statistics for changes
func (s *GitService) GetNumstat(cwd string) (*GitNumstat, error) {
	stdout, _, err := s.execGit([]string{"diff", "--numstat"}, cwd)
	if err != nil {
		return nil, fmt.Errorf("failed to get git numstat: %w", err)
	}

	files := s.ParseGitNumstat(stdout)
	return &GitNumstat{Files: files}, nil
}

// GetBranches returns all unique branch names (local and remote)
func (s *GitService) GetBranches(cwd string) ([]string, error) {
	stdout, _, err := s.execGit([]string{"branch", "-a", "--format=%(refname:short)"}, cwd)
	if err != nil {
		return nil, fmt.Errorf("failed to get branches: %w", err)
	}

	return s.ParseGitBranches(stdout), nil
}

// GetTags returns all tags
func (s *GitService) GetTags(cwd string) ([]string, error) {
	stdout, _, err := s.execGit([]string{"tag", "--list"}, cwd)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}

	return s.ParseGitTags(stdout), nil
}

// GetLog returns git log entries
func (s *GitService) GetLog(cwd string, limit int, search string) ([]GitLogEntry, error) {
	if limit <= 0 {
		limit = 100
	}

	args := []string{
		"log",
		fmt.Sprintf("--max-count=%d", limit),
		"--pretty=format:COMMIT_START%H|%an|%ad|%D|%s",
		"--date=iso-strict",
		"--shortstat",
	}

	if search != "" {
		args = append(args, "--all", fmt.Sprintf("--grep=%s", search), "-i")
	}

	stdout, _, err := s.execGit(args, cwd)
	if err != nil {
		return nil, fmt.Errorf("failed to get git log: %w", err)
	}

	return s.ParseGitLog(stdout), nil
}

// GetRemotes returns the origin remote URL
func (s *GitService) GetRemotes(cwd string) (string, error) {
	stdout, _, err := s.execGit([]string{"remote", "get-url", "origin"}, cwd)
	if err != nil {
		return "", fmt.Errorf("failed to get remote URL: %w", err)
	}
	return strings.TrimSpace(stdout), nil
}

// GetRepoRoot returns the root directory of the git repository
func (s *GitService) GetRepoRoot(cwd string) (string, error) {
	stdout, _, err := s.execGit([]string{"rev-parse", "--show-toplevel"}, cwd)
	if err != nil {
		return "", fmt.Errorf("not a git repository: %w", err)
	}
	return strings.TrimSpace(stdout), nil
}

// WorktreeInfo returns information about a worktree at a given path
func (s *GitService) WorktreeInfo(worktreePath string) (*WorktreeInfo, error) {
	if _, err := os.Stat(worktreePath); os.IsNotExist(err) {
		return &WorktreeInfo{Exists: false, IsWorktree: false}, nil
	}

	isInside, _, err := s.execGit([]string{"rev-parse", "--is-inside-work-tree"}, worktreePath)
	if err != nil || strings.TrimSpace(isInside) != "true" {
		return &WorktreeInfo{Exists: true, IsWorktree: false}, nil
	}

	gitDir, _, err := s.execGit([]string{"rev-parse", "--git-dir"}, worktreePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get git directory: %w", err)
	}
	gitDir = strings.TrimSpace(gitDir)

	gitCommonDir, _, err := s.execGit([]string{"rev-parse", "--git-common-dir"}, worktreePath)
	if err != nil {
		gitCommonDir = gitDir
	} else {
		gitCommonDir = strings.TrimSpace(gitCommonDir)
	}

	isWorktree := gitDir != gitCommonDir

	branch, _, _ := s.execGit([]string{"rev-parse", "--abbrev-ref", "HEAD"}, worktreePath)

	var repoRoot string
	if isWorktree && gitCommonDir != "" {
		absCommonDir := gitCommonDir
		if !filepath.IsAbs(gitCommonDir) {
			absCommonDir = filepath.Join(worktreePath, gitCommonDir)
		}
		repoRoot = filepath.Dir(absCommonDir)
	} else {
		root, _, _ := s.execGit([]string{"rev-parse", "--show-toplevel"}, worktreePath)
		repoRoot = strings.TrimSpace(root)
	}

	return &WorktreeInfo{
		Exists:        true,
		IsWorktree:    isWorktree,
		CurrentBranch: strings.TrimSpace(branch),
		RepoRoot:      repoRoot,
	}, nil
}

// WorktreeSetup creates or reuses a worktree
func (s *GitService) WorktreeSetup(mainRepoCwd, worktreePath, branchName string) (*WorktreeSetupResult, error) {
	mainRepoCwd, _ = filepath.Abs(mainRepoCwd)
	worktreePath, _ = filepath.Abs(worktreePath)

	if strings.HasPrefix(worktreePath, mainRepoCwd+string(os.PathSeparator)) {
		return &WorktreeSetupResult{
			Success: false,
			Error:   "Worktree path cannot be inside the main repository.",
		},
		nil
	}

	pathExists := true
	if _, err := os.Stat(worktreePath); os.IsNotExist(err) {
		pathExists = false
	}

	if pathExists {
		isInside, _, err := s.execGit([]string{"rev-parse", "--is-inside-work-tree"}, worktreePath)
		if err != nil || strings.TrimSpace(isInside) != "true" {
			entries, _ := os.ReadDir(worktreePath)
			if len(entries) == 0 {
				os.Remove(worktreePath)
				pathExists = false
			} else {
				return &WorktreeSetupResult{
					Success: false,
					Error:   "Path exists but is not a git worktree or repository (and is not empty)",
				},
			nil
			}
		}
	}

	if pathExists {
		gitCommonDir, _, _ := s.execGit([]string{"rev-parse", "--git-common-dir"}, worktreePath)
		mainGitDir, _, _ := s.execGit([]string{"rev-parse", "--git-dir"}, mainRepoCwd)

		worktreeCommon := filepath.Clean(filepath.Join(worktreePath, strings.TrimSpace(gitCommonDir)))
		mainGit := filepath.Clean(filepath.Join(mainRepoCwd, strings.TrimSpace(mainGitDir)))

		if worktreeCommon != mainGit {
			return &WorktreeSetupResult{Success: false, Error: "Worktree path belongs to a different repository"}, nil
		}

		currentBranch, _, _ := s.execGit([]string{"rev-parse", "--abbrev-ref", "HEAD"}, worktreePath)
		currBranchTrim := strings.TrimSpace(currentBranch)

		return &WorktreeSetupResult{
			Success:         true,
			Created:         false,
			CurrentBranch:   currBranchTrim,
			RequestedBranch: branchName,
			BranchMismatch:  currBranchTrim != branchName && branchName != "",
		},
		nil
	}

	_, _, err := s.execGit([]string{"rev-parse", "--verify", branchName}, mainRepoCwd)
	branchExists := err == nil

	var args []string
	if branchExists {
		args = []string{"worktree", "add", worktreePath, branchName}
	} else {
		args = []string{"worktree", "add", "-b", branchName, worktreePath}
	}

	_, stderr, err := s.execGit(args, mainRepoCwd)
	if err != nil {
		return &WorktreeSetupResult{Success: false, Error: strings.TrimSpace(stderr)}, nil
	}

	return &WorktreeSetupResult{
		Success:         true,
		Created:         true,
		CurrentBranch:   branchName,
		RequestedBranch: branchName,
		BranchMismatch:  false,
	},
	nil
}

// ParseGitStatusPorcelain parses git status --porcelain output
func (s *GitService) ParseGitStatusPorcelain(stdout string) []GitFileStatus {
	if strings.TrimSpace(stdout) == "" {
		return []GitFileStatus{}
	}

	lines := strings.Split(strings.TrimRight(stdout, "\n"), "\n")
	var files []GitFileStatus

	for _, line := range lines {
		if len(line) < 4 {
			continue
		}
		status := line[0:2]
		path := strings.Split(line[3:], " -> ")[0]
		files = append(files, GitFileStatus{Path: path, Status: status})
	}

	return files
}

// ParseGitNumstat parses git diff --numstat output
func (s *GitService) ParseGitNumstat(stdout string) []GitNumstatFile {
	if strings.TrimSpace(stdout) == "" {
		return []GitNumstatFile{}
	}

	lines := strings.Split(strings.TrimSpace(stdout), "\n")
	var files []GitNumstatFile

	for _, line := range lines {
		parts := strings.Split(line, "\t")
		if len(parts) >= 3 {
			additions := 0
			if parts[0] != "-" {
				additions, _ = strconv.Atoi(parts[0])
			}
			deletions := 0
			if parts[1] != "-" {
				deletions, _ = strconv.Atoi(parts[1])
			}
			files = append(files, GitNumstatFile{
				Path:      parts[2],
				Additions: additions,
				Deletions: deletions,
			})
		}
	}

	return files
}

// ParseGitBranches parses git branch list output
func (s *GitService) ParseGitBranches(stdout string) []string {
	if strings.TrimSpace(stdout) == "" {
		return []string{}
	}

	lines := strings.Split(stdout, "\n")
	branchMap := make(map[string]bool)
	var branches []string

	for _, line := range lines {
		branch := strings.TrimSpace(line)
		if branch == "" || branch == "HEAD" {
			continue
		}
		// Clean up remote branch names (origin/main -> main)
		branch = strings.TrimPrefix(branch, "origin/")
		if !branchMap[branch] {
			branchMap[branch] = true
			branches = append(branches, branch)
		}
	}

	return branches
}

// ParseGitTags parses git tag --list output
func (s *GitService) ParseGitTags(stdout string) []string {
	if strings.TrimSpace(stdout) == "" {
		return []string{}
	}

	lines := strings.Split(stdout, "\n")
	var tags []string
	for _, line := range lines {
		tag := strings.TrimSpace(line)
		if tag != "" {
			tags = append(tags, tag)
		}
	}
	return tags
}

// ParseGitLog parses formatted git log output
func (s *GitService) ParseGitLog(stdout string) []GitLogEntry {
	if strings.TrimSpace(stdout) == "" {
		return []GitLogEntry{}
	}

	blocks := strings.Split(stdout, "COMMIT_START")
	var entries []GitLogEntry

	reAdd := regexp.MustCompile(`(\d+) insertion`)
	reDel := regexp.MustCompile(`(\d+) deletion`)

	for _, block := range blocks {
		block = strings.TrimSpace(block)
		if block == "" {
			continue
		}

		lines := strings.Split(block, "\n")
		if len(lines) == 0 {
			continue
		}

		mainLine := lines[0]
		parts := strings.Split(mainLine, "|")
		if len(parts) < 5 {
			continue
		}

		hash := parts[0]
		author := parts[1]
		date := parts[2]
		refsStr := parts[3]
		subject := strings.Join(parts[4:], "|")

		var refs []string
		if refsStr != "" {
			for _, r := range strings.Split(refsStr, ", ") {
				if r = strings.TrimSpace(r); r != "" {
					refs = append(refs, r)
				}
			}
		}

		additions := 0
		deletions := 0
		for _, line := range lines {
			if strings.Contains(line, "changed") {
				if m := reAdd.FindStringSubmatch(line); len(m) > 1 {
					additions, _ = strconv.Atoi(m[1])
				}
				if m := reDel.FindStringSubmatch(line); len(m) > 1 {
					deletions, _ = strconv.Atoi(m[1])
				}
				break
			}
		}

		shortHash := hash
		if len(hash) > 7 {
			shortHash = hash[:7]
		}

		entries = append(entries, GitLogEntry{
			Hash:      hash,
			ShortHash: shortHash,
			Author:    author,
			Date:      date,
			Refs:      refs,
			Subject:   subject,
			Additions: additions,
			Deletions: deletions,
		})
	}

	return entries
}
