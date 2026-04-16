export function parseArgsInput(value: string): string[] {
    return value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function parseEnvInput(value: string): Record<string, string> {
    const entries = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
            const separatorIndex = line.indexOf('=');

            if (separatorIndex <= 0) {
                return [];
            }

            const key = line.slice(0, separatorIndex).trim();
            const rawValue = line.slice(separatorIndex + 1).trim();

            if (!key) {
                return [];
            }

            return [[key, rawValue]] as const;
        });

    return Object.fromEntries(entries);
}