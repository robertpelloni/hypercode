import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import Store from 'electron-store';
import { IHypercodeProvider } from './IHypercodeProvider';
import { MaestroSettings } from '../stores/types';
import { HypercodeSettingsPayload } from '../../shared/hypercode-schema';
import { logger } from '../utils/logger';

const LOG_CONTEXT = 'SyncManager';

/**
 * SyncManager coordinates periodic synchronization of settings and playbooks with Hypercode.
 */
export class SyncManager {
	private interval: NodeJS.Timeout | null = null;

	constructor(
		private hypercodeProvider: IHypercodeProvider,
		private settingsStore: Store<MaestroSettings>
	) {}

	/**
	 * Synchronize settings with Hypercode Core.
	 * Local settings are sent to Hypercode, and remote changes are merged back.
	 */
	async syncSettings(): Promise<void> {
		try {
			logger.debug('Starting settings synchronization', LOG_CONTEXT);
			const currentSettings = this.settingsStore.store;
			const payload: HypercodeSettingsPayload = { settings: currentSettings };

			const remoteSettings = await this.hypercodeProvider.syncSettings(payload);

			if (remoteSettings && remoteSettings.settings) {
				// Merge remote settings into local store
				this.settingsStore.store = {
					...this.settingsStore.store,
					...remoteSettings.settings,
				};
				logger.info('Settings successfully synchronized with Hypercode', LOG_CONTEXT);
			}
		} catch (error) {
			logger.error('Failed to sync settings with Hypercode', LOG_CONTEXT, { error });
		}
	}

	/**
	 * Synchronize playbooks with Hypercode Core.
	 * Aggregates all local session playbooks and syncs them with the global control plane.
	 */
	async syncPlaybooks(): Promise<void> {
		try {
			logger.debug('Starting playbooks synchronization', LOG_CONTEXT);
			const userDataPath = app.getPath('userData');
			const playbooksPath = path.join(userDataPath, 'playbooks');

			// Ensure playbooks directory exists
			await fs.mkdir(playbooksPath, { recursive: true });

			const files = await fs.readdir(playbooksPath);
			const jsonFiles = files.filter((f) => f.endsWith('.json'));

			const allPlaybooks: any[] = [];
			for (const file of jsonFiles) {
				const sessionId = path.basename(file, '.json');
				const filePath = path.join(playbooksPath, file);
				try {
					const content = await fs.readFile(filePath, 'utf-8');
					const data = JSON.parse(content);
					if (data && Array.isArray(data.playbooks)) {
						for (const p of data.playbooks) {
							// Include session association for remote tracking
							allPlaybooks.push({ ...p, _sessionId: sessionId });
						}
					}
				} catch (e) {
					logger.warn(`Failed to read/parse playbook file: ${file}`, LOG_CONTEXT, { error: e });
				}
			}

			const remotePlaybooks = await this.hypercodeProvider.syncPlaybooks(allPlaybooks);

			if (remotePlaybooks) {
				// Group playbooks by session for local storage
				const playbooksBySession: Record<string, any[]> = {};

				for (const p of remotePlaybooks) {
					const sessionId = p._sessionId || 'global';
					if (!playbooksBySession[sessionId]) {
						playbooksBySession[sessionId] = [];
					}

					// Clean internal metadata before saving
					const { _sessionId, ...cleanPlaybook } = p;
					playbooksBySession[sessionId].push(cleanPlaybook);
				}

				// Update local files
				for (const [sessionId, playbooks] of Object.entries(playbooksBySession)) {
					const filePath = path.join(playbooksPath, `${sessionId}.json`);
					await fs.writeFile(filePath, JSON.stringify({ playbooks }, null, 2), 'utf-8');
				}

				logger.info(
					`Playbooks successfully synchronized with Hypercode (${remotePlaybooks.length} total)`,
					LOG_CONTEXT
				);
			}
		} catch (error) {
			logger.error('Failed to sync playbooks with Hypercode', LOG_CONTEXT, { error });
		}
	}

	/**
	 * Starts the periodic synchronization.
	 * @param intervalMs - Interval in milliseconds between syncs.
	 */
	start(intervalMs: number): void {
		if (this.interval) {
			logger.warn('SyncManager is already running', LOG_CONTEXT);
			return;
		}

		// Initial sync
		this.syncSettings();
		this.syncPlaybooks();

		this.interval = setInterval(() => {
			this.syncSettings();
			this.syncPlaybooks();
		}, intervalMs);

		logger.info(`SyncManager started with interval: ${intervalMs}ms`, LOG_CONTEXT);
	}

	/**
	 * Stops the periodic synchronization.
	 */
	stop(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
			logger.info('SyncManager stopped', LOG_CONTEXT);
		}
	}
}
