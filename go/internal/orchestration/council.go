package orchestration

import (
	"context"
	"fmt"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

var autoRoute = ai.AutoRoute

type DebateResult struct {
	Approved      bool               `json:"approved"`
	FinalPlan     string             `json:"finalPlan"`
	Consensus     float64            `json:"consensus"`
	Contributions []DebateContribution `json:"contributions"`
}

type DebateContribution struct {
	Role    string `json:"role"`
	Message string `json:"message"`
}

// RunDebate executes a synchronous multi-agent council debate natively in Go.
// The Architect proposes an implementation strategy for the given objective.
// The Security Reviewer critiques it.
// The Lead Engineer synthesizes a final approved plan.
func RunDebate(ctx context.Context, objective string, contextData string) (*DebateResult, error) {
	contributions := []DebateContribution{}

	// 1. The Architect Proposes a Plan
	architectPrompt := fmt.Sprintf(`You are the Principal Architect.
Objective: %s
Context: %s

Propose a high-level implementation plan. Be concise and focus on structural integrity.`, objective, contextData)

	architectResp, err := autoRoute(ctx, []ai.Message{
		{Role: "user", Content: architectPrompt},
	})
	if err != nil {
		return nil, fmt.Errorf("architect failed: %w", err)
	}
	contributions = append(contributions, DebateContribution{
		Role:    "Architect",
		Message: architectResp.Content,
	})

	// 2. The Security Reviewer Critiques
	reviewerPrompt := fmt.Sprintf(`You are the Security Reviewer.
The Architect proposed this plan:
%s

Review this plan strictly for security vulnerabilities, edge cases, and failure modes. If it is safe, say "APPROVE". Otherwise, list concerns.`, architectResp.Content)

	reviewerResp, err := autoRoute(ctx, []ai.Message{
		{Role: "user", Content: reviewerPrompt},
	})
	if err != nil {
		return nil, fmt.Errorf("reviewer failed: %w", err)
	}
	contributions = append(contributions, DebateContribution{
		Role:    "Security Reviewer",
		Message: reviewerResp.Content,
	})

	// 3. The Lead Engineer Synthesizes and Approves
	leadPrompt := fmt.Sprintf(`You are the Lead Engineer.
Architect Plan:
%s

Reviewer Critique:
%s

Synthesize the final, actionable implementation plan incorporating the critique. If the reviewer rejected it fundamentally, output "REJECTED" as the first word.`, architectResp.Content, reviewerResp.Content)

	leadResp, err := autoRoute(ctx, []ai.Message{
		{Role: "user", Content: leadPrompt},
	})
	if err != nil {
		return nil, fmt.Errorf("lead engineer failed: %w", err)
	}
	contributions = append(contributions, DebateContribution{
		Role:    "Lead Engineer",
		Message: leadResp.Content,
	})

	approved := !strings.HasPrefix(strings.ToUpper(strings.TrimSpace(leadResp.Content)), "REJECTED")

	// Simple heuristic consensus
	consensus := 1.0
	if !approved {
		consensus = 0.0
	} else if strings.Contains(strings.ToUpper(reviewerResp.Content), "APPROVE") {
		consensus = 1.0
	} else {
		consensus = 0.7 // Approved with modifications
	}

	return &DebateResult{
		Approved:      approved,
		FinalPlan:     leadResp.Content,
		Consensus:     consensus,
		Contributions: contributions,
	}, nil
}

type ConsensusResult struct {
	Reached   bool     `json:"reached"`
	Decision  string   `json:"decision"`
	Agreement float64  `json:"agreement"`
	Opinions  []string `json:"opinions"`
}

// RunConsensus seeks consensus from multiple models (or simulated agents)
func RunConsensus(ctx context.Context, prompt string, models []string, required float64) (*ConsensusResult, error) {
	if len(models) == 0 {
		models = []string{"default", "default"} // Simulate at least 2
	}
	
	opinions := make([]string, 0, len(models))
	
	for _ = range models {
		resp, err := autoRoute(ctx, []ai.Message{
			{Role: "system", Content: "You are an independent council member. Provide your direct opinion on the prompt."},
			{Role: "user", Content: prompt},
		})
		if err != nil {
			opinions = append(opinions, fmt.Sprintf("Error: %v", err))
		} else {
			opinions = append(opinions, resp.Content)
		}
	}
	
	// Judge consensus
	judgePrompt := fmt.Sprintf("Here are %d opinions on the prompt '%s':\n\n", len(opinions), prompt)
	for i, op := range opinions {
		judgePrompt += fmt.Sprintf("Opinion %d: %s\n\n", i+1, op)
	}
	judgePrompt += "Do these opinions agree? Calculate the agreement percentage (0 to 100). If they agree generally, summarize the decision. Format your response exactly as: \nAGREEMENT: [number]\nDECISION: [summary]"

	judgeResp, err := autoRoute(ctx, []ai.Message{
		{Role: "user", Content: judgePrompt},
	})
	
	decision := "Could not determine consensus"
	agreement := 50.0
	
	if err == nil {
		lines := strings.Split(judgeResp.Content, "\n")
		for _, line := range lines {
			if strings.HasPrefix(strings.ToUpper(line), "AGREEMENT:") {
				fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(strings.ToUpper(line), "AGREEMENT:")), "%f", &agreement)
			}
			if strings.HasPrefix(strings.ToUpper(line), "DECISION:") {
				decision = strings.TrimSpace(strings.TrimPrefix(line, "DECISION:"))
				decision = strings.TrimPrefix(decision, "DECISION: ")
			}
		}
	}
	
	reqAgreement := required
	if reqAgreement <= 0 {
		reqAgreement = 70.0 // Default 70%
	}
	
	return &ConsensusResult{
		Reached:   agreement >= reqAgreement,
		Decision:  decision,
		Agreement: agreement,
		Opinions:  opinions,
	}, nil
}
