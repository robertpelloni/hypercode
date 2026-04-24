import { HypercodeHandoff, HypercodeSettingsPayload, HypercodePlaybooksPayload } from '../../shared/hypercode-schema';
import { logger } from '../utils/logger';

const LOG_CONTEXT = 'HypercodeCoreClient';

export class HypercodeCoreClient {
	private baseUrl: string;

	constructor(baseUrl: string = process.env.HYPERCODE_CORE_URL || 'http://localhost:3000') {
		this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	}

	async createSession(task: string, initialMetadata?: Record<string, any>): Promise<string> {
		const response = await fetch(`${this.baseUrl}/v1/sessions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ task, initialMetadata }),
		});

		if (!response.ok) {
			const errorMsg = `Failed to create Hypercode session: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}

		const data = (await response.json()) as { sessionId: string };
		return data.sessionId;
	}

	async listSessions(): Promise<Array<{ sessionId: string; task: string; status: string }>> {
		const response = await fetch(`${this.baseUrl}/v1/sessions`);

		if (!response.ok) {
			const errorMsg = `Failed to list Hypercode sessions: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}

		return (await response.json()) as Array<{ sessionId: string; task: string; status: string }>;
	}

	async getHandoff(sessionId: string): Promise<HypercodeHandoff> {
		const response = await fetch(`${this.baseUrl}/v1/handoffs/${sessionId}`);

		if (!response.ok) {
			const errorMsg = `Failed to get handoff for session ${sessionId}: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}

		return (await response.json()) as HypercodeHandoff;
	}

	async putHandoff(sessionId: string, handoff: HypercodeHandoff): Promise<void> {
		const response = await fetch(`${this.baseUrl}/v1/handoffs/${sessionId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(handoff),
		});

		if (!response.ok) {
			const errorMsg = `Failed to put handoff for session ${sessionId}: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}
	}

	async archiveSession(sessionId: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/v1/sessions/${sessionId}/archive`, {
			method: 'POST',
		});

		if (!response.ok) {
			const errorMsg = `Failed to archive session ${sessionId}: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}
	}

	async syncSettings(settings: HypercodeSettingsPayload): Promise<HypercodeSettingsPayload> {
		const response = await fetch(`${this.baseUrl}/v1/sync/settings`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings),
		});

		if (!response.ok) {
			const errorMsg = `Failed to sync Hypercode settings: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}

		return (await response.json()) as HypercodeSettingsPayload;
	}

	async syncPlaybooks(playbooks: HypercodePlaybooksPayload): Promise<HypercodePlaybooksPayload> {
		const response = await fetch(`${this.baseUrl}/v1/sync/playbooks`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(playbooks),
		});

		if (!response.ok) {
			const errorMsg = `Failed to sync Hypercode playbooks: ${response.status} ${response.statusText}`;
			logger.error(errorMsg, LOG_CONTEXT);
			throw new Error(errorMsg);
		}

		return (await response.json()) as HypercodePlaybooksPayload;
	}

	async getHealth(): Promise<{ status: string }> {
		try {
			const response = await fetch(`${this.baseUrl}/v1/health`);
			if (!response.ok) {
				return { status: 'unhealthy' };
			}
			return (await response.json()) as { status: string };
		} catch (error) {
			return { status: 'unreachable' };
		}
	}
}
