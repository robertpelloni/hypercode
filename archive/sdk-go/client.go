package hypercode

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	BaseURL    string
	AuthToken  string
	HTTPClient *http.Client
}

func NewClient(baseURL string, token string) *Client {
	return &Client{
		BaseURL:    baseURL,
		AuthToken:  token,
		HTTPClient: &http.Client{},
	}
}

type AgentRunParams struct {
	AgentName string `json:"agentName"`
	Task      string `json:"task"`
	SessionID string `json:"sessionId,omitempty"`
}

func (c *Client) RunAgent(params AgentRunParams) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/api/agents/run", c.BaseURL)
	body, _ := json.Marshal(params)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	if c.AuthToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.AuthToken))
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}
