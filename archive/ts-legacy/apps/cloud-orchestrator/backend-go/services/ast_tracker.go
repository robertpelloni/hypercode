package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ASTModificationType classifies types of code modifications
type ASTModificationType string

const (
	ASTFuncAdded      ASTModificationType = "func_added"
	ASTFuncRemoved    ASTModificationType = "func_removed"
	ASTFuncModified   ASTModificationType = "func_modified"
	ASTStructAdded    ASTModificationType = "struct_added"
	ASTStructRemoved  ASTModificationType = "struct_removed"
	ASTImportAdded    ASTModificationType = "import_added"
	ASTImportRemoved  ASTModificationType = "import_removed"
	ASTInterfaceAdded ASTModificationType = "interface_added"
	ASTMethodAdded    ASTModificationType = "method_added"
	ASTMethodRemoved  ASTModificationType = "method_removed"
	ASTTypeAdded      ASTModificationType = "type_added"
	ASTConstAdded     ASTModificationType = "const_added"
	ASTVarAdded       ASTModificationType = "var_added"
	ASTPackageChanged ASTModificationType = "package_changed"
	ASTTestAdded      ASTModificationType = "test_added"
	ASTTestRemoved    ASTModificationType = "test_removed"
)

// ASTModification represents a detected code structure change
type ASTModification struct {
	ID          string              `json:"id"`
	SessionID   string              `json:"sessionId"`
	FilePath    string              `json:"filePath"`
	ModType     ASTModificationType `json:"modType"`
	Name        string              `json:"name"`        // Function/struct/type name
	LineNumber  int                 `json:"lineNumber"`
	OldContent  string              `json:"oldContent,omitempty"`
	NewContent  string              `json:"newContent,omitempty"`
	Language    string              `json:"language"`    // go, typescript, etc.
	RiskLevel   string              `json:"riskLevel"`   // low, medium, high
	Timestamp   time.Time           `json:"timestamp"`
}

// ASTDiff represents the full AST analysis of a file change
type ASTDiff struct {
	FilePath    string             `json:"filePath"`
	SessionID   string             `json:"sessionId"`
	Modifications []ASTModification `json:"modifications"`
	Summary     string             `json:"summary"`
	Stats       ASTDiffStats       `json:"stats"`
}

// ASTDiffStats contains aggregate statistics for a diff
type ASTDiffStats struct {
	FunctionsAdded    int `json:"functionsAdded"`
	FunctionsRemoved  int `json:"functionsRemoved"`
	FunctionsModified int `json:"functionsModified"`
	StructsAdded      int `json:"structsAdded"`
	StructsRemoved    int `json:"structsRemoved"`
	ImportsAdded      int `json:"importsAdded"`
	ImportsRemoved    int `json:"importsRemoved"`
	TestsAdded        int `json:"testsAdded"`
	TestsRemoved      int `json:"testsRemoved"`
	TotalChanges      int `json:"totalChanges"`
	RiskScore         float64 `json:"riskScore"` // 0-100
}

// ASTTracker manages AST modification tracking
type ASTTracker struct {
	modifications []ASTModification
	mu            sync.RWMutex
	maxHistory    int
}

var (
	globalASTTracker *ASTTracker
	astTrackerOnce   sync.Once
)

// GetASTTracker returns the singleton tracker
func GetASTTracker() *ASTTracker {
	astTrackerOnce.Do(func() {
		globalASTTracker = &ASTTracker{
			modifications: make([]ASTModification, 0),
			maxHistory:    50000,
		}
	})
	return globalASTTracker
}

// AnalyzeDiff analyzes a before/after file content pair for AST modifications
func AnalyzeDiff(filePath, sessionID, oldContent, newContent string) ASTDiff {
	lang := detectLanguage(filePath)
	diff := ASTDiff{
		FilePath:  filePath,
		SessionID: sessionID,
	}

	var mods []ASTModification

	switch lang {
	case "go":
		mods = analyzeGoDiff(filePath, sessionID, oldContent, newContent)
	case "typescript", "tsx", "javascript":
		mods = analyzeTSDiff(filePath, sessionID, oldContent, newContent)
	default:
		mods = analyzeGenericDiff(filePath, sessionID, oldContent, newContent)
	}

	diff.Modifications = mods
	diff.Stats = computeASTStats(mods)
	diff.Summary = generateDiffSummary(diff.Stats, filePath)

	// Store modifications
	tracker := GetASTTracker()
	tracker.mu.Lock()
	tracker.modifications = append(tracker.modifications, mods...)
	if len(tracker.modifications) > tracker.maxHistory {
		tracker.modifications = tracker.modifications[len(tracker.modifications)-tracker.maxHistory:]
	}
	tracker.mu.Unlock()

	// Audit log for significant changes
	if diff.Stats.RiskScore > 50 {
		AuditAction("ast_high_risk", sessionID, "file", filePath, "warning",
			fmt.Sprintf("High-risk AST modifications: %s (risk: %.0f, changes: %d)",
				filePath, diff.Stats.RiskScore, diff.Stats.TotalChanges))
	}

	return diff
}

