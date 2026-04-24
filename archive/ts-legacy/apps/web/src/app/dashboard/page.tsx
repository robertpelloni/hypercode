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

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/page.tsx
            return `HyperCode ${version}`;
=======
            return `borg ${version}`;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/page.tsx
        } catch {
            // try next candidate
        }
    }

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/page.tsx
    return 'HyperCode';
=======
    return 'borg';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/page.tsx
}

export default async function DashboardIndexPage() {
    const versionLabel = await getDashboardVersionLabel();
    return <DashboardHomeClient versionLabel={versionLabel} />;
}
