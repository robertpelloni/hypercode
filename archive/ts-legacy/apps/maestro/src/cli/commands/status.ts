// Status command for Hypercode-assimilated Maestro
// Displays the current orchestration session status from Hypercode state

import { LocalCacheManager } from '../../main/services/LocalCacheManager';
import { formatError } from '../output/formatter';

interface StatusOptions {
	json?: boolean;
}

export async function status(options: StatusOptions): Promise<void> {
	try {
		// Use current directory as workspace root for local cache
		const workspaceRoot = process.cwd();
		const cacheManager = new LocalCacheManager(workspaceRoot);

		const handoff = await cacheManager.getLatestHandoff();

		if (!handoff) {
			if (options.json) {
				console.log(
					JSON.stringify({ success: false, error: 'No active session found in Hypercode cache' })
				);
			} else {
				console.log('No active session found. Start one with /maestro:orchestrate');
			}
			return;
		}

		if (options.json) {
			console.log(JSON.stringify({ success: true, ...handoff }, null, 2));
		} else {
			// Format summary
			console.log('--------------------------------------------------');
			console.log(`SESSION: ${handoff.sessionId}`);
			console.log(`VERSION: ${handoff.version}`);
			console.log(`UPDATED: ${new Date(handoff.timestamp).toLocaleString()}`);
			console.log('--------------------------------------------------');

			if (handoff.maestro) {
				console.log(`MAESTRO STATUS: ${handoff.maestro.status || 'unknown'}`);
				if (handoff.maestro.currentPhase) {
					console.log(
						`CURRENT PHASE: ${handoff.maestro.currentPhase} of ${handoff.maestro.totalPhases || '?'}`
					);
				}
			}

			console.log('\nSTATS:');
			console.log(`  Total Messages: ${handoff.stats.totalCount}`);
			console.log(`  Observations:   ${handoff.stats.observationCount}`);
			console.log(`  Agent Runs:     ${handoff.stats.agent}`);

			if (handoff.recentContext.length > 0) {
				console.log('\nRECENT CONTEXT:');
				handoff.recentContext.slice(-3).forEach((item) => {
					console.log(
						`  [${item.metadata.source}] ${item.metadata.preview || item.content.substring(0, 50) + '...'}`
					);
				});
			}

			if (handoff.notes) {
				console.log(`\nNOTES: ${handoff.notes}`);
			}
			console.log('--------------------------------------------------');
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (options.json) {
			console.error(JSON.stringify({ error: message }));
		} else {
			console.error(formatError(`Failed to retrieve status: ${message}`));
		}
		process.exit(1);
	}
}
