import { spawn } from "bun";
import type { Plugin } from "@opencode-ai/plugin";

/**
 * Worker Client for HyperCode (formerly Claude-Mem)
 * Handles communication with the local HyperCode Control Plane running on port 4000.
 */
export class WorkerClient {
  private static readonly PORT = 4000;
  private static readonly BASE_URL = `http://127.0.0.1:${WorkerClient.PORT}`;

  /**
   * Check if the HyperCode Control Plane is healthy
   */
  static async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout

      const response = await fetch(`${this.BASE_URL}/api/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Ensure the worker is running.
   */
  static async ensureRunning(projectRoot: string): Promise<boolean> {
    if (await this.isHealthy()) {
      return true;
    }
    console.warn("[hypercode] Control Plane is not running at http://127.0.0.1:4000");
    console.warn("[hypercode] Please start it manually: hypercode start");
    return false;
  }

  /**
   * Initialize a session (Record user prompt)
   */
  static async sessionInit(claudeSessionId: string, project: string, prompt: string): Promise<{ success: boolean } | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/memory/user-prompts/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: claudeSessionId, 
          projectPath: project, 
          prompt,
          role: "user" 
        })
      });
      if (!response.ok) return null;
      return (await response.json()) as { success: boolean };
    } catch (error) {
      console.error("[hypercode] Failed to init session:", error);
      return null;
    }
  }

  /**
   * Send observation
   */
  static async sendObservation(claudeSessionId: string, toolName: string, toolInput: any, toolResponse: any, cwd: string): Promise<void> {
    try {
      await fetch(`${this.BASE_URL}/api/memory/observations/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: claudeSessionId,
          toolName: toolName,
          args: toolInput,
          result: toolResponse,
          workingDirectory: cwd
        })
      });
    } catch (error) {
      console.error("[hypercode] Failed to send observation:", error);
    }
  }

  /**
   * Trigger summarization
   */
  static async summarize(claudeSessionId: string, lastUserMessage: string, lastAssistantMessage: string): Promise<void> {
    try {
      await fetch(`${this.BASE_URL}/api/memory/session-summaries/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: claudeSessionId,
          summary: lastUserMessage + "\n" + lastAssistantMessage
        })
      });
    } catch (error) {
      console.error("[hypercode] Failed to queue summary:", error);
    }
  }

  /**
   * Complete session
   */
  static async completeSession(claudeSessionId: string): Promise<void> {
    // Session completion logic mapped to HyperCode's session registry
    // Omitted explicit call as summaries act as completion triggers in v1.
  }

  /**
   * Perform Search
   */
  static async search(query: string, project: string): Promise<string> {
      try {
          const response = await fetch(`${this.BASE_URL}/api/memory/search?query=${encodeURIComponent(query)}&limit=5`);
          if (!response.ok) return "Search failed";
          const data = await response.json();
          // Extract text contents from the HyperCode format
          if (data && data.data && Array.isArray(data.data)) {
            return data.data.map((item: any) => `[${item.type}] ${item.content}`).join("\n\n");
          }
          return JSON.stringify(data, null, 2);
      } catch (e) {
          return `Error performing search: ${e}`;
      }
  }
}
