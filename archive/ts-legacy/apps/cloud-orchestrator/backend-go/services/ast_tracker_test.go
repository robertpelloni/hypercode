package services

import (
	"testing"

	"github.com/jules-autopilot/backend/db"
)

func TestAnalyzeGoFunctionAdded(t *testing.T) {
	old := `package main
import "fmt"
func existing() {}
`
	newCode := `package main
import "fmt"
func existing() {}
func newFunc() string { return "hello" }
`

	diff := AnalyzeDiff("test.go", "session-1", old, newCode)
	if len(diff.Modifications) == 0 {
		t.Fatal("Expected at least one modification")
	}

	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "newFunc" && mod.ModType == ASTFuncAdded {
			found = true
			if mod.Language != "go" {
				t.Errorf("Language = %q, want 'go'", mod.Language)
			}
		}
	}
	if !found {
		t.Error("Expected newFunc added modification")
	}

	if diff.Stats.FunctionsAdded != 1 {
		t.Errorf("FunctionsAdded = %d, want 1", diff.Stats.FunctionsAdded)
	}
}

func TestAnalyzeGoFunctionRemoved(t *testing.T) {
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	old := `package main
func keep() {}
func removeMe() {}
`
	newCode := `package main
func keep() {}
`

	diff := AnalyzeDiff("test.go", "session-2", old, newCode)
	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "removeMe" && mod.ModType == ASTFuncRemoved {
			found = true
			if mod.RiskLevel != "high" {
				t.Errorf("RiskLevel = %q, want 'high' for removed func", mod.RiskLevel)
			}
		}
	}
	if !found {
		t.Error("Expected removeMe removed modification")
	}
}

func TestAnalyzeGoFunctionModified(t *testing.T) {
	old := `package main
func compute(a int) int { return a }
`
	newCode := `package main
func compute(a int) int { return a * 2 }
`

	diff := AnalyzeDiff("compute.go", "session-3", old, newCode)
	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "compute" && mod.ModType == ASTFuncModified {
			found = true
			if mod.RiskLevel != "medium" {
				t.Errorf("RiskLevel = %q, want 'medium'", mod.RiskLevel)
			}
		}
	}
	if !found {
		t.Error("Expected compute modified modification")
	}
}

func TestAnalyzeGoStructAdded(t *testing.T) {
	old := `package main`
	newCode := `package main
type Server struct {
	Host string
	Port int
}
`

	diff := AnalyzeDiff("server.go", "session-4", old, newCode)
	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "Server" && mod.ModType == ASTStructAdded {
			found = true
		}
	}
	if !found {
		t.Error("Expected Server struct added")
	}
	if diff.Stats.StructsAdded != 1 {
		t.Errorf("StructsAdded = %d, want 1", diff.Stats.StructsAdded)
	}
}

func TestAnalyzeGoStructRemoved(t *testing.T) {
	old := `package main
type OldStruct struct { Name string }
`
	newCode := `package main`

	diff := AnalyzeDiff("types.go", "session-5", old, newCode)
	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "OldStruct" && mod.ModType == ASTStructRemoved {
			found = true
			if mod.RiskLevel != "high" {
				t.Errorf("RiskLevel = %q, want 'high'", mod.RiskLevel)
			}
		}
	}
	if !found {
		t.Error("Expected OldStruct removed")
	}
}

func TestAnalyzeGoImports(t *testing.T) {
	old := `package main
import "fmt"
import "os"
`
	newCode := `package main
import "fmt"
import "net/http"
`

	diff := AnalyzeDiff("main.go", "session-6", old, newCode)

	addedImport := false
	removedImport := false
	for _, mod := range diff.Modifications {
		if mod.Name == "net/http" && mod.ModType == ASTImportAdded {
			addedImport = true
		}
		if mod.Name == "os" && mod.ModType == ASTImportRemoved {
			removedImport = true
		}
	}
	if !addedImport {
		t.Error("Expected net/http import added")
	}
	if !removedImport {
		t.Error("Expected os import removed")
	}
}

func TestAnalyzeGoMultilineImports(t *testing.T) {
	old := `package main
import (
	"fmt"
	"os"
)
`
	newCode := `package main
import (
	"fmt"
	"net/http"
	"encoding/json"
)
`

	diff := AnalyzeDiff("imports.go", "session-7", old, newCode)
	if diff.Stats.ImportsAdded != 2 {
		t.Errorf("ImportsAdded = %d, want 2", diff.Stats.ImportsAdded)
	}
	if diff.Stats.ImportsRemoved != 1 {
		t.Errorf("ImportsRemoved = %d, want 1", diff.Stats.ImportsRemoved)
	}
}

