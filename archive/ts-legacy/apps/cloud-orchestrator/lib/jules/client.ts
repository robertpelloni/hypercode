import { safeLocalStorage } from '@/lib/utils';
import { globalRequestQueue } from './request-queue';
import type {
  Source,
  Session,
  Activity,
  SessionOutput,
  SessionTemplate,
  Artifact
} from '@jules/shared';

// API Response Interfaces (Internal)
interface ApiSource {
  source?: string;
  name?: string;
  [key: string]: unknown;
}

interface ApiSessionOutput {
  pullRequest?: {
    url: string;
    title: string;
    description: string;
  };
  [key: string]: unknown;
}

interface ApiSession {
  id: string;
  sourceContext?: {
    source?: string;
    githubRepoContext?: {
      startingBranch?: string;
    };
  };
  title?: string;
  state?: string;
  createTime: string;
  updateTime: string;
  lastActivityAt?: string;
  outputs?: ApiSessionOutput[];
  [key: string]: unknown;
}

interface ApiPlanStep {
  id: string;
  title: string;
  description: string;
  index: number;
}

interface ApiPlan {
  id?: string;
  description?: string;
  summary?: string;
  title?: string;
  steps?: ApiPlanStep[];
  createTime?: string;
  [key: string]: unknown;
}

interface ApiGitPatch {
  unidiffPatch?: string;
  baseCommitId?: string;
  suggestedCommitMessage?: string;
}

interface ApiChangeSet {
  source?: string;
  gitPatch?: ApiGitPatch;
  unidiffPatch?: string; // Legacy/Direct support
}

interface ApiBashOutput {
  command?: string;
  output?: string;
  exitCode?: number;
}

interface ApiArtifact {
  changeSet?: ApiChangeSet;
  bashOutput?: ApiBashOutput;
  media?: { data: string; mimeType: string };
  [key: string]: unknown;
}

interface ApiErrorResponse {
  message?: string;
  error?: {
    message?: string;
    details?: Array<{ reason?: string }>;
  };
}

interface GitHubIssue {
  number: number;
  title: string;
  body?: string;
}

interface ApiActivity {
  name?: string;
  id?: string;
  createTime: string;
  originator?: string;
  planGenerated?: {
    plan?: ApiPlan;
    description?: string;
    summary?: string;
    title?: string;
    steps?: ApiPlanStep[];
    [key: string]: unknown;
  };
  planApproved?: { [key: string]: unknown } | boolean;
  progressUpdated?: {
    progressDescription?: string;
    description?: string;
    message?: string;
    artifacts?: ApiArtifact[];
    [key: string]: unknown;
  };
  sessionCompleted?: {
    summary?: string;
    message?: string;
    artifacts?: ApiArtifact[];
    [key: string]: unknown;
  };
  agentMessaged?: {
    agentMessage?: string;
    message?: string;
    [key: string]: unknown;
  };
  userMessage?: { message?: string; content?: string; [key: string]: unknown };
  userMessaged?: { message?: string; content?: string; [key: string]: unknown }; // Python SDK name
  artifacts?: ApiArtifact[];
  message?: string;
  content?: string;
  text?: string;
  description?: string;
  diff?: string;
  bashOutput?: string;
  [key: string]: unknown;
}

export class JulesAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'JulesAPIError';
  }
}

