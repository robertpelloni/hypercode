
import { CoderAgent } from '../src/agents/CoderAgent.js';
import { ResearcherAgent } from '../src/agents/ResearcherAgent.js';

async function main() {
    const args = process.argv.slice(2);
    const roleArgIndex = args.indexOf('--role');
    const role = roleArgIndex !== -1 ? args[roleArgIndex + 1] : 'coder';

    console.log(`[Worker] Starting Mesh Worker with role: ${role}`);

    let agent;
    if (role === 'coder') {
        agent = new CoderAgent();
    } else if (role === 'researcher') {
        agent = new ResearcherAgent();
    } else {
        console.error(`Unknown role: ${role}`);
        process.exit(1);
    }

    console.log(`[Worker] ${role} Agent is online and listening on the Swarm.`);

    // Keep process alive
    process.on('SIGINT', async () => {
        console.log('\n[Worker] Shutting down...');
        await agent.destroy();
        process.exit(0);
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
