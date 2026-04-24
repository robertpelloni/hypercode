import fs from 'fs/promises';
import path from 'path';
import { HypercodeHandoff } from '../../shared/hypercode-schema';
import { logger } from '../utils/logger';

const LOG_CONTEXT = 'LocalCacheManager';

export class LocalCacheManager {
	private cacheDir: string;

	constructor(workspaceRoot: string) {
		this.cacheDir = path.join(workspaceRoot, '.hypercode', 'handoffs');
	}

	private async ensureCacheDir(): Promise<void> {
		try {
			await fs.mkdir(this.cacheDir, { recursive: true });
		} catch (error) {
			logger.error(`Failed to create cache directory: ${this.cacheDir}`, LOG_CONTEXT, error);
			throw error;
		}
	}

	async saveHandoff(handoff: HypercodeHandoff): Promise<void> {
		await this.ensureCacheDir();
		try {
			const filePath = path.join(this.cacheDir, `handoff_${handoff.timestamp}.json`);
			await fs.writeFile(filePath, JSON.stringify(handoff, null, 2));

			// Also save as latest for easy access
			const latestPath = path.join(this.cacheDir, 'latest.json');
			await fs.writeFile(latestPath, JSON.stringify(handoff, null, 2));

			logger.debug(`Saved handoff to local cache: ${handoff.sessionId}`, LOG_CONTEXT);
		} catch (error) {
			logger.warn(`Failed to save handoff to local cache`, LOG_CONTEXT, error);
		}
	}

	async getLatestHandoff(): Promise<HypercodeHandoff | null> {
		try {
			const latestPath = path.join(this.cacheDir, 'latest.json');
			const content = await fs.readFile(latestPath, 'utf-8');
			return JSON.parse(content) as HypercodeHandoff;
		} catch (error) {
			// It's expected that the file might not exist
			return null;
		}
	}
}
