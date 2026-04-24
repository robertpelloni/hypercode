#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * read-active-session.js (Hypercode-Assimilated version)
 * This script bridges the new Hypercode JSON protocol back to the
 * Markdown format expected by the Maestro extension.
 */

function main() {
	const workspaceRoot = process.cwd();
	const latestPath = path.join(workspaceRoot, '.hypercode', 'handoffs', 'latest.json');

	if (!fs.existsSync(latestPath)) {
		process.stdout.write('No active session\n');
		return;
	}

	try {
		const handoff = JSON.parse(fs.readFileSync(latestPath, 'utf8'));

		// Construct a Markdown summary that mimics the legacy active-session.md
		let md = `---\n`;
		md += `session_id: ${handoff.sessionId}\n`;
		md += `updated: '${new Date(handoff.timestamp).toISOString()}'\n`;
		md += `status: ${handoff.maestro ? handoff.maestro.status : 'in_progress'}\n`;
		md += `workflow_mode: ${handoff.maestro ? handoff.maestro.workflowMode : 'standard'}\n`;
		md += `current_phase: ${handoff.maestro ? handoff.maestro.currentPhase : 1}\n`;
		md += `total_phases: ${handoff.maestro ? handoff.maestro.totalPhases : 1}\n`;
		md += `---\n\n`;
		md += `# Hypercode-Assimilated Orchestration Log\n\n`;

		md += `## Stats\n`;
		md += `- Total Messages: ${handoff.stats.totalCount}\n`;
		md += `- Observations: ${handoff.stats.observationCount}\n`;
		md += `- Agent Runs: ${handoff.stats.agent}\n\n`;

		if (handoff.recentContext && handoff.recentContext.length > 0) {
			md += `## Recent Activity\n`;
			handoff.recentContext.slice(-5).forEach((item) => {
				md += `### ${item.metadata.source}\n`;
				md += `${item.metadata.preview || item.content.substring(0, 100) + '...'}\n\n`;
			});
		}

		if (handoff.notes) {
			md += `## Notes\n${handoff.notes}\n`;
		}

		process.stdout.write(md);
	} catch (err) {
		process.stdout.write(`Error reading Hypercode state: ${err.message}\n`);
	}
}

main();
