import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { SyncManager } from '../../main/services/SyncManager';
import { HypercodeLiveProvider } from '../../main/services/HypercodeLiveProvider';
import { HypercodeCoreClient } from '../../main/services/HypercodeCoreClient';

// Mock electron
vi.mock('electron', () => ({
	app: {
		getPath: vi.fn(),
	},
}));

// Mock electron-store
vi.mock('electron-store', () => {
	return {
		default: class MockStore {
			private _store: any = {};
			get store() {
				return this._store;
			}
			set store(val: any) {
				this._store = val;
			}
		},
	};
});

describe('SyncManager Integration', () => {
	let syncManager: SyncManager;
	let hypercodeProvider: HypercodeLiveProvider;
	let mockStore: any;
	const tempUserDataPath = path.join(process.cwd(), 'temp-test-userData');
	const playbooksPath = path.join(tempUserDataPath, 'playbooks');
	const HYPERCODE_URL = 'http://mock-hypercode-core:3000';

	beforeEach(async () => {
		// Setup temp directories
		await fs.mkdir(playbooksPath, { recursive: true });

		const { app } = await import('electron');
		vi.mocked(app.getPath).mockReturnValue(tempUserDataPath);

		const Store = (await import('electron-store')).default;
		mockStore = new Store();
		mockStore.store = { theme: 'dark', fontSize: 14 };

		const client = new HypercodeCoreClient(HYPERCODE_URL);
		hypercodeProvider = new HypercodeLiveProvider(client);
		syncManager = new SyncManager(hypercodeProvider, mockStore);

		// Mock global fetch
		global.fetch = vi.fn();
	});

	afterEach(async () => {
		await fs.rm(tempUserDataPath, { recursive: true, force: true });
		vi.clearAllMocks();
	});

	it('syncSettings() correctly pushes local settings and merges remote changes', async () => {
		const remoteSettings = {
			settings: {
				theme: 'light', // Changed remotely
				showLineNumbers: true, // New setting
			},
		};

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => remoteSettings,
		} as Response);

		await syncManager.syncSettings();

		// Verify fetch call
		expect(fetch).toHaveBeenCalledWith(
			`${HYPERCODE_URL}/v1/sync/settings`,
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ settings: { theme: 'dark', fontSize: 14 } }),
			})
		);

		// Verify local store updated (merged)
		expect(mockStore.store).toEqual({
			theme: 'light',
			fontSize: 14,
			showLineNumbers: true,
		});
	});

	it('syncPlaybooks() correctly aggregates local playbook files and updates them from remote', async () => {
		// Create some local playbook files
		const session1Playbooks = {
			playbooks: [{ id: 'pb1', name: 'Playbook 1' }],
		};
		const session2Playbooks = {
			playbooks: [{ id: 'pb2', name: 'Playbook 2' }],
		};

		await fs.writeFile(
			path.join(playbooksPath, 'session1.json'),
			JSON.stringify(session1Playbooks)
		);
		await fs.writeFile(
			path.join(playbooksPath, 'session2.json'),
			JSON.stringify(session2Playbooks)
		);

		const remotePlaybooks = [
			{ id: 'pb1', name: 'Playbook 1 Updated', _sessionId: 'session1' },
			{ id: 'pb2', name: 'Playbook 2', _sessionId: 'session2' },
			{ id: 'pb3', name: 'Remote Playbook', _sessionId: 'global' },
		];

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => remotePlaybooks,
		} as Response);

		await syncManager.syncPlaybooks();

		// Verify fetch call
		expect(fetch).toHaveBeenCalledWith(
			`${HYPERCODE_URL}/v1/sync/playbooks`,
			expect.objectContaining({
				method: 'POST',
			})
		);

		const lastFetchCall = vi.mocked(fetch).mock.calls[0];
		const sentBody = JSON.parse(lastFetchCall[1]?.body as string);
		expect(sentBody).toContainEqual({ id: 'pb1', name: 'Playbook 1', _sessionId: 'session1' });
		expect(sentBody).toContainEqual({ id: 'pb2', name: 'Playbook 2', _sessionId: 'session2' });

		// Verify local files updated
		const session1Content = JSON.parse(
			await fs.readFile(path.join(playbooksPath, 'session1.json'), 'utf-8')
		);
		expect(session1Content.playbooks[0].name).toBe('Playbook 1 Updated');

		const globalContent = JSON.parse(
			await fs.readFile(path.join(playbooksPath, 'global.json'), 'utf-8')
		);
		expect(globalContent.playbooks).toContainEqual({ id: 'pb3', name: 'Remote Playbook' });
	});

	it('periodic sync starts and triggers the sync methods', async () => {
		vi.useFakeTimers();

		const syncSettingsSpy = vi.spyOn(syncManager, 'syncSettings').mockResolvedValue();
		const syncPlaybooksSpy = vi.spyOn(syncManager, 'syncPlaybooks').mockResolvedValue();

		const interval = 1000;
		syncManager.start(interval);

		// Initial sync should be triggered immediately
		expect(syncSettingsSpy).toHaveBeenCalledTimes(1);
		expect(syncPlaybooksSpy).toHaveBeenCalledTimes(1);

		// Advance time
		await vi.advanceTimersByTimeAsync(interval);
		expect(syncSettingsSpy).toHaveBeenCalledTimes(2);
		expect(syncPlaybooksSpy).toHaveBeenCalledTimes(2);

		// Advance time again
		await vi.advanceTimersByTimeAsync(interval);
		expect(syncSettingsSpy).toHaveBeenCalledTimes(3);
		expect(syncPlaybooksSpy).toHaveBeenCalledTimes(3);

		syncManager.stop();
		vi.useRealTimers();
	});
});
