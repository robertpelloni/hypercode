'use client';

import { AlertTriangle, ExternalLink, FlaskConical, Info } from 'lucide-react';

/**
 * PageStatusBanner
 *
 * Renders a small, consistent status notice at the top of a dashboard page to
 * communicate its maturity level to operators. Use this on any page that is:
 *  - experimental  : stubs, parity shells, aspirational surfaces
 *  - beta          : real functionality but incomplete / actively changing
 *  - external-embed: the page is primarily an iframe or link to an external service
 *
 * The banner is purely informational and does not block interaction.
 */

type PageStatus = 'experimental' | 'beta' | 'external-embed';

interface PageStatusBannerProps {
    status: PageStatus;
    /** Override the default message for this status level. */
    message?: string;
    /** Shown below the main message as a secondary note (optional). */
    note?: string;
}

const CONFIG: Record<
    PageStatus,
    {
        icon: React.ComponentType<{ className?: string }>;
        label: string;
        defaultMessage: string;
        bannerClass: string;
        iconClass: string;
        labelClass: string;
    }
> = {
    experimental: {
        icon: FlaskConical,
        label: 'Experimental',
        defaultMessage:
            'This page is a work-in-progress. Functionality may be incomplete, change without notice, or not yet wired to the HyperCode backend.',
        bannerClass: 'bg-amber-950/60 border border-amber-700/40 text-amber-200',
        iconClass: 'text-amber-400',
        labelClass: 'text-amber-300 font-semibold',
    },
    beta: {
        icon: Info,
        label: 'Beta',
        defaultMessage:
            'This page is in active development. Core functionality is available but some features are still being refined.',
        bannerClass: 'bg-blue-950/60 border border-blue-700/40 text-blue-200',
        iconClass: 'text-blue-400',
        labelClass: 'text-blue-300 font-semibold',
    },
    'external-embed': {
        icon: ExternalLink,
        label: 'External Embed',
        defaultMessage:
            'This page embeds an external service. The embedded UI runs outside of HyperCode and requires the service to be running at the configured URL.',
        bannerClass: 'bg-zinc-900/80 border border-zinc-700/40 text-zinc-300',
        iconClass: 'text-zinc-400',
        labelClass: 'text-zinc-300 font-semibold',
    },
};

export function PageStatusBanner({ status, message, note }: PageStatusBannerProps) {
    const cfg = CONFIG[status];
    const Icon = cfg.icon;
    const displayMessage = message ?? cfg.defaultMessage;

    return (
        <div className={`flex items-start gap-3 rounded-md px-4 py-3 mb-4 text-sm ${cfg.bannerClass}`}>
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
            <div className="min-w-0">
                <span className={`mr-1 ${cfg.labelClass}`}>{cfg.label}:</span>
                <span>{displayMessage}</span>
                {note && (
                    <p className="mt-1 opacity-70 text-xs">{note}</p>
                )}
            </div>
        </div>
    );
}
