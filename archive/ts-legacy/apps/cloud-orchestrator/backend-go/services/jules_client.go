package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

const JulesApiBaseUrl = "https://jules.googleapis.com/v1alpha"

type JulesClient struct {
	apiKey    string
	authToken string
}

type JulesSource struct {
	ID       string                 `json:"id"`
	Name     string                 `json:"name"`
	Type     string                 `json:"type"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

func resolveJulesCredentials() (string, string) {
	// 1. Try JULES_AUTH_TOKEN
	if token := strings.TrimSpace(os.Getenv("JULES_AUTH_TOKEN")); token != "" && token != "placeholder" {
		return "", token
	}

	// 2. Try API Keys
	for _, envKey := range []string{"JULES_API_KEY", "GOOGLE_API_KEY"} {
		if key := strings.TrimSpace(os.Getenv(envKey)); key != "" && key != "placeholder" {
			return key, ""
		}
	}

	// 3. Try DB Settings
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err == nil {
		if settings.JulesApiKey != nil {
			val := strings.TrimSpace(*settings.JulesApiKey)
			if val != "" && val != "placeholder" {
				// Detect if it's likely a token or key
				if strings.HasPrefix(val, "ya29.") || len(val) > 100 {
					return "", val
				}
				return val, ""
			}
		}
	}

	return "", ""
}

// NewJulesClient creates a new instance of JulesClient with optional explicit credential
func NewJulesClient(explicit ...string) *JulesClient {
	apiKey, authToken := resolveJulesCredentials()

	if len(explicit) > 0 && strings.TrimSpace(explicit[0]) != "" && explicit[0] != "placeholder" {
		val := strings.TrimSpace(explicit[0])
		if strings.HasPrefix(val, "ya29.") || len(val) > 100 {
			authToken = val
			apiKey = ""
		} else {
			apiKey = val
			authToken = ""
		}
	}

	return &JulesClient{
		apiKey:    apiKey,
		authToken: authToken,
	}
}

func (c *JulesClient) setAuthHeaders(req *http.Request) {
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	} else if c.apiKey != "" {
		req.Header.Set("X-Goog-Api-Key", c.apiKey)
	}
	req.Header.Set("Content-Type", "application/json")
}

func (c *JulesClient) isConfigured() bool {
	return c.apiKey != "" || c.authToken != ""
}

// ApiSession is the raw response structure from the Jules API
type ApiSession struct {
	ID            string `json:"id"`
	SourceContext *struct {
		Source            *string `json:"source"`
		GithubRepoContext *struct {
			StartingBranch *string `json:"startingBranch"`
		} `json:"githubRepoContext"`
	} `json:"sourceContext"`
	Title          *string            `json:"title"`
	State          *string            `json:"state"`
	CreateTime     string             `json:"createTime"`
	UpdateTime     string             `json:"updateTime"`
	LastActivityAt *string            `json:"lastActivityAt"`
	Outputs        []ApiSessionOutput `json:"outputs"`
}

type ApiSessionOutput struct {
	PullRequest *struct {
		URL         string `json:"url"`
		Title       string `json:"title"`
		Description string `json:"description"`
	} `json:"pullRequest"`
}

type GitHubIssue struct {
	Number      int         `json:"number"`
	Title       string      `json:"title"`
	Body        string      `json:"body"`
	HTMLURL     string      `json:"html_url"`
	PullRequest interface{} `json:"pull_request,omitempty"`
}

type apiSource struct {
	Source string                 `json:"source"`
	Name   string                 `json:"name"`
	Raw    map[string]interface{} `json:"-"`
}

func (c *JulesClient) ListSources(filter string) ([]JulesSource, error) {
	if !c.isConfigured() {
		return nil, fmt.Errorf("Jules credentials not found")
	}

	var allSources []apiSource
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/sources?pageSize=100", JulesApiBaseUrl)
		params := make([]string, 0, 2)
		if pageToken != "" {
			params = append(params, "pageToken="+pageToken)
		}
		if strings.TrimSpace(filter) != "" {
			params = append(params, "filter="+filter)
		}
		if len(params) > 0 {
			url += "&" + strings.Join(params, "&")
		}

		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}
		c.setAuthHeaders(req)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}

		var payload struct {
			Sources       []map[string]interface{} `json:"sources"`
			NextPageToken string                   `json:"nextPageToken"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			resp.Body.Close()
			return nil, err
		}
		resp.Body.Close()

		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("Jules API sources request failed with status %d", resp.StatusCode)
		}

		for _, source := range payload.Sources {
			item := apiSource{Raw: source}
			if value, ok := source["source"].(string); ok {
				item.Source = value
			}
			if value, ok := source["name"].(string); ok {
				item.Name = value
			}
			allSources = append(allSources, item)
		}

		pageToken = payload.NextPageToken
		if pageToken == "" {
			break
		}
	}

	results := make([]JulesSource, 0, len(allSources))
	for _, source := range allSources {
		id := source.Source
		if id == "" {
			id = source.Name
		}
		repoPath := id
		if trimmed := strings.TrimPrefix(id, "sources/github/"); trimmed != id {
			repoPath = trimmed
		}
		if strings.TrimSpace(repoPath) == "" {
			repoPath = "Unknown Source"
		}
		results = append(results, JulesSource{
			ID:       id,
			Name:     repoPath,
			Type:     "github",
			Metadata: source.Raw,
		})
	}
	return results, nil
}

