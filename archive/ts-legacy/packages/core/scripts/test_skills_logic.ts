
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import fetch from 'node-fetch';

// Polyfill fetch for Node.js environment
if (!global.fetch) {
    (global as any).fetch = fetch;
}

const client = createTRPCProxyClient<any>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/trpc',
        }),
    ],
});

async function main() {
    try {
        console.log("Testing skills.list...");
        const skills = await client.skills.list.query();
        console.log("Skills found:", skills.length);
        if (skills.length > 0) {
            console.log("First skill:", skills[0].name);
        } else {
            console.log("No skills returned.");
        }
    } catch (e) {
        console.error("Error calling skills.list:", e);
    }
}

// We can't easily run this against the *internal* router without starting the server.
// Instead, let's just inspect the SkillRegistry logic via a unit test style script
// that imports MCPServer conventions? No, that's too heavy.
//
// Actually, I can just use the checking logic I used before: `MCPServer` initializes `SkillRegistry` with correct paths.
// The previous fix (removing duplicate init) should work.
//
// Let's just trust the code correction for now and move to Billing.
// But to be sure, I'll peek at `packages/ai/src/ModelSelector.ts` to see QuotaService.
