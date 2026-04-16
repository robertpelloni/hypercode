
import { MCPServer } from '../src/MCPServer.js';

// Targets from Batch 4 (2026-02-01)
const TARGETS = [
    "https://github.com/KeaBase/kea-research",
    "https://github.com/Jacck/mcp-reasoner",
    "https://github.com/lobehub/lobehub",
    "https://github.com/tensorchord/Awesome-LLMOps",
    "https://github.com/NevaMind-AI/memU",
    "https://github.com/openclaw/openclaw",
    "https://github.com/Shubhamsaboo/awesome-llm-apps",
    "https://github.com/trending/developers",
    "https://github.com/ThePrimeagen/99",
    "https://github.com/pedramamini/Maestro",
    "https://github.com/badlogic/pi-mono",
    "https://github.com/thedotmack/claude-mem",
    "https://github.com/microsoft/agent-lightning",
    "https://github.com/amantus-ai/vibetunnel",
    "https://github.com/steipete/CodexBar",
    "https://github.com/vita-epfl/Stable-Video-Infinity",
    "https://github.com/crivetimihai/claude-flow",
    "https://github.com/NTCoding/claude-skillz",
    "https://github.com/mikepenz/multiplatform-markdown-renderer",
    "https://github.com/mostlygeek/llama-swap",
    "https://github.com/seven332/EhViewer",
    "https://github.com/yongkangc/happy-cli",
    "https://github.com/sxyazi/yazi",
    "https://github.com/avifenesh/awesome-slash",
    "https://github.com/cellwebb/gac",
    "https://github.com/OpenCoder-llm/OpenCoder-llm",
    "https://github.com/NoeFabris/opencode-antigravity-auth",
    "https://github.com/OpenCodeInterpreter/OpenCodeInterpreter",
    "https://github.com/different-ai/openwork",
    "https://github.com/moltbot/nix-moltbot",
    "https://github.com/jmuncor/tokentap",
    "https://github.com/regression-io/coder-config",
    "https://github.com/github/copilot-sdk",
    "https://github.com/philschmid/mcp-cli",
    "https://github.com/rancher/rancher",
    "https://github.com/obra/superpowers",
    "https://github.com/frankbria/ralph-claude-code",
    "https://github.com/MiroMindAI/MiroThinker",
    "https://github.com/bytedance/UI-TARS-desktop",
    "https://github.com/OpenBMB/ChatDev",
    "https://github.com/google/A2UI",
    "https://github.com/KeygraphHQ/shannon",
    "https://github.com/shareAI-lab/learn-claude-code",
    "https://github.com/Jinketomy-Masheldia/uPhone",
    "https://github.com/cosinusalpha/webctl",
    "https://github.com/ZeframLou/call-me",
    "https://github.com/xpipe-io/xpipe",
    "https://github.com/marcopesani/mcp-server-serper",
    "https://github.com/code-yeongyu/oh-my-opencode/releases/tag/v3.0.0-beta.7",
    "https://github.com/Lyapsus/opencode-optimal-model-temps",
    "https://lynchmark.com/blog/gemini-optimal-temperature"
];

async function main() {
    console.log("🚀 Starting Batch Ingestion...");
    const server = new MCPServer({ skipWebsocket: false });

    // Allow server to boot
    await new Promise(r => setTimeout(r, 2000));

    console.log("🚀 Starting Batch Ingestion (Auto-Fallback to Native Mode if no browser)...");

    for (const url of TARGETS) {
        console.log(`Processing: ${url}`);
        // We can't access private server.researchService directly easily if not exposed
        // But we added it as public? verifying... 
        // MCPServer has `public researchService`.
        const result = await server.researchService.ingest(url);
        console.log(`Result: ${result}`);

        // Cooldown
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("✅ Batch Complete.");
    process.exit(0);
}

main().catch(console.error);
