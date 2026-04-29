import { writeFileSync } from "fs";

const procs = [
	"startupStatus",
	"mcp.listServers",
	"mcp.getStatus",
	"mcp.getWorkingSet",
	"mcp.listTools",
	"mcpServers.list",
	"savedScripts.list",
	"memory.getAgentStats",
	"settings.getAll",
	"sessionRouter.list",
	"billing.getOverview",
	"squad.list",
	"council.getActiveRun",
	"workflow.list",
	"context.listChunks",
	"metrics.getMetrics",
	"director.status",
	"supervisor.listSessions",
	"healer.listAlerts",
	"agentMemory.getRecentObservations",
	"knowledge.search",
	"lsp.status",
	"skills.list",
	"tests.list",
	"autoDev.status",
	"commands.list",
	"symbols.search",
	"graph.status",
	"research.status",
	"pulse.status",
	"audit.list",
	"darwin.status",
	"autonomy.status",
	"git.status",
	"submodule.list",
	"expert.list",
	"suggestions.list",
	"plan.list",
];

let ok = 0,
	fail = 0,
	err = 0;
const lines = [];

for (const proc of procs) {
	try {
		const res = await fetch(`http://127.0.0.1:4000/trpc/${proc}`, {
			signal: AbortSignal.timeout(3000),
		});
		if (res.ok) {
			lines.push(`  ✓ ${proc}`);
			ok++;
		} else {
			lines.push(`  ? ${proc} → HTTP ${res.status}`);
			err++;
		}
	} catch (e) {
		lines.push(`  ✗ ${proc} → ${e.message}`);
		fail++;
	}
}

lines.push("");
lines.push(`Summary: ${ok} ok, ${fail} timeout, ${err} error`);
const out = lines.join("\n");
console.log(out);
writeFileSync("/tmp/trpc-audit.txt", out);
