package sessionimport

import (
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

type Candidate struct {
	SourceTool     string `json:"sourceTool"`
	SourcePath     string `json:"sourcePath"`
	SessionFormat  string `json:"sessionFormat"`
	LastModifiedAt string `json:"lastModifiedAt,omitempty"`
	EstimatedSize  int64  `json:"estimatedSize"`
}

type RootStatus struct {
	SourceTool string `json:"sourceTool"`
	RootPath   string `json:"rootPath"`
	Exists     bool   `json:"exists"`
}

type Scanner struct {
	WorkspaceRoot string
	HomeDir       string
	MaxFiles      int
}

type discoveryRule struct {
	sourceTool    string
	roots         []string
	fileNameHints []string
}

func NewScanner(workspaceRoot, homeDir string, maxFiles int) Scanner {
	if maxFiles <= 0 {
		maxFiles = 50
	}

	return Scanner{
		WorkspaceRoot: workspaceRoot,
		HomeDir:       homeDir,
		MaxFiles:      maxFiles,
	}
}

func (s Scanner) Scan() ([]Candidate, error) {
	candidates := make([]Candidate, 0, s.MaxFiles)
	seenPaths := make(map[string]struct{}, s.MaxFiles)

	for _, rule := range s.rules() {
		for _, root := range rule.roots {
			if root == "" {
				continue
			}

			info, err := os.Stat(root)
			if err != nil {
				if os.IsNotExist(err) {
					continue
				}
				return nil, err
			}

			if info.IsDir() {
				if err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
					if walkErr != nil {
						return walkErr
					}

					if entry.IsDir() {
						name := strings.ToLower(entry.Name())
						if name == "node_modules" || name == ".git" || name == "dist" || name == "build" || name == "coverage" {
							return filepath.SkipDir
						}
						return nil
					}

					if !isImportableFile(path, rule.fileNameHints) {
						return nil
					}

					info, err := entry.Info()
					if err != nil {
						return nil
					}

					if _, seen := seenPaths[path]; seen {
						return nil
					}

					candidates = append(candidates, Candidate{
						SourceTool:     rule.sourceTool,
						SourcePath:     path,
						SessionFormat:  fileFormat(path),
						LastModifiedAt: info.ModTime().UTC().Format("2006-01-02T15:04:05Z07:00"),
						EstimatedSize:  info.Size(),
					})
					seenPaths[path] = struct{}{}

					if len(candidates) >= s.MaxFiles {
						return errStopScan
					}

					return nil
				}); err != nil && err != errStopScan {
					return nil, err
				}
			} else if isImportableFile(root, rule.fileNameHints) {
				if _, seen := seenPaths[root]; seen {
					continue
				}
				candidates = append(candidates, Candidate{
					SourceTool:     rule.sourceTool,
					SourcePath:     root,
					SessionFormat:  fileFormat(root),
					LastModifiedAt: info.ModTime().UTC().Format("2006-01-02T15:04:05Z07:00"),
					EstimatedSize:  info.Size(),
				})
				seenPaths[root] = struct{}{}
			}

			if len(candidates) >= s.MaxFiles {
				return candidates[:s.MaxFiles], nil
			}
		}
	}

	return candidates, nil
}

func (s Scanner) ScanValidated() ([]ValidationResult, error) {
	candidates, err := s.Scan()
	if err != nil {
		return nil, err
	}

	results := make([]ValidationResult, 0, len(candidates))
	for _, candidate := range candidates {
		results = append(results, ValidateCandidate(candidate))
	}
	return results, nil
}

func (s Scanner) Roots() []RootStatus {
	statuses := make([]RootStatus, 0)
	seen := make(map[string]struct{})
	for _, rule := range s.rules() {
		for _, root := range rule.roots {
			if root == "" {
				continue
			}
			key := rule.sourceTool + "\n" + root
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			_, err := os.Stat(root)
			statuses = append(statuses, RootStatus{
				SourceTool: rule.sourceTool,
				RootPath:   root,
				Exists:     err == nil,
			})
		}
	}
	return statuses
}

