use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

pub struct HypercodeClient {
    base_url: String,
    token: Option<String>,
    client: reqwest::Client,
}

#[derive(Serialize)]
pub struct AgentRunParams {
    #[serde(rename = "agentName")]
    pub agent_name: String,
    pub task: String,
    #[serde(rename = "sessionId", skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

impl HypercodeClient {
    pub fn new(base_url: &str, token: Option<String>) -> Self {
        Self {
            base_url: base_url.to_string(),
            token,
            client: reqwest::Client::new(),
        }
    }

    pub async fn run_agent(&self, params: AgentRunParams) -> Result<serde_json::Value, reqwest::Error> {
        let url = format!("{}/api/agents/run", self.base_url);
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        
        if let Some(token) = &self.token {
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", token)).unwrap());
        }

        let resp = self.client
            .post(&url)
            .headers(headers)
            .json(&params)
            .send()
            .await?;

        resp.json().await
    }
}
