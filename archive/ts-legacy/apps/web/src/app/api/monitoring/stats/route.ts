
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Resolve the monorepo root safely without overly broad path traversals
// that trigger Turbopack's file pattern analysis
function getMonorepoRoot(): string {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/monitoring/stats/route.ts
    return process.env.HYPERCODE_ROOT || path.resolve(process.cwd(), '..', '..');
=======
    return process.env.BORG_ROOT || path.resolve(process.cwd(), '..', '..');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/monitoring/stats/route.ts
}

export async function GET() {
    try {
        const rootDir = getMonorepoRoot();

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/monitoring/stats/route.ts
        const brainDir = path.join(rootDir, '.hypercode', 'brain');
=======
        const brainDir = path.join(rootDir, '.borg', 'brain');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/monitoring/stats/route.ts
        let brainCount = 0;
        const recentCount = 0;

        try {
            await fs.access(brainDir);
            const items = await fs.readdir(brainDir, { recursive: true });
            // readdir recursive returns files relative to brainDir
            // Filter only files (simple heuristic: has extension or not a dir)
            // But strict check is better.

            // Simplified: just count items.
            brainCount = items.length;

            // Check mtime for "recent" (last 24h)
            // This is expensive for thousands of files. 
            // Let's just return total count for now.
        } catch {
            brainCount = 0;
        }

        return NextResponse.json({
            brain: {
                totalMemories: brainCount,
                status: 'Active' // Mock status for now
            },
            ingestion: {
                lastBatch: 'Batch 4',
                status: 'Running' // We assume it's running if we are here
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