function getDefaultApiBaseUrl(): string {
  const viteEnv = (() => {
    try {
      return (0, eval)('import.meta.env') as { VITE_JULES_API_BASE_URL?: string } | undefined;
    } catch {
      return undefined;
    }
  })();

  const processEnv = (() => {
    try {
      return process.env as { VITE_JULES_API_BASE_URL?: string } | undefined;
    } catch {
      return undefined;
    }
  })();

  return viteEnv?.VITE_JULES_API_BASE_URL
    || processEnv?.VITE_JULES_API_BASE_URL
    || '/api';
}
export class JulesClient {
  private apiKey?: string;
  private authToken?: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = getDefaultApiBaseUrl(), authToken?: string) {
    this.apiKey = apiKey;
    this.authToken = authToken;
    this.baseUrl = baseUrl;
  }

  private normalizeSessionId(sessionId: string): string {
    if (sessionId.startsWith('sessions/')) {
      return sessionId.slice('sessions/'.length);
    }
    return sessionId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : endpoint.startsWith(this.baseUrl) 
        ? endpoint 
        : `${this.baseUrl}${endpoint}`;

    const isGoogleApi = url.includes('googleapis.com');

    // CONSTRUCT CLEAN HEADERS FROM SCRATCH
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Google Jules API v1alpha Auth Logic:
    if (isGoogleApi) {
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      } else if (this.apiKey) {
        headers['X-Goog-Api-Key'] = this.apiKey;
      }
      
      // LOG THE CLEAN HEADERS
      if (typeof window === 'undefined') {
        console.log(`[JulesClient] Outgoing to Google: auth=${!!this.authToken} key=${!!this.apiKey}`);
      }

      // THROTTLE GOOGLE API REQUESTS
      return globalRequestQueue.add(() => this.performRequest<T>(url, options, headers));
    } else {
      // Local daemon headers
      if (this.apiKey) headers['X-Jules-Api-Key'] = this.apiKey;
      if (this.authToken) headers['X-Jules-Auth-Token'] = this.authToken;
    }
    
    return this.performRequest<T>(url, options, headers);
  }

  private async performRequest<T>(url: string, options: RequestInit, headers: Record<string, string>): Promise<T> {
    try {
      // USE MANUAL FETCH WITHOUT MIDDLEWARE SPREADING
      const response = await fetch(url, {
        method: options.method || 'GET',
        body: options.body,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body');
        let errorData: ApiErrorResponse = {};
        try { errorData = JSON.parse(errorText) as ApiErrorResponse; } catch { /* ignore */ }

        console.error(`[Jules Client] Request failed: ${response.status} ${response.statusText}`, errorText);

        if (response.status === 401) {
          const detail = errorData?.error?.details?.[0]?.reason || errorData?.error?.message || '';
          throw new JulesAPIError(
            `Invalid Credentials. ${detail}`.trim(),
            response.status,
            errorData
          );
        }

        if (response.status === 403) {
          throw new JulesAPIError(
            'Access forbidden. Please ensure your API key and Auth Token have the correct permissions.',
            response.status,
            errorData
          );
        }

        if (response.status === 404) {
          if (endpoint.includes("/activities")) return { activities: [] } as T;
          if (endpoint.includes("/sessions?")) return { sessions: [] } as T;
          if (endpoint.includes("/sources?")) return { sources: [] } as T;
          throw new JulesAPIError('Resource not found.', response.status, errorData);
        }

        throw new JulesAPIError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof JulesAPIError) throw error;
      throw new JulesAPIError(
        error instanceof Error ? error.message : 'Network request failed.',
        undefined,
        error
      );
    }
  }

  // Sources
  async listSources(filter?: string): Promise<Source[]> {
    let allSources: ApiSource[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams();
      params.set("pageSize", "100"); // Request max page size
      if (pageToken) params.set("pageToken", pageToken);
      if (filter) params.set("filter", filter);

      const endpoint = `/sources?${params.toString()}`;
      try {
        const response = await this.request<{ sources?: ApiSource[]; nextPageToken?: string }>(endpoint);

        if (response.sources) {
            allSources = allSources.concat(response.sources);
        }
        pageToken = response.nextPageToken;
      } catch (err) {
         console.error("Failed to list sources:", err);
         break;
      }
    } while (pageToken);

    const sources = allSources.map((source: ApiSource) => {
      const sourcePath = source.source || source.name || "";
      const match = sourcePath.match(/sources\/github\/(.+)/);
      const repoPath = (match ? match[1] : sourcePath) || "Unknown Source";

      return {
        id: sourcePath,
        name: repoPath,
        type: "github" as const,
        metadata: source as Record<string, unknown>,
      };
    });

    // Sort by latest activity if possible
    try {
      const allSessions = await this.listSessions();
      const latestActivityMap = new Map<string, string>();
      for (const session of allSessions) {
        const sourceId = `sources/github/${session.sourceId}`;
        const activityTime = session.lastActivityAt || session.updatedAt || session.createdAt;
        if (!latestActivityMap.has(sourceId) || (activityTime && activityTime > latestActivityMap.get(sourceId)!)) {
          latestActivityMap.set(sourceId, activityTime);
        }
      }
      sources.sort((a, b) => {
        const aTime = latestActivityMap.get(a.id) || "";
        const bTime = latestActivityMap.get(b.id) || "";
        return bTime.localeCompare(aTime);
      });
    } catch (error) {
      console.error("[Jules Client] Failed to sort sources:", error);
    }

    return sources;
  }

  // Session Management
  async listSessions(): Promise<Session[]> {
    const response = await this.request<{ sessions: ApiSession[] }>('/sessions');
    return (response.sessions || []).map(s => this.transformSession(s));
  }

  private mapState(state: string): Session['status'] {
    const stateMap: Record<string, Session['status']> = {
      'COMPLETED': 'completed',
      'ACTIVE': 'active',
      'PLANNING': 'active',
      'QUEUED': 'active',
      'IN_PROGRESS': 'active',
      'AWAITING_USER_FEEDBACK': 'active',
      'AWAITING_PLAN_APPROVAL': 'awaiting_approval',
      'FAILED': 'failed',
      'PAUSED': 'paused'
    };
    return stateMap[state] || 'active';
  }

  private transformSession(session: ApiSession): Session {
      const outputs: SessionOutput[] = (session.outputs || []).map(o => ({
          pullRequest: o.pullRequest
      }));

      const transformed = {
        id: session.id,
        sourceId: session.sourceContext?.source?.replace('sources/github/', '') || (session.sourceId as string) || '',
        title: session.title || '',
        status: this.mapState(session.state || (session.status as string) || ''),
        rawState: session.state || (session.rawState as string),
        createdAt: session.createTime || (session.createdAt as string),
        updatedAt: session.updateTime || (session.updatedAt as string),
        lastActivityAt: session.lastActivityAt,
        branch: session.sourceContext?.githubRepoContext?.startingBranch || (session.branch as string) || 'main',
        outputs: outputs.length > 0 ? outputs : undefined
      };
      return transformed;
  }

  async getSession(id: string): Promise<Session> {
    const normalizedId = this.normalizeSessionId(id);
    const response = await this.request<ApiSession>(`/sessions/${normalizedId}`);
    return this.transformSession(response);
  }

  async createSession(sourceId: string, prompt: string, title: string = 'Untitled Session'): Promise<Session> {
    const requestBody = {
      prompt,
      sourceContext: {
        source: sourceId,
        githubRepoContext: {
          startingBranch: 'main'
        }
      },
      title: title || 'Untitled Session',
      requirePlanApproval: true
    };

    const response = await this.request<ApiSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    
    return this.transformSession(response);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    const normalizedSessionId = this.normalizeSessionId(sessionId);
    const body: Record<string, unknown> = {};
    const updateMaskParts: string[] = [];

    if (updates.status) {
      const stateMap: Record<string, string> = {
        'active': 'ACTIVE',
        'paused': 'PAUSED',
        'completed': 'COMPLETED',
        'failed': 'FAILED',
        'awaiting_approval': 'AWAITING_PLAN_APPROVAL'
      };
      
      if (stateMap[updates.status]) {
        body.state = stateMap[updates.status];
        updateMaskParts.push('state');
      }
    }

    if (updates.title) {
      body.title = updates.title;
      updateMaskParts.push('title');
    }

    if (Object.keys(body).length === 0) {
      return this.getSession(sessionId);
    }

    const updateMask = updateMaskParts.join(',');

    try {
      const response = await this.request<ApiSession>(`/sessions/${normalizedSessionId}?updateMask=${updateMask}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return this.transformSession(response);
    } catch (error) {
      console.error('[JulesClient] Failed to update session:', error);
      throw error;
    }
  }

  async listActivities(sessionId: string, limit: number = 1000): Promise<Activity[]> {
    const normalizedSessionId = this.normalizeSessionId(sessionId);
    let allActivities: ApiActivity[] = [];
    let pageToken: string | undefined;

    try {
      do {
        const params = new URLSearchParams();
        params.set('pageSize', String(limit));
        if (pageToken) {
          params.set('pageToken', pageToken);
        }

        const endpoint = `/sessions/${normalizedSessionId}/activities?${params.toString()}`;
        const response = await this.request<{ activities?: ApiActivity[]; nextPageToken?: string } | ApiActivity[]>(endpoint);
        
        if (Array.isArray(response)) {
          allActivities = response;
          break;
        } else {
          if (response.activities) {
            allActivities = allActivities.concat(response.activities);
          }
          pageToken = response.nextPageToken;
        }
      } while (pageToken);
      
      return allActivities.map(a => this.transformActivity(a, normalizedSessionId));
    } catch (error) {
      console.error('[JulesClient] Failed to list activities:', error);
      throw error;
    }
  }

  private transformActivity(activity: ApiActivity, sessionId: string): Activity {
    let type: Activity['type'] = 'message';
    let role: Activity['role'] = 'agent';
    let content = '';
    let diff: string | undefined;
    let bashOutput: string | undefined;
    let media: { data: string; mimeType: string } | undefined;

    if (activity.userMessage || activity.userMessage) {
      type = 'message';
      role = 'user';
      content = activity.userMessage?.message || activity.userMessage?.content || '';
    } else if (activity.userMessaged) {
      type = 'message';
      role = 'user';
      content = activity.userMessaged.message || activity.userMessaged.content || '';
    } else if (activity.agentMessaged) {
      type = 'message';
      role = 'agent';
      content = activity.agentMessaged.agentMessage || activity.agentMessaged.message || '';
    } else if (activity.planGenerated) {
      type = 'plan';
      role = 'agent';
      const steps = activity.planGenerated.plan?.steps || activity.planGenerated.steps || [];
      const stepsText = steps.map((s: ApiPlanStep) => `${s.index}. ${s.title}`).join('\n');
      content = `Plan Generated:\n${stepsText}`;
    } else if (activity.progressUpdated) {
      type = 'progress';
      role = 'agent';
      content = activity.progressUpdated.progressDescription || 
                activity.progressUpdated.description || 
                activity.progressUpdated.message || '';
      
      const artifacts = activity.progressUpdated.artifacts || [];
      if (artifacts.length > 0) {
          const artifact = artifacts[0];
          if (artifact) {
              diff = artifact.changeSet?.gitPatch?.unidiffPatch || artifact.changeSet?.unidiffPatch;
              bashOutput = artifact.bashOutput?.output;
              media = artifact.media;
          }
      }
    } else if (activity.sessionCompleted) {
      type = 'result';
      role = 'agent';
      content = activity.sessionCompleted.summary || activity.sessionCompleted.message || 'Session Completed';
    }

    if (!content) {
      content = activity.content || activity.message || activity.text || activity.description || '';
    }

    return {
      id: activity.id || `temp-${Date.now()}`,
      sessionId,
      type,
      role,
      content,
      diff,
      bashOutput,
      media,
      createdAt: activity.createTime || (activity.createdAt as string),
      metadata: activity as Record<string, unknown>
    };
  }

  async createActivity(params: { sessionId: string; content: string; type?: string; metadata?: Record<string, unknown>; role?: 'user' | 'agent' }): Promise<Activity> {
    const normalizedSessionId = this.normalizeSessionId(params.sessionId);
    
    try {
        if (params.type === 'message' || !params.type) {
          const response = await this.request<ApiActivity>(`/sessions/${normalizedSessionId}:sendMessage`, {
                method: 'POST',
                body: JSON.stringify({
                    prompt: params.content 
                }),
            });
            
            if (!response || Object.keys(response).length === 0) {
                return {
                    id: `temp-${Date.now()}`,
                    sessionId: normalizedSessionId,
                    type: 'message',
                    role: params.role || 'user',
                    content: params.content,
                    createdAt: new Date().toISOString(),
                    metadata: {}
                };
            }
            
            return this.transformActivity(response, normalizedSessionId);
        } else {
            const body: Record<string, unknown> = {
                content: params.content
            };
            
            if (params.role === 'user') {
                body.userMessage = { message: params.content };
            } else if (params.role === 'agent') {
                 if (params.type === 'result') {
                     body.sessionCompleted = { message: params.content };
                 } else {
                     body.agentMessaged = { message: params.content };
                 }
            } else {
                 body.userMessage = { message: params.content };
            }

            const response = await this.request<ApiActivity>(`/sessions/${normalizedSessionId}/activities`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            
            if (!response || Object.keys(response).length === 0) {
                return {
                    id: `temp-${Date.now()}`,
                    sessionId: normalizedSessionId,
                    type: (params.type as Activity['type']) || 'message',
                    role: params.role || 'user',
                    content: params.content,
                    createdAt: new Date().toISOString(),
                    metadata: {}
                };
            }
    
            return this.transformActivity(response, normalizedSessionId);
        }

    } catch (e) {
        console.warn("Failed to create activity, attempting fallback", e);
        const body = { userMessage: { message: params.content } };
        const response = await this.request<ApiActivity>(`/sessions/${normalizedSessionId}/activities`, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (!response || Object.keys(response).length === 0) {
            return {
                id: `temp-${Date.now()}`,
                sessionId: normalizedSessionId,
                type: 'message',
                role: 'user',
                content: params.content,
                createdAt: new Date().toISOString(),
                metadata: {}
            };
        }

        return this.transformActivity(response, normalizedSessionId);
    }
  }

  async listArtifacts(sessionId: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
      const normalizedSessionId = this.normalizeSessionId(sessionId);
      let pageToken: string | undefined;
    const limit = 50;

    try {
      do {
        const params = new URLSearchParams();
        params.set("pageSize", limit.toString());
        if (pageToken) params.set("pageToken", pageToken);

        const response = await this.request<{ activities?: ApiActivity[], nextPageToken?: string }>(
          `/sessions/${normalizedSessionId}/activities?${params.toString()}`
        );
        
        const activities = (response.activities || []).map(a => this.transformActivity(a, normalizedSessionId));

        for (const activity of activities) {
            const rawActivity = activity.metadata as ApiActivity | undefined;
            if (!rawActivity) continue;
            const activityArtifacts: ApiArtifact[] = [
                 ...(rawActivity.artifacts || []),
                 ...(rawActivity.progressUpdated?.artifacts || []),
                 ...(rawActivity.sessionCompleted?.artifacts || [])
            ];
            for (const apiArtifact of activityArtifacts) {
                artifacts.push({
                    id: `art-${activity.id}-${artifacts.length}`,
                    createTime: activity.createdAt,
                    name: `Artifact from ${activity.type}`,
                    changeSet: apiArtifact.changeSet ? {
                        source: apiArtifact.changeSet.source,
                        gitPatch: apiArtifact.changeSet.gitPatch ? {
                            unidiffPatch: apiArtifact.changeSet.gitPatch.unidiffPatch,
                            baseCommitId: apiArtifact.changeSet.gitPatch.baseCommitId,
                            suggestedCommitMessage: apiArtifact.changeSet.gitPatch.suggestedCommitMessage
                        } : undefined,
                        unidiffPatch: apiArtifact.changeSet.unidiffPatch
                    } : undefined,
                    bashOutput: apiArtifact.bashOutput ? {
                        command: apiArtifact.bashOutput.command,
                        output: apiArtifact.bashOutput.output,
                        exitCode: apiArtifact.bashOutput.exitCode
                    } : undefined,
                    media: apiArtifact.media ? {
                        data: apiArtifact.media.data,
                        mimeType: apiArtifact.media.mimeType
                    } : undefined
                });
            }
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
      return artifacts;
    } catch (e) {
      console.error("Failed to list artifacts:", e);
      return [];
    }
  }

  async getArtifact(sessionId: string, artifactId: string): Promise<Artifact> {
    const normalizedSessionId = this.normalizeSessionId(sessionId);
    return this.request<Artifact>(`/sessions/${normalizedSessionId}/artifacts/${artifactId}`);
  }

  // GitHub Integration
  async listIssues(sourceId: string): Promise<GitHubIssue[]> {
    // sourceId format: "sources/github/owner/repo"
    const match = sourceId.match(/sources\/github\/(.+)/);
    if (!match) throw new Error("Invalid sourceId format for GitHub issues");
    const repo = match[1];

    const githubToken = typeof window !== 'undefined' 
      ? safeLocalStorage.getItem('github_pat') 
      : process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

    if (!githubToken) {
      console.warn("[JulesClient] No GitHub token found for listIssues");
      return [];
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&sort=updated`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Jules-Autopilot'
        }
      });

      if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
      return await response.json();
    } catch (e) {
      console.error("[JulesClient] Failed to fetch GitHub issues:", e);
      return [];
    }
  }

  async approvePlan(sessionId: string): Promise<void> {
    const normalizedSessionId = this.normalizeSessionId(sessionId);
    return this.request<void>(`/sessions/${normalizedSessionId}:approvePlan`, {
      method: 'POST',
    });
  }

  async resumeSession(sessionId: string, message?: string): Promise<void> {
    await this.createActivity({
      sessionId,
      content: message || 'Please resume working on this task.',
      type: 'message'
    });
  }

  private async fetchLocal<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const res = await fetch(endpoint, {
          ...options,
          headers: { 'Content-Type': 'application/json', ...options.headers }
      });
      if (!res.ok) throw new Error(`Local API Error: ${res.statusText}`);
      return res.json();
  }

  async listTemplates(): Promise<SessionTemplate[]> {
    return this.fetchLocal<SessionTemplate[]>('/api/templates');
  }

  async createTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionTemplate> {
    return this.fetchLocal<SessionTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(id: string, template: Partial<SessionTemplate>): Promise<SessionTemplate> {
    return this.fetchLocal<SessionTemplate>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.fetchLocal<void>(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async listFiles(path: string = '.'): Promise<{ name: string; isDirectory: boolean; path: string }[]> {
    const res = await this.fetchLocal<{ files: { name: string; isDirectory: boolean; path: string }[] }>(
      `/api/fs/list?path=${encodeURIComponent(path)}`
    );
    return res.files;
  }

  async readFile(path: string): Promise<string> {
    const res = await this.fetchLocal<{ content: string }>(
      `/api/fs/read?path=${encodeURIComponent(path)}`
    );
    return res.content;
  }

  async runDirectReview(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.fetchLocal<Record<string, unknown>>('/api/review', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async gatherRepositoryContext(path: string = '.'): Promise<string> {
    let contextStr = "Repository Context:\n";
    try {
      const files = await this.listFiles(path);
      const tree = files.map(f => f.isDirectory ? `[DIR] ${f.path}` : f.path).slice(0, 50).join('\n');
      contextStr += `\nFile Structure (partial):\n${tree}\n`;
      const keyFiles = ['package.json', 'README.md', 'tsconfig.json', 'pyproject.toml', 'Cargo.toml'];
      for (const file of keyFiles) {
        if (files.some(f => f.path === file)) {
          const content = await this.readFile(file);
          contextStr += `\n--- ${file} ---\n${content.slice(0, 2000)}\n`;
        }
      }
    } catch (e) {
      console.warn("Failed to gather local context:", e);
      contextStr += "\n(Could not auto-fetch local files, relying on agent knowledge)";
    }
    return contextStr;
  }
}
