package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type DebateMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	Name    string `json:"name,omitempty"`
}

type DebateParticipant struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	SystemPrompt string `json:"systemPrompt"`
	Provider     string `json:"provider"`
	Model        string `json:"model"`
	APIKey       string `json:"apiKey,omitempty"`
}

type DebateTurn struct {
	ParticipantID   string    `json:"participantId"`
	ParticipantName string    `json:"participantName"`
	Role            string    `json:"role"`
	Content         string    `json:"content"`
	Timestamp       string    `json:"timestamp"`
	Usage           *LLMUsage `json:"usage,omitempty"`
}

type DebateRound struct {
	RoundNumber int          `json:"roundNumber"`
	Turns       []DebateTurn `json:"turns"`
}

type DebateResult struct {
	ID             string                 `json:"id,omitempty"`
	Topic          string                 `json:"topic,omitempty"`
	Rounds         []DebateRound          `json:"rounds"`
	Summary        string                 `json:"summary,omitempty"`
	History        []DebateMessage        `json:"history"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	TotalUsage     *LLMUsage              `json:"totalUsage,omitempty"`
	RiskScore      int                    `json:"riskScore,omitempty"`
	ApprovalStatus string                 `json:"approvalStatus,omitempty"`
	DurationMs     int64                  `json:"durationMs,omitempty"`
}

type DebateRequest struct {
	Topic        string                 `json:"topic"`
	History      []DebateMessage        `json:"history"`
	Participants []DebateParticipant    `json:"participants"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	Rounds       int                    `json:"rounds,omitempty"`
}

func debateApprovalStatus(score int) string {
	if score < 20 {
		return "approved"
	}
	if score > 80 {
		return "rejected"
	}
	if score > 50 {
		return "flagged"
	}
	return "pending"
}

func normalizeDebateAPIKey(participant DebateParticipant) string {
	apiKey := strings.TrimSpace(participant.APIKey)
	if apiKey != "" && apiKey != "env" && apiKey != "placeholder" {
		return apiKey
	}
	return getSupervisorAPIKey(normalizeProvider(participant.Provider), nil)
}