// ListSessions fetches all sessions from the Jules API
func (c *JulesClient) ListSessions() ([]models.JulesSession, error) {
	if !c.isConfigured() {
		return nil, fmt.Errorf("Jules credentials not found")
	}

	var results []models.JulesSession
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/sessions?pageSize=100", JulesApiBaseUrl)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		c.setAuthHeaders(req)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("Jules API request failed with status %d: %s", resp.StatusCode, string(body))
		}

		var data struct {
			Sessions      []ApiSession `json:"sessions"`
			NextPageToken string       `json:"nextPageToken"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			return nil, err
		}

		for _, s := range data.Sessions {
			results = append(results, transformSession(s))
		}

		pageToken = data.NextPageToken
		if pageToken == "" {
			break
		}
	}

	return results, nil
}

// GetSession fetches metadata for a single session
func (c *JulesClient) GetSession(id string) (models.JulesSession, error) {
	if !c.isConfigured() {
		return models.JulesSession{}, fmt.Errorf("Jules credentials not found")
	}

	url := fmt.Sprintf("%s/sessions/%s", JulesApiBaseUrl, id)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return models.JulesSession{}, err
	}

	c.setAuthHeaders(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.JulesSession{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return models.JulesSession{}, fmt.Errorf("Jules API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var s ApiSession
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return models.JulesSession{}, err
	}

	return transformSession(s), nil
}

func transformActivity(a map[string]interface{}, sessionId string) models.JulesActivity {
	id, _ := a["id"].(string)
	createTime, _ := a["createTime"].(string)
	createdAt, _ := time.Parse(time.RFC3339, createTime)

	activity := models.JulesActivity{
		ID:        id,
		SessionID: sessionId,
		CreatedAt: createdAt,
		Metadata:  a,
		Role:      "agent",
		Type:      "message",
	}

	// Determine Role and Type
	if _, ok := a["userMessage"]; ok {
		activity.Role = "user"
		if m, ok := a["userMessage"].(map[string]interface{}); ok {
			activity.Content, _ = m["message"].(string)
			if activity.Content == "" {
				activity.Content, _ = m["content"].(string)
			}
		}
	} else if _, ok := a["agentMessaged"]; ok {
		activity.Role = "agent"
		if m, ok := a["agentMessaged"].(map[string]interface{}); ok {
			activity.Content, _ = m["message"].(string)
			if activity.Content == "" {
				activity.Content, _ = m["agentMessage"].(string)
			}
		}
	} else if _, ok := a["planGenerated"]; ok {
		activity.Type = "plan"
		if pg, ok := a["planGenerated"].(map[string]interface{}); ok {
			activity.Content, _ = pg["summary"].(string)
			if activity.Content == "" {
				activity.Content, _ = pg["description"].(string)
			}
		}
	} else if _, ok := a["progressUpdated"]; ok {
		activity.Type = "progress"
		if pu, ok := a["progressUpdated"].(map[string]interface{}); ok {
			activity.Content, _ = pu["progressDescription"].(string)
			if activity.Content == "" {
				activity.Content, _ = pu["message"].(string)
			}

			// Extract artifacts
			if arts, ok := pu["artifacts"].([]interface{}); ok && len(arts) > 0 {
				if first, ok := arts[0].(map[string]interface{}); ok {
					if cs, ok := first["changeSet"].(map[string]interface{}); ok {
						if gp, ok := cs["gitPatch"].(map[string]interface{}); ok {
							activity.Diff, _ = gp["unidiffPatch"].(string)
						}
					}
					if bo, ok := first["bashOutput"].(map[string]interface{}); ok {
						activity.BashOutput, _ = bo["output"].(string)
					}
				}
			}
		}
	} else if _, ok := a["sessionCompleted"]; ok {
		activity.Type = "result"
		if sc, ok := a["sessionCompleted"].(map[string]interface{}); ok {
			activity.Content, _ = sc["summary"].(string)
		}
	}

	if activity.Content == "" {
		activity.Content, _ = a["content"].(string)
		if activity.Content == "" {
			activity.Content, _ = a["text"].(string)
		}
	}

	return activity
}

// ListActivities fetches all activities for a session from the Jules API
func (c *JulesClient) ListActivities(sessionId string) ([]models.JulesActivity, error) {
	if !c.isConfigured() {
		return nil, fmt.Errorf("Jules credentials not found")
	}

	var allActivities []models.JulesActivity
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/sessions/%s/activities?pageSize=1000", JulesApiBaseUrl, sessionId)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		c.setAuthHeaders(req)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("Jules API activities request failed with status %d: %s", resp.StatusCode, string(body))
		}

		var data struct {
			Activities    []map[string]interface{} `json:"activities"`
			NextPageToken string                   `json:"nextPageToken"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			return nil, err
		}

		for _, a := range data.Activities {
			allActivities = append(allActivities, transformActivity(a, sessionId))
		}

		pageToken = data.NextPageToken
		if pageToken == "" {
			break
		}
	}

	return allActivities, nil
}

