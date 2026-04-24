<<<<<<< HEAD:archive/ts-legacy/packages/core/src/agents/swarm/orchestrator-base.ts
import { resolveOrchestratorBase } from '../../lib/hypercode-orchestrator.js';
=======
import { resolveOrchestratorBase } from '../../lib/borg-orchestrator.js';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/agents/swarm/orchestrator-base.ts

export function resolveSwarmOrchestratorBase(explicitBase?: string): string | null {
    const explicit = explicitBase?.trim();
    if (explicit) {
        return explicit.replace(/\/$/, '');
    }

    return resolveOrchestratorBase();
}
