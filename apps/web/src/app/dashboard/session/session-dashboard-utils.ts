export function formatRelativeTimestamp(timestamp: number, now: number): string {
    const deltaMs = Math.max(0, now - timestamp);
    const deltaMinutes = Math.floor(deltaMs / 60_000);

    if (deltaMinutes < 1) {
        return 'just now';
    }

    if (deltaMinutes < 60) {
        return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) {
        return `${deltaHours}h ago`;
    }

    return `${Math.floor(deltaHours / 24)}d ago`;
}

export function formatRestartCountdown(timestamp: number, now: number): string {
    const remainingMs = Math.max(0, timestamp - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingSeconds <= 1) {
        return 'in <1s';
    }

    if (remainingSeconds < 60) {
        return `in ${remainingSeconds}s`;
    }

    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    if (remainingMinutes < 60) {
        return `in ${remainingMinutes}m`;
    }

    const remainingHours = Math.ceil(remainingMinutes / 60);
    if (remainingHours < 24) {
        return `in ${remainingHours}h`;
    }

    return `in ${Math.ceil(remainingHours / 24)}d`;
}

export function getSessionTone(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-emerald-600 hover:bg-emerald-500';
        case 'starting':
        case 'restarting':
            return 'bg-amber-600 hover:bg-amber-500';
        case 'error':
            return 'bg-red-600 hover:bg-red-500';
        default:
            return 'bg-zinc-700 hover:bg-zinc-600';
    }
}

export function getHealthTone(status?: string): string {
    switch (status) {
        case 'healthy':
            return 'bg-emerald-600 hover:bg-emerald-500';
        case 'degraded':
            return 'bg-amber-600 hover:bg-amber-500';
        case 'unresponsive':
        case 'crashed':
            return 'bg-red-600 hover:bg-red-500';
        default:
            return 'bg-zinc-700 hover:bg-zinc-600';
    }
}

function quoteForPowerShell(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

export function buildAttachCommand(cwd: string, command: string, args: string[]): string {
    const quotedArgs = args.map((arg) => quoteForPowerShell(arg)).join(' ');
    const commandPart = `& ${quoteForPowerShell(command)}`;
    const argsPart = quotedArgs ? ` ${quotedArgs}` : '';

    return `Set-Location -LiteralPath ${quoteForPowerShell(cwd)}; ${commandPart}${argsPart}`;
}