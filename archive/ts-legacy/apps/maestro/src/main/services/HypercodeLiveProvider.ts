import { IHypercodeProvider } from './IHypercodeProvider';
import { HypercodeHandoff, HypercodeSettingsPayload, HypercodePlaybooksPayload } from '../../shared/hypercode-schema';
import { HypercodeCoreClient } from './HypercodeCoreClient';
import { LocalCacheManager } from './LocalCacheManager';
import { logger } from '../utils/logger';

const LOG_CONTEXT = 'HypercodeLiveProvider';

export class HypercodeLiveProvider implements IHypercodeProvider {
	private client: HypercodeCoreClient;
	private cache: LocalCacheManager;

	constructor(client?: HypercodeCoreClient, cache?: LocalCacheManager) {
		this.client = client || new HypercodeCoreClient();
		this.cache = cache || new LocalCacheManager(process.cwd());
	}

	async createSession(task: string, initialMetadata?: Record<string, any>): Promise<string> {
		logger.info(`Creating Hypercode session for task: ${task}`, LOG_CONTEXT);
		return await this.client.createSession(task, initialMetadata);
	}

	async listSessions(): Promise<Array<{ sessionId: string; task: string; status: string }>> {
		logger.info('Listing Hypercode sessions', LOG_CONTEXT);
		return await this.client.listSessions();
	}

	async commitHandoff(handoff: HypercodeHandoff): Promise<void> {
		logger.info(`Committing handoff for session: ${handoff.sessionId}`, LOG_CONTEXT);
		await this.client.putHandoff(handoff.sessionId, handoff);
		await this.cache.saveHandoff(handoff);
	}

	async getHandoff(sessionId: string): Promise<HypercodeHandoff> {
		logger.info(`Fetching handoff for session: ${sessionId}`, LOG_CONTEXT);
		const handoff = await this.client.getHandoff(sessionId);
		await this.cache.saveHandoff(handoff);
		return handoff;
	}

	async transitionPhase(
		sessionId: string,
		completedPhaseId: number,
		nextPhaseId?: number
	): Promise<void> {
		logger.info(
			`Transitioning phase for session ${sessionId}: completed=${completedPhaseId}, next=${nextPhaseId}`,
			LOG_CONTEXT
		);
		const handoff = await this.getHandoff(sessionId);
		if (handoff.maestro) {
			handoff.maestro.currentPhase = nextPhaseId;
			handoff.timestamp = Date.now();
			await this.commitHandoff(handoff);
		} else {
			logger.warn(
				`Cannot transition phase: Maestro metadata missing in handoff for session ${sessionId}`,
				LOG_CONTEXT
			);
		}
	}

	async archiveSession(sessionId: string): Promise<void> {
		logger.info(`Archiving session: ${sessionId}`, LOG_CONTEXT);
		await this.client.archiveSession(sessionId);
	}

	async getStatus(): Promise<{ connected: boolean; latencyMs?: number }> {
		const start = Date.now();
		try {
			const health = await this.client.getHealth();
			return {
				connected: health.status === 'ok' || health.status === 'healthy',
				latencyMs: Date.now() - start,
			};
		} catch (error) {
			return { connected: false };
		}
	}

	async syncSettings(settings: HypercodeSettingsPayload): Promise<HypercodeSettingsPayload> {
		logger.info('Syncing Hypercode settings', LOG_CONTEXT);
		return await this.client.syncSettings(settings);
	}

	async syncPlaybooks(playbooks: HypercodePlaybooksPayload): Promise<HypercodePlaybooksPayload> {
		logger.info('Syncing Hypercode playbooks', LOG_CONTEXT);
		return await this.client.syncPlaybooks(playbooks);
	}
}
