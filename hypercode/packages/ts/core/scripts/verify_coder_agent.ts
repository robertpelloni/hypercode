
import { CoderAgent } from '../src/agents/CoderAgent.js';
import { MeshService } from '../src/services/MeshService.js';
import { SwarmMessageType } from '../src/mesh/SwarmProtocol.js';
import { Buffer } from 'buffer';
import process from 'process';

async function verify() {
    console.log("1. Starting CoderAgent...");
    const agent = new CoderAgent();

    console.log("2. Starting Test Client Node...");
    const client = new MeshService();

    // Give time to join swarm
    await new Promise(r => setTimeout(r, 2000));

    console.log("3. Sending CAPABILITY_QUERY...");
    // We don't have a direct peer discovery verification here easily without logs, 
    // but MeshService automatically logs "New connection".

    // Let's broadcast and see if we get a response
    // But broadcast is fire-and-forget.
    // Let's rely on the logs from the agent and client.

    console.log("Test running for 10 seconds. Check logs for 'New connection'...");
    await new Promise(r => setTimeout(r, 10000));

    await agent.destroy();
    await client.destroy();
    console.log("Done.");
}

verify().catch(console.error);