func TestAnalyzeTestDetection(t *testing.T) {
	old := `package main
func TestExisting(t *testing.T) {}
`
	newCode := `package main
func TestExisting(t *testing.T) {}
func TestNewFeature(t *testing.T) {}
`

	diff := AnalyzeDiff("main_test.go", "session-8", old, newCode)
	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "TestNewFeature" && mod.ModType == ASTTestAdded {
			found = true
		}
	}
	if !found {
		t.Error("Expected TestNewFeature test added")
	}
	if diff.Stats.TestsAdded != 1 {
		t.Errorf("TestsAdded = %d, want 1", diff.Stats.TestsAdded)
	}
}

func TestAnalyzeTypeScript(t *testing.T) {
	old := `export function oldFn() {}`
	newCode := `export function oldFn() {}
export function newFn() { return 42; }
export async function fetchData() {}
`

	diff := AnalyzeDiff("app.tsx", "session-9", old, newCode)
	if diff.Modifications[0].Language != "typescript" {
		t.Errorf("Language = %q, want 'typescript'", diff.Modifications[0].Language)
	}

	found := false
	for _, mod := range diff.Modifications {
		if mod.Name == "newFn" && mod.ModType == ASTFuncAdded {
			found = true
		}
	}
	if !found {
		t.Error("Expected newFn function added in TypeScript")
	}
}

func TestAnalyzeNewFile(t *testing.T) {
	diff := AnalyzeDiff("newfile.go", "session-10", "", "package main\nfunc hello() {}")
	if len(diff.Modifications) == 0 {
		t.Fatal("Expected modifications for new file")
	}
	if diff.Stats.FunctionsAdded < 1 {
		t.Error("Expected at least 1 function added for new file")
	}
}

func TestAnalyzeEmptyDiff(t *testing.T) {
	content := `package main
func same() {}
`
	diff := AnalyzeDiff("same.go", "session-11", content, content)
	if diff.Stats.TotalChanges != 0 {
		t.Errorf("TotalChanges = %d, want 0 for identical content", diff.Stats.TotalChanges)
	}
}

func TestDetectLanguage(t *testing.T) {
	tests := []struct {
		path, want string
	}{
		{"main.go", "go"},
		{"app.tsx", "typescript"},
		{"app.ts", "typescript"},
		{"app.js", "javascript"},
		{"app.jsx", "javascript"},
		{"script.py", "python"},
		{"main.rs", "rust"},
		{"data.json", "unknown"},
	}
	for _, tt := range tests {
		got := detectLanguage(tt.path)
		if got != tt.want {
			t.Errorf("detectLanguage(%q) = %q, want %q", tt.path, got, tt.want)
		}
	}
}

func TestComputeASTStats(t *testing.T) {
	mods := []ASTModification{
		{ModType: ASTFuncAdded, RiskLevel: "low"},
		{ModType: ASTFuncAdded, RiskLevel: "low"},
		{ModType: ASTFuncRemoved, RiskLevel: "high"},
		{ModType: ASTStructAdded, RiskLevel: "low"},
		{ModType: ASTTestAdded, RiskLevel: "low"},
		{ModType: ASTImportAdded, RiskLevel: "low"},
	}
	stats := computeASTStats(mods)
	if stats.FunctionsAdded != 2 {
		t.Errorf("FunctionsAdded = %d, want 2", stats.FunctionsAdded)
	}
	if stats.FunctionsRemoved != 1 {
		t.Errorf("FunctionsRemoved = %d, want 1", stats.FunctionsRemoved)
	}
	if stats.StructsAdded != 1 {
		t.Errorf("StructsAdded = %d, want 1", stats.StructsAdded)
	}
	if stats.TestsAdded != 1 {
		t.Errorf("TestsAdded = %d, want 1", stats.TestsAdded)
	}
	if stats.TotalChanges != 6 {
		t.Errorf("TotalChanges = %d, want 6", stats.TotalChanges)
	}
	if stats.RiskScore <= 0 {
		t.Error("Expected positive risk score with removals")
	}
}

func TestGenerateDiffSummary(t *testing.T) {
	stats := ASTDiffStats{
		FunctionsAdded:    3,
		FunctionsRemoved:  1,
		TestsAdded:        5,
	}
	summary := generateDiffSummary(stats, "main.go")
	if summary == "" {
		t.Error("Expected non-empty summary")
	}
}

func TestGetASTModifications(t *testing.T) {
	// Reset tracker for clean state
	tracker := GetASTTracker()
	tracker.mu.Lock()
	tracker.modifications = nil
	tracker.mu.Unlock()

	AnalyzeDiff("file1.go", "sess-a", "", "package main\nfunc A() {}")
	AnalyzeDiff("file2.go", "sess-b", "", "package main\nfunc B() {}")

	allMods := GetASTModifications("", 10)
	if len(allMods) < 2 {
		t.Errorf("Expected >= 2 modifications, got %d", len(allMods))
	}

	sessAMods := GetASTModifications("sess-a", 10)
	if len(sessAMods) < 1 {
		t.Error("Expected >= 1 modification for sess-a")
	}
}

