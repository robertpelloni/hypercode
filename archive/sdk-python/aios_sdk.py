import requests
import json
from typing import Dict, Any, Optional


class HypercodeClient:
    """
    Python SDK for Hypercode AI Orchestration System
    """

    def __init__(
        self, base_url: str = "http://localhost:3000", token: Optional[str] = None
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.session = requests.Session()
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})

    def run_agent(
        self, agent_name: str, task: str, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run an autonomous agent on a specific task.
        """
        payload = {"agentName": agent_name, "task": task, "sessionId": session_id}
        response = self.session.post(f"{self.base_url}/api/agents/run", json=payload)
        response.raise_for_status()
        return response.json()

    def list_workflows(self) -> Dict[str, Any]:
        """
        List all available workflows.
        """
        response = self.session.get(f"{self.base_url}/api/workflows")
        response.raise_for_status()
        return response.json()

    def execute_workflow(
        self, workflow_id: str, input_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a visual workflow.
        """
        payload = {"input": input_data} if input_data else {}
        response = self.session.post(
            f"{self.base_url}/api/workflows/{workflow_id}/execute", json=payload
        )
        response.raise_for_status()
        return response.json()

    def get_system_status(self) -> Dict[str, Any]:
        """
        Get the health and status of the Hypercode instance.
        """
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()


# Example usage:
# client = HypercodeClient(token="your_admin_token")
# result = client.run_agent("researcher", "Analyze Hypercode Phase 13 progress")
# print(result)
