import { HypercodeLiveProvider } from '../../main/services/HypercodeLiveProvider';
import { formatError, formatInfo } from '../output/formatter';

interface HypercodeListOptions {
	json?: boolean;
}

export async function hypercodeList(options: HypercodeListOptions): Promise<void> {
	try {
		const provider = new HypercodeLiveProvider();
		const sessions = await provider.listSessions();

		if (options.json) {
			console.log(JSON.stringify(sessions, null, 2));
			return;
		}

		if (sessions.length === 0) {
			console.log(formatInfo('No Hypercode sessions found.'));
			return;
		}

		console.log('--- Hypercode Sessions ---');
		console.log(`${'ID'.padEnd(10)} ${'Status'.padEnd(12)} ${'Task'}`);
		console.log('-'.repeat(60));

		for (const session of sessions) {
			const id = session.sessionId.slice(0, 8);
			const status = session.status.toUpperCase();
			const task = session.task;
			console.log(`${id.padEnd(10)} ${status.padEnd(12)} ${task}`);
		}
		console.log('---------------------');
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (options.json) {
			console.error(JSON.stringify({ error: message }));
		} else {
			console.error(formatError(`Failed to list Hypercode sessions: ${message}`));
		}
		process.exit(1);
	}
}