// analyzeGoDiff analyzes Go code changes
func analyzeGoDiff(filePath, sessionID, oldContent, newContent string) []ASTModification {
	var mods []ASTModification

	// Extract Go structures
	oldFuncs := extractGoFunctions(oldContent)
	newFuncs := extractGoFunctions(newContent)

	oldStructs := extractGoStructs(oldContent)
	newStructs := extractGoStructs(newContent)

	oldImports := extractGoImports(oldContent)
	newImports := extractGoImports(newContent)

	oldTypes := extractGoTypes(oldContent)
	newTypes := extractGoTypes(newContent)

	// Detect function changes
	for name, info := range newFuncs {
		if _, exists := oldFuncs[name]; !exists {
			modType := ASTFuncAdded
			if strings.HasPrefix(name, "Test") {
				modType = ASTTestAdded
			}
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    modType,
				Name:       name,
				LineNumber: info.line,
				NewContent: info.body,
				Language:   "go",
				RiskLevel:  assessRisk(modType, info.body),
				Timestamp:  time.Now(),
			})
		}
	}

	for name, info := range oldFuncs {
		if _, exists := newFuncs[name]; !exists {
			modType := ASTFuncRemoved
			if strings.HasPrefix(name, "Test") {
				modType = ASTTestRemoved
			}
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    modType,
				Name:       name,
				LineNumber: info.line,
				OldContent: info.body,
				Language:   "go",
				RiskLevel:  "high",
				Timestamp:  time.Now(),
			})
		}
	}

	for name, newInfo := range newFuncs {
		if oldInfo, exists := oldFuncs[name]; exists && oldInfo.body != newInfo.body {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTFuncModified,
				Name:       name,
				LineNumber: newInfo.line,
				OldContent: oldInfo.body,
				NewContent: newInfo.body,
				Language:   "go",
				RiskLevel:  "medium",
				Timestamp:  time.Now(),
			})
		}
	}

	// Detect struct changes
	for name, info := range newStructs {
		if _, exists := oldStructs[name]; !exists {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTStructAdded,
				Name:       name,
				LineNumber: info.line,
				NewContent: info.body,
				Language:   "go",
				RiskLevel:  "low",
				Timestamp:  time.Now(),
			})
		}
	}

	for name, info := range oldStructs {
		if _, exists := newStructs[name]; !exists {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTStructRemoved,
				Name:       name,
				LineNumber: info.line,
				OldContent: info.body,
				Language:   "go",
				RiskLevel:  "high",
				Timestamp:  time.Now(),
			})
		}
	}

	// Detect import changes
	for _, imp := range newImports {
		if !contains(oldImports, imp) {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-imp-%s", time.Now().UnixNano(), imp),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTImportAdded,
				Name:       imp,
				Language:   "go",
				RiskLevel:  "low",
				Timestamp:  time.Now(),
			})
		}
	}

	for _, imp := range oldImports {
		if !contains(newImports, imp) {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-imp-%s", time.Now().UnixNano(), imp),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTImportRemoved,
				Name:       imp,
				Language:   "go",
				RiskLevel:  "medium",
				Timestamp:  time.Now(),
			})
		}
	}

	// Detect type changes
	for name, info := range newTypes {
		if _, exists := oldTypes[name]; !exists {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTTypeAdded,
				Name:       name,
				LineNumber: info.line,
				Language:   "go",
				RiskLevel:  "low",
				Timestamp:  time.Now(),
			})
		}
	}

	return mods
}

// analyzeTSDiff analyzes TypeScript/JavaScript changes
func analyzeTSDiff(filePath, sessionID, oldContent, newContent string) []ASTModification {
	var mods []ASTModification

	oldFuncs := extractTSFunctions(oldContent)
	newFuncs := extractTSFunctions(newContent)

	for name, info := range newFuncs {
		if _, exists := oldFuncs[name]; !exists {
			mods = append(mods, ASTModification{
				ID:         fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID:  sessionID,
				FilePath:   filePath,
				ModType:    ASTFuncAdded,
				Name:       name,
				LineNumber: info.line,
				Language:   "typescript",
				RiskLevel:  "low",
				Timestamp:  time.Now(),
			})
		}
	}

	for name := range oldFuncs {
		if _, exists := newFuncs[name]; !exists {
			mods = append(mods, ASTModification{
				ID:        fmt.Sprintf("ast-%d-%s", time.Now().UnixNano(), name),
				SessionID: sessionID,
				FilePath:  filePath,
				ModType:   ASTFuncRemoved,
				Name:      name,
				Language:  "typescript",
				RiskLevel: "medium",
				Timestamp: time.Now(),
			})
		}
	}

	return mods
}