func (s Scanner) rules() []discoveryRule {
	appData := filepath.Join(s.HomeDir, "AppData", "Roaming")
	localAppData := filepath.Join(s.HomeDir, "AppData", "Local")

	return []discoveryRule{
		{
			sourceTool:    "claude-code",
			roots:         []string{filepath.Join(s.WorkspaceRoot, ".claude")},
			fileNameHints: []string{"session", "chat", "conversation", "transcript"},
		},
		{
			sourceTool:    "copilot-cli",
			roots:         []string{filepath.Join(s.WorkspaceRoot, ".copilot", "session-state")},
			fileNameHints: []string{"session", "handoff", "checkpoint", "history"},
		},
		{
			sourceTool: "openai",
			roots: []string{
				filepath.Join(s.WorkspaceRoot, ".openai"),
				filepath.Join(s.WorkspaceRoot, ".chatgpt"),
				filepath.Join(s.WorkspaceRoot, "ChatGPT"),
				filepath.Join(s.WorkspaceRoot, "OpenAI"),
				filepath.Join(s.HomeDir, ".openai"),
				filepath.Join(s.HomeDir, ".chatgpt"),
				filepath.Join(s.HomeDir, "ChatGPT"),
				filepath.Join(s.HomeDir, "OpenAI"),
				filepath.Join(s.HomeDir, "Documents", "ChatGPT"),
				filepath.Join(s.HomeDir, "Documents", "OpenAI"),
			},
			fileNameHints: []string{"openai", "chatgpt", "conversation", "history", "export", "session", "messages"},
		},
		{
			sourceTool: "vscode-extensions",
			roots: []string{
				filepath.Join(appData, "Code", "User", "globalStorage", "emptyWindowChatSessions"),
				filepath.Join(appData, "Code - Insiders", "User", "globalStorage", "emptyWindowChatSessions"),
				filepath.Join(appData, "Code", "User", "globalStorage", "github.copilot-chat"),
				filepath.Join(appData, "Code - Insiders", "User", "globalStorage", "github.copilot-chat"),
			},
			fileNameHints: []string{"session", "chat", "copilot", "conversation", "history", "message"},
		},
		{
			sourceTool:    "antigravity",
			roots:         []string{filepath.Join(s.HomeDir, ".gemini", "antigravity", "brain")},
			fileNameHints: []string{"brain", "session", "chat", "conversation", "history", "message"},
		},
		{
			sourceTool: "prism-mcp",
			roots: []string{
				filepath.Join(s.WorkspaceRoot, ".prism-mcp", "data.db"),
				filepath.Join(s.HomeDir, ".prism-mcp", "data.db"),
			},
			fileNameHints: []string{"prism", "data.db", "session", "handoff", "ledger"},
		},
		{
			sourceTool: "llm-cli",
			roots: []string{
				filepath.Join(s.WorkspaceRoot, ".llm", "logs.db"),
				filepath.Join(s.HomeDir, ".llm", "logs.db"),
				filepath.Join(s.HomeDir, ".config", "io.datasette.llm", "logs.db"),
				filepath.Join(s.HomeDir, ".local", "share", "io.datasette.llm", "logs.db"),
				filepath.Join(s.HomeDir, "Library", "Application Support", "io.datasette.llm", "logs.db"),
				filepath.Join(appData, "io.datasette.llm", "logs.db"),
				filepath.Join(localAppData, "io.datasette.llm", "logs.db"),
			},
			fileNameHints: []string{"llm", "logs.db", "conversation", "response", "tool_calls", "tool_results"},
		},
	}
}

var errStopScan = fs.SkipAll

func isImportableFile(path string, fileNameHints []string) bool {
	extension := strings.ToLower(filepath.Ext(path))
	if !slices.Contains([]string{".md", ".mdx", ".txt", ".log", ".json", ".jsonl", ".db"}, extension) {
		return false
	}

	lowerPath := strings.ToLower(path)
	defaultHints := []string{"session", "sessions", "chat", "conversation", "transcript", "history", "prompt", "messages", "handoff"}
	for _, hint := range append(defaultHints, fileNameHints...) {
		if strings.Contains(lowerPath, strings.ToLower(hint)) {
			return true
		}
	}

	return false
}

func fileFormat(path string) string {
	extension := strings.TrimPrefix(strings.ToLower(filepath.Ext(path)), ".")
	if extension == "" {
		return "text"
	}
	return extension
}