func RunDebate(request DebateRequest) (DebateResult, error) {
	startTime := time.Now()
	if request.Rounds <= 0 {
		request.Rounds = 1
	}

	currentHistory := make([]DebateMessage, len(request.History))
	copy(currentHistory, request.History)
	rounds := make([]DebateRound, 0, request.Rounds)
	totalUsage := &LLMUsage{}

	for i := 0; i < request.Rounds; i++ {
		turns := make([]DebateTurn, 0, len(request.Participants))
		for _, participant := range request.Participants {
			apiKey := normalizeDebateAPIKey(participant)
			if apiKey == "" {
				turns = append(turns, DebateTurn{
					ParticipantID:   participant.ID,
					ParticipantName: participant.Name,
					Role:            participant.Role,
					Content:         "[Error: Missing API key]",
					Timestamp:       time.Now().Format(time.RFC3339),
				})
				continue
			}

			messages := make([]LLMMessage, 0, len(currentHistory))
			for _, message := range currentHistory {
				messages = append(messages, LLMMessage{Role: message.Role, Content: message.Content})
			}

			systemPrompt := fmt.Sprintf("You are %s, acting as a %s.\n%s\n\nReview the conversation history and provide constructive, specific, concise input.", participant.Name, participant.Role, participant.SystemPrompt)
			result, err := generateLLMText(normalizeProvider(participant.Provider), apiKey, resolveModel(participant.Provider, participant.Model), systemPrompt, messages)
			content := ""
			var usage *LLMUsage
			if err != nil {
				content = fmt.Sprintf("[Error: %s]", err.Error())
			} else {
				content = result.Content
				usage = result.Usage
				if result.Usage != nil {
					totalUsage.PromptTokens += result.Usage.PromptTokens
					totalUsage.CompletionTokens += result.Usage.CompletionTokens
					totalUsage.TotalTokens += result.Usage.TotalTokens
				}
			}

			turns = append(turns, DebateTurn{
				ParticipantID:   participant.ID,
				ParticipantName: participant.Name,
				Role:            participant.Role,
				Content:         content,
				Timestamp:       time.Now().Format(time.RFC3339),
				Usage:           usage,
			})
			currentHistory = append(currentHistory, DebateMessage{
				Role:    "assistant",
				Content: fmt.Sprintf("[%s (%s)]: %s", participant.Name, participant.Role, content),
			})
		}
		rounds = append(rounds, DebateRound{RoundNumber: i + 1, Turns: turns})
	}

	summary := fmt.Sprintf("Debate completed (%d round%s).", request.Rounds, map[bool]string{true: "s", false: ""}[request.Rounds != 1])
	var summaryParticipant *DebateParticipant
	for i := range request.Participants {
		if normalizeDebateAPIKey(request.Participants[i]) != "" {
			summaryParticipant = &request.Participants[i]
			break
		}
	}

	if summaryParticipant != nil {
		messages := make([]LLMMessage, 0, len(currentHistory))
		for _, message := range currentHistory {
			messages = append(messages, LLMMessage{Role: message.Role, Content: message.Content})
		}
		moderatorPrompt := fmt.Sprintf("You are the Moderator and Judge of this technical debate. Topic: %s\nSummarize key arguments, consensus/disagreement, and give a final recommendation in Markdown.", request.Topic)
		apiKey := normalizeDebateAPIKey(*summaryParticipant)
		if result, err := generateLLMText(normalizeProvider(summaryParticipant.Provider), apiKey, resolveModel(summaryParticipant.Provider, summaryParticipant.Model), moderatorPrompt, messages); err == nil && strings.TrimSpace(result.Content) != "" {
			summary = result.Content
			if result.Usage != nil {
				totalUsage.PromptTokens += result.Usage.PromptTokens
				totalUsage.CompletionTokens += result.Usage.CompletionTokens
				totalUsage.TotalTokens += result.Usage.TotalTokens
			}
		}
	}

	riskScore := defaultPlanRiskScore
	approvalStatus := "pending"
	if summaryParticipant != nil {
		apiKey := normalizeDebateAPIKey(*summaryParticipant)
		riskScore = generateRiskScore(normalizeProvider(summaryParticipant.Provider), apiKey, resolveModel(summaryParticipant.Provider, summaryParticipant.Model), request.Topic, summary, defaultPlanRiskScore)
		approvalStatus = debateApprovalStatus(riskScore)
	}

	roundsJSON, _ := json.Marshal(rounds)
	historyJSON, _ := json.Marshal(currentHistory)
	metadataJSON, _ := json.Marshal(request.Metadata)
	workspaceID := "default"
	debateID := uuid.New().String()
	storedSummary := summary
	metadataString := string(metadataJSON)
	debate := models.Debate{
		ID:               debateID,
		Topic:            request.Topic,
		Summary:          &storedSummary,
		Rounds:           string(roundsJSON),
		History:          string(historyJSON),
		Metadata:         &metadataString,
		PromptTokens:     totalUsage.PromptTokens,
		CompletionTokens: totalUsage.CompletionTokens,
		TotalTokens:      totalUsage.TotalTokens,
		WorkspaceID:      &workspaceID,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if err := db.DB.Create(&debate).Error; err != nil {
		return DebateResult{}, err
	}

	return DebateResult{
		ID:             debateID,
		Topic:          request.Topic,
		Rounds:         rounds,
		Summary:        summary,
		History:        currentHistory,
		Metadata:       request.Metadata,
		TotalUsage:     totalUsage,
		RiskScore:      riskScore,
		ApprovalStatus: approvalStatus,
		DurationMs:     time.Since(startTime).Milliseconds(),
	}, nil
}

func ParseStoredDebate(debate models.Debate) (DebateResult, error) {
	var rounds []DebateRound
	var history []DebateMessage
	var metadata map[string]interface{}
	if strings.TrimSpace(debate.Rounds) != "" {
		_ = json.Unmarshal([]byte(debate.Rounds), &rounds)
	}
	if strings.TrimSpace(debate.History) != "" {
		_ = json.Unmarshal([]byte(debate.History), &history)
	}
	if debate.Metadata != nil && strings.TrimSpace(*debate.Metadata) != "" {
		_ = json.Unmarshal([]byte(*debate.Metadata), &metadata)
	}
	summary := ""
	if debate.Summary != nil {
		summary = *debate.Summary
	}
	return DebateResult{
		ID:       debate.ID,
		Topic:    debate.Topic,
		Rounds:   rounds,
		Summary:  summary,
		History:  history,
		Metadata: metadata,
		TotalUsage: &LLMUsage{
			PromptTokens:     debate.PromptTokens,
			CompletionTokens: debate.CompletionTokens,
			TotalTokens:      debate.TotalTokens,
		},
	}, nil
}