func normalizeGitHubRepo(sourceID string) (string, error) {
	trimmed := strings.TrimSpace(sourceID)
	trimmed = strings.TrimPrefix(trimmed, "sources/github/")
	trimmed = strings.TrimPrefix(trimmed, "github/")
	if strings.Count(trimmed, "/") < 1 {
		return "", fmt.Errorf("invalid GitHub source id: %s", sourceID)
	}
	return trimmed, nil
}

func normalizeSourceForCreate(sourceID string) string {
	trimmed := strings.TrimSpace(sourceID)
	if strings.HasPrefix(trimmed, "sources/") {
		return trimmed
	}
	return "sources/github/" + strings.TrimPrefix(trimmed, "/")
}

// CreateActivityRequest defines the payload for creating a session activity
type CreateActivityRequest struct {
	SessionID string `json:"sessionId,omitempty"`
	Content   string `json:"content"`
	Type      string `json:"type,omitempty"`
	Role      string `json:"role,omitempty"`
}

// CreateActivity sends a message or result to a specific session
func (c *JulesClient) CreateActivity(sessionId string, params CreateActivityRequest) (interface{}, error) {
	if !c.isConfigured() {
		return nil, fmt.Errorf("Jules credentials not found")
	}

	// Default to sendMessage if type is message or empty
	url := fmt.Sprintf("%s/sessions/%s:sendMessage", JulesApiBaseUrl, sessionId)
	
	// If it's a result or has a specific role, we might need the activities endpoint
	if params.Type == "result" {
		url = fmt.Sprintf("%s/sessions/%s/activities", JulesApiBaseUrl, sessionId)
	}

	payload := map[string]string{"prompt": params.Content}
	jsonPayload, _ := json.Marshal(payload)

	var lastErr error
	for i := 0; i < 3; i++ {
		req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonPayload)))
		if err != nil {
			return nil, err
		}

		c.setAuthHeaders(req)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		if resp.StatusCode == 429 {
			lastErr = fmt.Errorf("Jules API error (429): %s", string(body))
			// Exponential Backoff: 5s, 15s, 30s
			backoff := time.Duration((i*i+1)*5) * time.Second
			time.Sleep(backoff)
			continue
		}

		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("Jules API error (%d): %s", resp.StatusCode, string(body))
		}

		var result interface{}
		json.Unmarshal(body, &result)
		return result, nil
	}

	return nil, lastErr
}

func (c *JulesClient) ListIssues(sourceID string) ([]GitHubIssue, error) {
	githubToken := os.Getenv("GITHUB_PAT")
	if githubToken == "" {
		githubToken = os.Getenv("GITHUB_TOKEN")
	}
	if githubToken == "" {
		_ = godotenv.Load("../.env")
		if githubToken = os.Getenv("GITHUB_PAT"); githubToken == "" {
			githubToken = os.Getenv("GITHUB_TOKEN")
		}
	}
	if githubToken == "" {
		return []GitHubIssue{}, nil
	}

	repo, err := normalizeGitHubRepo(sourceID)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/issues?state=open&sort=updated", repo)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "token "+githubToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "Jules-Autopilot-Go")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub issues request failed (%d): %s", resp.StatusCode, string(body))
	}

	var issues []GitHubIssue
	if err := json.NewDecoder(resp.Body).Decode(&issues); err != nil {
		return nil, err
	}

	filtered := make([]GitHubIssue, 0, len(issues))
	for _, issue := range issues {
		if issue.PullRequest != nil {
			continue
		}
		filtered = append(filtered, issue)
	}
	return filtered, nil
}