func TestGetASTModificationStats(t *testing.T) {
	_, _ = db.InitTestDB()

	AnalyzeDiff("stats.go", "sess-stats", "", "package main\nfunc Stats() {}")

	stats := GetASTModificationStats()
	if stats["totalModifications"] == nil {
		t.Error("Expected totalModifications in stats")
	}
}

func TestExtractGoFunctions(t *testing.T) {
	code := `package main
func hello() {}
func (s *Server) Start() {}
func main() {}
`
	funcs := extractGoFunctions(code)
	if len(funcs) < 2 {
		t.Errorf("Expected >= 2 functions, got %d", len(funcs))
	}
	if _, ok := funcs["hello"]; !ok {
		t.Error("Expected 'hello' function")
	}
	if _, ok := funcs["Start"]; !ok {
		t.Error("Expected 'Start' method")
	}
}

func TestExtractGoStructs(t *testing.T) {
	code := `package main
type Server struct { Host string }
type Config struct { Debug bool }
`
	structs := extractGoStructs(code)
	if len(structs) != 2 {
		t.Errorf("Expected 2 structs, got %d", len(structs))
	}
	if _, ok := structs["Server"]; !ok {
		t.Error("Expected 'Server' struct")
	}
}

func TestExtractGoImports(t *testing.T) {
	code := `package main
import "fmt"
import (
	"os"
	"net/http"
)
`
	imports := extractGoImports(code)
	if len(imports) != 3 {
		t.Errorf("Expected 3 imports, got %d: %v", len(imports), imports)
	}
}

func TestExtractGoTypes(t *testing.T) {
	code := `package main
type Handler func(w http.ResponseWriter)
type Reader interface{ Read(p []byte) }
`
	types := extractGoTypes(code)
	if len(types) < 1 {
		t.Errorf("Expected >= 1 type, got %d", len(types))
	}
}

func TestAssessRisk(t *testing.T) {
	if assessRisk(ASTFuncRemoved, "") != "high" {
		t.Error("FuncRemoved should be high risk")
	}
	if assessRisk(ASTStructRemoved, "") != "high" {
		t.Error("StructRemoved should be high risk")
	}
	if assessRisk(ASTFuncModified, "") != "medium" {
		t.Error("FuncModified should be medium risk")
	}
	if assessRisk(ASTFuncAdded, "") != "low" {
		t.Error("FuncAdded should be low risk")
	}
}

func TestContains(t *testing.T) {
	if !contains([]string{"a", "b", "c"}, "b") {
		t.Error("Expected to find 'b'")
	}
	if contains([]string{"a", "b"}, "z") {
		t.Error("Should not find 'z'")
	}
}

func TestMathMax(t *testing.T) {
	if mathMax(3, 5) != 5 {
		t.Error("mathMax(3,5) should be 5")
	}
	if mathMax(7, 2) != 7 {
		t.Error("mathMax(7,2) should be 7")
	}
}

func TestASTModificationTypes(t *testing.T) {
	if ASTFuncAdded != "func_added" {
		t.Error("ASTFuncAdded mismatch")
	}
	if ASTFuncRemoved != "func_removed" {
		t.Error("ASTFuncRemoved mismatch")
	}
	if ASTFuncModified != "func_modified" {
		t.Error("ASTFuncModified mismatch")
	}
	if ASTStructAdded != "struct_added" {
		t.Error("ASTStructAdded mismatch")
	}
	if ASTTestAdded != "test_added" {
		t.Error("ASTTestAdded mismatch")
	}
	if ASTImportAdded != "import_added" {
		t.Error("ASTImportAdded mismatch")
	}
}

func TestRiskScoreCapped(t *testing.T) {
	mods := []ASTModification{
		{ModType: ASTFuncRemoved, RiskLevel: "high"},
		{ModType: ASTFuncRemoved, RiskLevel: "high"},
		{ModType: ASTFuncRemoved, RiskLevel: "high"},
		{ModType: ASTStructRemoved, RiskLevel: "high"},
		{ModType: ASTFuncRemoved, RiskLevel: "high"},
	}
	stats := computeASTStats(mods)
	if stats.RiskScore > 100 {
		t.Errorf("RiskScore = %f, should be capped at 100", stats.RiskScore)
	}
}

func TestAnalyzeGoMethodReceiver(t *testing.T) {
	old := `package main
type Server struct{}`
	newCode := `package main
type Server struct{}
func (s *Server) Handle() {}
func (s *Server) Close() {}
`

	diff := AnalyzeDiff("server.go", "session-methods", old, newCode)
	if diff.Stats.FunctionsAdded < 2 {
		t.Errorf("FunctionsAdded = %d, want >= 2 (methods)", diff.Stats.FunctionsAdded)
	}
}
