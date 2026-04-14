import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { DashboardHomeClient } from './DashboardHomeClient';

async function getDashboardVersionLabel(): Promise<string> {
    const candidatePaths = [
        path.join(process.cwd(), 'VERSION'),
        path.join(process.cwd(), '..', '..', 'VERSION'),
    ];

    for (const versionPath of candidatePaths) {
        try {
            const version = (await readFile(versionPath, 'utf8')).trim();
            if (!version) {
                continue;
            }

            return `HyperCode ${version}`;
        } catch {
            // try next candidate
        }
    }

    return 'HyperCode';
}

export default async function DashboardIndexPage() {
    const versionLabel = await getDashboardVersionLabel();
    return <DashboardHomeClient versionLabel={versionLabel} />;
}
