import { prisma } from '../lib/prisma';
import { orchestratorQueue } from './queue';
import { emitDaemonEvent } from './index';
import { addLog } from './daemon';

export async function handleBorgWebhook(payload: any) {
    const { type, data, source } = payload;
    
    await addLog(`Received HyperCode signal: ${type} from ${source || 'unknown'}`, 'info', 'global');

    switch (type) {
        case 'repo_updated':
            // HyperCode detected a code change elsewhere, trigger a re-index
            await addLog(`HyperCode reported repo update. Enqueueing RAG re-index...`, 'action', 'global');
            await orchestratorQueue.add('index_codebase', {});
            break;

        case 'dependency_alert':
            // HyperCode detected a dependency change that might affect our fleet
            await addLog(`HyperCode Dependency Alert: ${data.dependency} updated to ${data.version}`, 'info', 'global');
            // We could optionally broadcast a nudge to all active sessions here
            break;

        case 'fleet_command':
            // A direct instruction from the HyperCode meta-orchestrator
            if (data.action === 'reindex_all') {
                await orchestratorQueue.add('index_codebase', {});
            } else if (data.action === 'clear_logs') {
                await prisma.keeperLog.deleteMany({});
            }
            break;

        case 'issue_detected':
            // HyperCode found a high-priority issue, trigger our autonomous conversion
            if (data.sourceId) {
                await addLog(`HyperCode detected urgent issue. Triggering session evaluation...`, 'action', 'global');
                await orchestratorQueue.add('check_issues', { sourceId: data.sourceId });
            }
            break;

        default:
            console.log(`[Webhooks] Received unhandled HyperCode event type: ${type}`);
    }

    emitDaemonEvent('borg_signal_received', { type, timestamp: new Date().toISOString() });
    return { success: true, processed: true };
}