func (c *JulesClient) UpdateSession(sessionID string, updates map[string]interface{}, updateMask string) (models.JulesSession, error) {
	if !c.isConfigured() {
		return models.JulesSession{}, fmt.Errorf("Jules credentials not found")
	}

	jsonPayload, _ := json.Marshal(updates)
	url := fmt.Sprintf("%s/sessions/%s?updateMask=%s", JulesApiBaseUrl, sessionID, updateMask)
	req, err := http.NewRequest(http.MethodPatch, url, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return models.JulesSession{}, err
	}
	c.setAuthHeaders(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.JulesSession{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return models.JulesSession{}, fmt.Errorf("Jules API updateSession error (%d): %s", resp.StatusCode, string(body))
	}

	var session ApiSession
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return models.JulesSession{}, err
	}
	return transformSession(session), nil
}

func (c *JulesClient) CreateSession(sourceID, prompt, title string) (models.JulesSession, error) {
	if !c.isConfigured() {
		return models.JulesSession{}, fmt.Errorf("Jules credentials not found")
	}

	requestBody := map[string]interface{}{
		"prompt": prompt,
		"sourceContext": map[string]interface{}{
			"source": normalizeSourceForCreate(sourceID),
			"githubRepoContext": map[string]string{
				"startingBranch": "main",
			},
		},
		"title":               title,
		"requirePlanApproval": true,
	}

	jsonPayload, _ := json.Marshal(requestBody)
	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/sessions", JulesApiBaseUrl), strings.NewReader(string(jsonPayload)))
	if err != nil {
		return models.JulesSession{}, err
	}
	c.setAuthHeaders(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.JulesSession{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return models.JulesSession{}, fmt.Errorf("Jules API createSession error (%d): %s", resp.StatusCode, string(body))
	}

	var session ApiSession
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return models.JulesSession{}, err
	}
	return transformSession(session), nil
}

func (c *JulesClient) ApprovePlan(sessionId string) error {
	if !c.isConfigured() {
		return fmt.Errorf("Jules credentials not found")
	}

	url := fmt.Sprintf("%s/sessions/%s:approvePlan", JulesApiBaseUrl, sessionId)
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return err
	}

	c.setAuthHeaders(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Jules API approvePlan error (%d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func transformSession(s ApiSession) models.JulesSession {
	var outputs []models.JulesSessionOutput
	for _, o := range s.Outputs {
		if o.PullRequest != nil {
			outputs = append(outputs, models.JulesSessionOutput{
				PullRequest: &models.PullRequestInfo{
					URL:         o.PullRequest.URL,
					Title:       o.PullRequest.Title,
					Description: o.PullRequest.Description,
				},
			})
		}
	}

	sourceID := ""
	if s.SourceContext != nil && s.SourceContext.Source != nil {
		sourceID = strings.TrimPrefix(*s.SourceContext.Source, "sources/github/")
	}

	title := ""
	if s.Title != nil {
		title = *s.Title
	}

	rawState := ""
	if s.State != nil {
		rawState = *s.State
	}

	branch := "main"
	if s.SourceContext != nil && s.SourceContext.GithubRepoContext != nil && s.SourceContext.GithubRepoContext.StartingBranch != nil {
		branch = *s.SourceContext.GithubRepoContext.StartingBranch
	}

	createdAt, _ := time.Parse(time.RFC3339, s.CreateTime)
	updatedAt, _ := time.Parse(time.RFC3339, s.UpdateTime)

	var lastActivityAt *time.Time
	if s.LastActivityAt != nil {
		t, err := time.Parse(time.RFC3339, *s.LastActivityAt)
		if err == nil {
			lastActivityAt = &t
		}
	}

	return models.JulesSession{
		ID:             s.ID,
		SourceID:       sourceID,
		Title:          title,
		Status:         mapState(rawState),
		RawState:       rawState,
		Branch:         branch,
		Outputs:        outputs,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		LastActivityAt: lastActivityAt,
	}
}

func mapState(state string) string {
	stateMap := map[string]string{
		"COMPLETED":              "completed",
		"ACTIVE":                 "active",
		"PLANNING":               "active",
		"QUEUED":                 "active",
		"IN_PROGRESS":            "active",
		"AWAITING_USER_FEEDBACK": "active",
		"AWAITING_PLAN_APPROVAL": "awaiting_approval",
		"FAILED":                 "failed",
		"PAUSED":                 "paused",
	}

	if val, ok := stateMap[state]; ok {
		return val
	}
	return "active"
}
