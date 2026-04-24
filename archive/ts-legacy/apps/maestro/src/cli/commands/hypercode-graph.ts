import { HypercodeLiveProvider } from '../../main/services/HypercodeLiveProvider';
import { LocalCacheManager } from '../../main/services/LocalCacheManager';
import { formatError } from '../output/formatter';
import { HypercodeHandoff } from '../../shared/hypercode-schema';

interface HypercodeGraphOptions {
	json?: boolean;
	dot?: boolean;
}

export async function hypercodeGraph(
	sessionIdArg: string | undefined,
	options: HypercodeGraphOptions
): Promise<void> {
	try {
		const provider = new HypercodeLiveProvider();
		const cacheManager = new LocalCacheManager(process.cwd());

		let sessionId = sessionIdArg;
		if (!sessionId) {
			const latestHandoff = await cacheManager.getLatestHandoff();
			sessionId = latestHandoff?.sessionId;
		}

		if (!sessionId) {
			console.error(formatError('No session ID specified and no recent session found in cache.'));
			process.exit(1);
		}

		const handoff = await provider.getHandoff(sessionId);

		if (options.dot) {
			console.log(toDot(handoff));
		} else {
			// Default to JSON if not specified, or if json option is true
			const graphData = {
				sessionId: handoff.sessionId,
				task: handoff.notes || 'Hypercode Task',
				phases: handoff.maestro?.phaseDependencies || [],
				knowledge: handoff.knowledge || [],
			};
			console.log(JSON.stringify(graphData, null, 2));
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		if (options.json) {
			console.error(JSON.stringify({ error: message }));
		} else {
			console.error(formatError(`Failed to generate Hypercode graph: ${message}`));
		}
		process.exit(1);
	}
}

function toDot(handoff: HypercodeHandoff): string {
	const lines: string[] = ['digraph HypercodeGraph {'];
	lines.push('  rankdir=LR;');
	lines.push('  node [shape=box, fontname="Arial", style=filled, fillcolor=white];');
	lines.push('  edge [fontname="Arial", fontsize=10];');

	const sessionId = handoff.sessionId.slice(0, 8);
	lines.push(`  label="Hypercode Session: ${sessionId}\n${handoff.notes || ''}";`);
	lines.push('  labelloc=t;');

	// Phases and Dependencies
	if (handoff.maestro?.phaseDependencies) {
		for (const dep of handoff.maestro.phaseDependencies) {
			if (dep.includes('->')) {
				const parts = dep.split('->').map((p) => p.trim());
				if (parts.length === 2) {
					lines.push(`  "${parts[0]}" -> "${parts[1]}";`);
				} else {
					lines.push(`  ${dep};`);
				}
			} else {
				lines.push(`  "${dep}" [fillcolor=lightblue];`);
			}
		}
	}

	// Current Phase highlight
	if (handoff.maestro?.currentPhase !== undefined) {
		const currentPhaseLabel = `Phase ${handoff.maestro.currentPhase}`;
		lines.push(`  "${currentPhaseLabel}" [color=green, penwidth=2, fillcolor="#e6fffa"];`);
	}

	// Knowledge Items
	if (handoff.knowledge) {
		lines.push('  subgraph cluster_knowledge {');
		lines.push('    label="Knowledge Base";');
		lines.push('    color=lightgrey;');
		lines.push('    style=dashed;');

		for (let i = 0; i < handoff.knowledge.length; i++) {
			const item = handoff.knowledge[i];
			const nodeId = `k_${i}`;
			const cleanContent = item.content.replace(/"/g, '\"').replace(/\n/g, ' ');
			const label = `${item.type.toUpperCase()}\n${cleanContent.substring(0, 40)}${cleanContent.length > 40 ? '...' : ''}`;

			let color = 'white';
			switch (item.type) {
				case 'discovery':
					color = '#e6f7ff';
					break;
				case 'decision':
					color = '#fff7e6';
					break;
				case 'fix':
					color = '#f6ffed';
					break;
				case 'warning':
					color = '#fff1f0';
					break;
				case 'pattern':
					color = '#f9f0ff';
					break;
			}

			lines.push(`    ${nodeId} [label="${label}", shape=note, fillcolor="${color}"];`);

			if (item.metadata?.phaseId) {
				lines.push(`    "${item.metadata.phaseId}" -> ${nodeId} [style=dotted, arrowhead=none];`);
			} else if (handoff.maestro?.currentPhase !== undefined) {
				const currentPhaseLabel = `Phase ${handoff.maestro.currentPhase}`;
				lines.push(`    "${currentPhaseLabel}" -> ${nodeId} [style=dotted, arrowhead=none];`);
			}
		}
		lines.push('  }');
	}

	lines.push('}');
	return lines.join('\n');
}
