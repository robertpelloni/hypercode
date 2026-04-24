package services

import (
	"encoding/json"
	"fmt"
	"strings"
)

type ReviewPersona struct {
	Role   string `json:"role"`
	Prompt string `json:"prompt"`
}

type ReviewRequest struct {
	CodeContext    string          `json:"codeContext"`
	Provider       string          `json:"provider"`
	Model          string          `json:"model"`
	APIKey         string          `json:"apiKey"`
	SystemPrompt   string          `json:"systemPrompt"`
	ReviewType     string          `json:"reviewType"`
	CustomPersonas []ReviewPersona `json:"customPersonas"`
	OutputFormat   string          `json:"outputFormat"`
}

type ReviewIssue struct {
	Severity    string `json:"severity"`
	Category    string `json:"category"`
	File        string `json:"file,omitempty"`
	Line        int    `json:"line,omitempty"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

type ReviewResult struct {
	Summary   string        `json:"summary"`
	Score     int           `json:"score"`
	Issues    []ReviewIssue `json:"issues"`
	RawOutput string        `json:"rawOutput,omitempty"`
}

func normalizeReviewProvider(request ReviewRequest) (string, string, string) {
	provider := normalizeProvider(request.Provider)
	apiKey := strings.TrimSpace(request.APIKey)
	if apiKey == "" || apiKey == "placeholder" {
		apiKey = getSupervisorAPIKey(provider, nil)
	}
	model := resolveModel(provider, request.Model)
	return provider, apiKey, model
}

func runStructuredReview(request ReviewRequest) (ReviewResult, error) {
	provider, apiKey, model := normalizeReviewProvider(request)
	if apiKey == "" {
		return ReviewResult{}, fmt.Errorf("missing API key for review")
	}

	systemPrompt := `You are an expert code reviewer. Analyze the code and provide a structured JSON response.
Response Format (JSON):
{
  "summary": "Brief overall summary of the code quality and main issues",
  "score": 85,
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "category": "Security" | "Performance" | "Style" | "Logic",
      "description": "Description of the issue",
      "suggestion": "How to fix it",
      "line": 10
    }
  ]
}`
	if strings.TrimSpace(request.SystemPrompt) != "" {
		systemPrompt = request.SystemPrompt
	}

	var parsed ReviewResult
	if err := generateStructuredJSON(provider, apiKey, model, systemPrompt, []LLMMessage{{
		Role:    "user",
		Content: request.CodeContext,
	}}, &parsed); err != nil {
		return ReviewResult{}, err
	}
	if parsed.Summary == "" {
		parsed.Summary = "No summary provided."
	}
	return parsed, nil
}

func runComprehensiveReview(request ReviewRequest) (string, error) {
	provider, apiKey, model := normalizeReviewProvider(request)
	if apiKey == "" {
		return "", fmt.Errorf("missing API key for review")
	}

	personas := request.CustomPersonas
	if len(personas) == 0 {
		personas = []ReviewPersona{
			{Role: "Security Expert", Prompt: "You are a Security Expert. Review this code strictly for security vulnerabilities, injection risks, and data handling issues. Be brief and list only high-severity concerns."},
			{Role: "Performance Engineer", Prompt: "You are a Performance Engineer. Review this code for algorithmic inefficiencies, memory leaks, and scaling bottlenecks. Be brief."},
			{Role: "Clean Code Advocate", Prompt: "You are a Senior Engineer focused on maintainability. Review naming, structure, and readability. Be brief."},
		}
	}

	sections := make([]string, 0, len(personas))
	for _, persona := range personas {
		content, err := generateLLMText(provider, apiKey, model, persona.Prompt, []LLMMessage{{
			Role:    "user",
			Content: request.CodeContext,
		}})
		if err != nil {
			sections = append(sections, fmt.Sprintf("### %s Review\n(Failed to generate review: %s)", persona.Role, err.Error()))
			continue
		}
		sections = append(sections, fmt.Sprintf("### %s Review\n%s", persona.Role, content.Content))
	}

	return fmt.Sprintf("# Comprehensive Code Review\n\n%s", strings.Join(sections, "\n\n")), nil
}

func RunCodeReview(request ReviewRequest) (string, error) {
	if strings.TrimSpace(request.CodeContext) == "" {
		return "", fmt.Errorf("codeContext is required")
	}

	if request.OutputFormat == "json" {
		result, err := runStructuredReview(request)
		if err != nil {
			fallback := ReviewResult{Summary: "Failed to generate structured review.", Score: 0, Issues: []ReviewIssue{}, RawOutput: err.Error()}
			payload, _ := json.Marshal(fallback)
			return string(payload), nil
		}
		payload, _ := json.Marshal(result)
		return string(payload), nil
	}

	if request.ReviewType == "comprehensive" {
		return runComprehensiveReview(request)
	}

	provider, apiKey, model := normalizeReviewProvider(request)
	if apiKey == "" {
		return "", fmt.Errorf("missing API key for review")
	}
	systemPrompt := request.SystemPrompt
	if strings.TrimSpace(systemPrompt) == "" {
		systemPrompt = `You are an expert code reviewer.
Review the provided code context.
- Identify potential bugs, security issues, and performance bottlenecks.
- Suggest improvements for readability and maintainability.
- Be concise and actionable.`
	}
	result, err := generateLLMText(provider, apiKey, model, systemPrompt, []LLMMessage{{
		Role:    "user",
		Content: request.CodeContext,
	}})
	if err != nil {
		return "", err
	}
	return result.Content, nil
}