// analyzeGenericDiff handles unknown languages
func analyzeGenericDiff(filePath, sessionID, oldContent, newContent string) []ASTModification {
	oldLines := len(strings.Split(oldContent, "\n"))
	newLines := len(strings.Split(newContent, "\n"))

	var mods []ASTModification
	if oldLines == 0 && newLines > 0 {
		mods = append(mods, ASTModification{
			ID:        fmt.Sprintf("ast-%d-new", time.Now().UnixNano()),
			SessionID: sessionID,
			FilePath:  filePath,
			ModType:   ASTFuncAdded,
			Name:      "file_created",
			Language:  detectLanguage(filePath),
			RiskLevel: "low",
			Timestamp: time.Now(),
		})
	}

	return mods
}

// Go AST extraction helpers

type funcInfo struct {
	line int
	body string
}

func extractGoFunctions(content string) map[string]funcInfo {
	result := make(map[string]funcInfo)
	if content == "" {
		return result
	}

	// Match func declarations
	re := regexp.MustCompile(`(?m)^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(`)
	matches := re.FindAllStringSubmatchIndex(content, -1)

	for _, match := range matches {
		name := content[match[2]:match[3]]
		line := strings.Count(content[:match[0]], "\n") + 1
		body := extractGoBlock(content, match[0])
		result[name] = funcInfo{line: line, body: body}
	}

	return result
}

func extractGoStructs(content string) map[string]funcInfo {
	result := make(map[string]funcInfo)
	if content == "" {
		return result
	}

	re := regexp.MustCompile(`(?m)^type\s+(\w+)\s+struct\s*\{`)
	matches := re.FindAllStringSubmatchIndex(content, -1)

	for _, match := range matches {
		name := content[match[2]:match[3]]
		line := strings.Count(content[:match[0]], "\n") + 1
		body := extractGoBlock(content, match[0])
		result[name] = funcInfo{line: line, body: body}
	}

	return result
}

func extractGoImports(content string) []string {
	var imports []string

	// Single imports
	singleRe := regexp.MustCompile(`import\s+"([^"]+)"`)
	for _, m := range singleRe.FindAllStringSubmatch(content, -1) {
		imports = append(imports, m[1])
	}

	// Multi-line imports
	multiRe := regexp.MustCompile(`import\s*\(([^)]+)\)`)
	for _, m := range multiRe.FindAllStringSubmatch(content, -1) {
		lineRe := regexp.MustCompile(`"([^"]+)"`)
		for _, line := range lineRe.FindAllStringSubmatch(m[1], -1) {
			imports = append(imports, line[1])
		}
	}

	return imports
}

func extractGoTypes(content string) map[string]funcInfo {
	result := make(map[string]funcInfo)
	if content == "" {
		return result
	}

	re := regexp.MustCompile(`(?m)^type\s+(\w+)\s+(?:interface|map|\*|func|chan|\[)`)
	matches := re.FindAllStringSubmatchIndex(content, -1)

	for _, match := range matches {
		name := content[match[2]:match[3]]
		line := strings.Count(content[:match[0]], "\n") + 1
		result[name] = funcInfo{line: line}
	}

	return result
}

// extractGoBlock extracts a balanced brace block starting from a position
func extractGoBlock(content string, start int) string {
	braceStart := strings.Index(content[start:], "{")
	if braceStart == -1 {
		return ""
	}
	pos := start + braceStart
	depth := 0
	for i := pos; i < len(content); i++ {
		if content[i] == '{' {
			depth++
		} else if content[i] == '}' {
			depth--
			if depth == 0 {
				return content[pos : i+1]
			}
		}
	}
	return content[pos:]
}

// TS AST extraction helpers

func extractTSFunctions(content string) map[string]funcInfo {
	result := make(map[string]funcInfo)
	if content == "" {
		return result
	}

	// Match function declarations, arrow functions, export functions
	re := regexp.MustCompile(`(?m)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>`)
	matches := re.FindAllStringSubmatchIndex(content, -1)

	for _, match := range matches {
		name := ""
		if match[2] != -1 && match[3] != -1 {
			name = content[match[2]:match[3]]
		} else if match[4] != -1 && match[5] != -1 {
			name = content[match[4]:match[5]]
		}
		if name == "" {
			continue
		}
		line := strings.Count(content[:match[0]], "\n") + 1
		result[name] = funcInfo{line: line}
	}

	return result
}

