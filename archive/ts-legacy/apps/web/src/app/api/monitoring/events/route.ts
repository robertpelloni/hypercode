
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Resolve the monorepo root safely without overly broad path traversals
// that trigger Turbopack's file pattern analysis
function getMonorepoRoot(): string {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/monitoring/events/route.ts
    return process.env.HYPERCODE_ROOT || path.resolve(process.cwd(), '..', '..');
=======
    return process.env.BORG_ROOT || path.resolve(process.cwd(), '..', '..');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/monitoring/events/route.ts
}

export async function GET() {
    try {
        const rootDir = getMonorepoRoot();

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/monitoring/events/route.ts
        const logFile = path.join(rootDir, '.hypercode', 'data', 'healer_events.jsonl');
=======
        const logFile = path.join(rootDir, '.borg', 'data', 'healer_events.jsonl');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/monitoring/events/route.ts

        try {
            await fs.access(logFile);
        } catch {
            return NextResponse.json({ events: [] });
        }

        const data = await fs.readFile(logFile, 'utf-8');
        const lines = data.trim().split('\n');

        // Parse and reverse to show newest first
        const events = lines
            .map(line => {
                try { return JSON.parse(line); } catch { return null; }
            })
            .filter(Boolean)
            .reverse()
            .slice(0, 50); // Limit to last 50

        return NextResponse.json({ events });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
