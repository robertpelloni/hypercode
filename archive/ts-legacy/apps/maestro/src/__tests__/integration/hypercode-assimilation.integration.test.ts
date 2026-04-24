import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { HypercodeLiveProvider } from '../../main/services/HypercodeLiveProvider';
import { HypercodeHandoff } from '../../shared/hypercode-schema';
import { LocalCacheManager } from '../../main/services/LocalCacheManager';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Hypercode Assimilation Integration', () => {
	let server: FastifyInstance;
	let provider: HypercodeLiveProvider;
	let tempDir: string;
	const PORT = 3333;
	const HYPERCODE_CORE_URL = `http://localhost:${PORT}`;

	// Mock data
	let lastHandoff: any = null;

	beforeAll(async () => {
		// Set up temp directory for local cache
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-hypercode-test-'));
		process.env.HYPERCODE_CORE_URL = HYPERCODE_CORE_URL;

		// Start mock Hypercode Core server
		server = fastify();

		server.post('/v1/sessions', async (request, reply) => {
			const { task } = request.body as any;
			return { sessionId: 'test-session-123', task };
		});

		server.get('/v1/handoffs/:sessionId', async (request, reply) => {
			if (lastHandoff) return lastHandoff;
			reply.code(404).send({ error: 'Not found' });
		});

		server.put('/v1/handoffs/:sessionId', async (request, reply) => {
			lastHandoff = request.body;
			return { success: true };
		});

		server.post('/v1/sessions/:sessionId/archive', async (request, reply) => {
			return { success: true };
		});

		server.get('/v1/health', async () => {
			return { status: 'ok' };
		});

		await server.listen({ port: PORT });

		// Initialize provider
		provider = new HypercodeLiveProvider();
	});

	afterAll(async () => {
		await server.close();
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('should verify connectivity to Hypercode Core', async () => {
		const status = await provider.getStatus();
		expect(status.connected).toBe(true);
	});

	it('should create a new session in Hypercode Core', async () => {
		const sessionId = await provider.createSession('Test Task');
		expect(sessionId).toBe('test-session-123');
	});

	it('should commit a handoff and mirror to local cache', async () => {
		const handoff: HypercodeHandoff = {
			version: 'Hypercode-Maestro-v1',
			timestamp: Date.now(),
			sessionId: 'test-session-123',
			stats: {
				totalCount: 1,
				sessionCount: 1,
				workingCount: 1,
				longTermCount: 0,
				observationCount: 1,
				uniqueObservationCount: 1,
				promptCount: 1,
				sessionSummaryCount: 0,
				session: Date.now(),
				working: Date.now(),
				long_term: 0,
				user: 0,
				agent: 1,
				project: 1,
				discovery: 1,
				decision: 1,
				progress: 1,
				warning: 0,
				fix: 0,
			},
			recentContext: [
				{
					content: 'Hello Hypercode',
					metadata: { source: 'test-agent', tags: ['test'] },
				},
			],
			maestro: {
				sessionId: 'test-session-123',
				status: 'in_progress',
			},
		};

		await provider.commitHandoff(handoff);

		// Verify remote state
		expect(lastHandoff.sessionId).toBe('test-session-123');
		expect(lastHandoff.recentContext[0].content).toBe('Hello Hypercode');

		// Verify local cache (latest.json)
		// Note: Since the test runs in process.cwd(), we need to check .hypercode/handoffs/latest.json
		// But in our setup we might have pointed it elsewhere or just use default.
		const cacheManager = new LocalCacheManager(process.cwd());
		const latest = await cacheManager.getLatestHandoff();
		expect(latest).not.toBeNull();
		expect(latest?.sessionId).toBe('test-session-123');
	});

	it('should archive a session', async () => {
		await provider.archiveSession('test-session-123');
		// Archive just succeeds in mock
	});
});
