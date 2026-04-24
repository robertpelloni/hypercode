import type { BillingProviderQuotaSummary } from '../../billing/billing-portal-data';
import { getProviderPortalCards } from '../../billing/billing-portal-data';

export interface DetectedCliHarnessSummary {
    id: string;
    name: string;
    command: string;
    homepage: string;
    docsUrl: string;
    installHint: string;
    sessionCapable: boolean;
    installed: boolean;
    resolvedPath: string | null;
    version: string | null;
    detectionError: string | null;
}

export interface SessionSummary {
    cliType: string;
    status: string;
}

export interface CliHarnessCard extends DetectedCliHarnessSummary {
    activeSessions: number;
    runningSessions: number;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'muted';
}

export interface ProviderDirectoryCard {
    provider: string;
    label: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'danger' | 'muted';
    authLabel: string;
    availabilityLabel: string;
    usageLabel: string;
    resetLabel: string;
    href: string;
}

export function getCliHarnessCards(
    detections: DetectedCliHarnessSummary[] | undefined,
    sessions: SessionSummary[] | undefined,
): CliHarnessCard[] {
    const sessionCounts = new Map<string, { active: number; running: number }>();

    for (const session of (Array.isArray(sessions) ? sessions : [])) {
        if (!session || typeof session !== 'object' || typeof session.cliType !== 'string') {
            continue;
        }

        const current = sessionCounts.get(session.cliType) ?? { active: 0, running: 0 };
        current.active += 1;
        if (session.status === 'running' || session.status === 'starting' || session.status === 'restarting') {
            current.running += 1;
        }
        sessionCounts.set(session.cliType, current);
    }

    return [...(Array.isArray(detections) ? detections : [])]
        .filter((entry) => Boolean(entry) && typeof entry === 'object' && typeof entry.id === 'string')
        .map((entry) => {
            const counts = sessionCounts.get(entry.id) ?? { active: 0, running: 0 };
            return {
                ...entry,
                activeSessions: counts.active,
                runningSessions: counts.running,
                statusLabel: entry.installed
                    ? counts.running > 0
                        ? `${counts.running} running`
                        : 'Installed'
                    : 'Not detected',
                statusTone: entry.installed
                    ? counts.running > 0
                        ? 'success'
                        : 'warning'
                    : 'muted',
            } satisfies CliHarnessCard;
        })
        .sort((left, right) => {
            if (left.installed !== right.installed) {
                return left.installed ? -1 : 1;
            }
            return left.name.localeCompare(right.name);
        });
}

export function getProviderDirectoryCards(
    quotas: BillingProviderQuotaSummary[] | undefined,
): ProviderDirectoryCard[] {
    const normalizedQuotas = (Array.isArray(quotas) ? quotas : [])
        .filter((quota) => Boolean(quota) && typeof quota === 'object' && typeof quota.provider === 'string')
    const quotaMap = new Map(normalizedQuotas.map((quota) => [quota.provider, quota]));

    return getProviderPortalCards(normalizedQuotas).map((portal) => {
        const quota = quotaMap.get(portal.id);
        const used = quota?.used ?? 0;
        const limit = quota?.limit ?? null;

        return {
            provider: portal.id,
            label: portal.label,
            statusLabel: portal.statusLabel,
            statusTone: portal.statusTone,
            authLabel: portal.authLabel,
            availabilityLabel: portal.availabilityLabel,
            usageLabel: limit == null
                ? `${used} used`
                : `${used} / ${limit}`,
            resetLabel: quota?.resetDate ?? 'reset unknown',
            href: portal.actions[0]?.href ?? '#',
        } satisfies ProviderDirectoryCard;
    });
}

export function getStatusBadgeClasses(tone: CliHarnessCard['statusTone'] | ProviderDirectoryCard['statusTone']): string {
    switch (tone) {
        case 'success':
            return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        case 'warning':
            return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
        case 'danger':
            return 'bg-red-500/10 text-red-300 border-red-500/20';
        default:
            return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
}