// Helper functions

func detectLanguage(filePath string) string {
	if strings.HasSuffix(filePath, ".go") {
		return "go"
	}
	if strings.HasSuffix(filePath, ".ts") || strings.HasSuffix(filePath, ".tsx") {
		return "typescript"
	}
	if strings.HasSuffix(filePath, ".js") || strings.HasSuffix(filePath, ".jsx") {
		return "javascript"
	}
	if strings.HasSuffix(filePath, ".py") {
		return "python"
	}
	if strings.HasSuffix(filePath, ".rs") {
		return "rust"
	}
	return "unknown"
}

func assessRisk(modType ASTModificationType, content string) string {
	switch modType {
	case ASTFuncRemoved, ASTStructRemoved:
		return "high"
	case ASTFuncModified, ASTMethodRemoved:
		return "medium"
	case ASTTestAdded:
		return "low"
	default:
		return "low"
	}
}

func computeASTStats(mods []ASTModification) ASTDiffStats {
	stats := ASTDiffStats{}
	for _, mod := range mods {
		switch mod.ModType {
		case ASTFuncAdded:
			stats.FunctionsAdded++
		case ASTFuncRemoved:
			stats.FunctionsRemoved++
		case ASTFuncModified:
			stats.FunctionsModified++
		case ASTStructAdded:
			stats.StructsAdded++
		case ASTStructRemoved:
			stats.StructsRemoved++
		case ASTImportAdded:
			stats.ImportsAdded++
		case ASTImportRemoved:
			stats.ImportsRemoved++
		case ASTTestAdded:
			stats.TestsAdded++
		case ASTTestRemoved:
			stats.TestsRemoved++
		}
		stats.TotalChanges++
	}

	// Risk score: removals are high risk, modifications medium, additions low
	stats.RiskScore = float64(stats.FunctionsRemoved*15+stats.StructsRemoved*10+
		stats.FunctionsModified*5+stats.ImportsRemoved*3) /
		mathMax(float64(stats.TotalChanges), 1) * 10
	if stats.RiskScore > 100 {
		stats.RiskScore = 100
	}

	return stats
}

func generateDiffSummary(stats ASTDiffStats, filePath string) string {
	parts := []string{}
	if stats.FunctionsAdded > 0 {
		parts = append(parts, fmt.Sprintf("%d functions added", stats.FunctionsAdded))
	}
	if stats.FunctionsRemoved > 0 {
		parts = append(parts, fmt.Sprintf("%d functions removed", stats.FunctionsRemoved))
	}
	if stats.FunctionsModified > 0 {
		parts = append(parts, fmt.Sprintf("%d functions modified", stats.FunctionsModified))
	}
	if stats.StructsAdded > 0 {
		parts = append(parts, fmt.Sprintf("%d structs added", stats.StructsAdded))
	}
	if stats.TestsAdded > 0 {
		parts = append(parts, fmt.Sprintf("%d tests added", stats.TestsAdded))
	}
	if len(parts) == 0 {
		return fmt.Sprintf("Minor changes to %s", filePath)
	}
	return fmt.Sprintf("%s in %s (risk: %.0f/100)", strings.Join(parts, ", "), filePath, stats.RiskScore)
}

// GetASTModifications returns recent AST modifications
func GetASTModifications(sessionID string, limit int) []ASTModification {
	tracker := GetASTTracker()
	tracker.mu.RLock()
	defer tracker.mu.RUnlock()

	if limit <= 0 {
		limit = 50
	}

	var result []ASTModification
	for i := len(tracker.modifications) - 1; i >= 0 && len(result) < limit; i-- {
		if sessionID == "" || tracker.modifications[i].SessionID == sessionID {
			result = append(result, tracker.modifications[i])
		}
	}

	return result
}

// GetASTModificationStats returns aggregate AST modification statistics
func GetASTModificationStats() map[string]interface{} {
	tracker := GetASTTracker()
	tracker.mu.RLock()
	defer tracker.mu.RUnlock()

	stats := make(map[string]interface{})
	typeCounts := make(map[ASTModificationType]int)
	riskCounts := map[string]int{"low": 0, "medium": 0, "high": 0}
	langCounts := make(map[string]int)

	for _, mod := range tracker.modifications {
		typeCounts[mod.ModType]++
		riskCounts[mod.RiskLevel]++
		langCounts[mod.Language]++
	}

	stats["totalModifications"] = len(tracker.modifications)
	stats["byType"] = typeCounts
	stats["byRisk"] = riskCounts
	stats["byLanguage"] = langCounts

	return stats
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func mathMax(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
