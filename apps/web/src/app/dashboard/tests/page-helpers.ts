export type TestResult = {
    file: string;
    status: 'pass' | 'fail' | 'running' | string;
    timestamp: number;
    output?: string;
};

export function normalizeResults(data: unknown): TestResult[] {
    if (!Array.isArray(data)) return [];
    return data.map((r: unknown) => {
        if (!r || typeof r !== 'object') return { file: '', status: 'unknown', timestamp: 0 };
        const entry = r as Record<string, unknown>;
        return {
            file: typeof entry['file'] === 'string' ? entry['file'] : '',
            status: typeof entry['status'] === 'string' ? entry['status'] : 'unknown',
            timestamp: typeof entry['timestamp'] === 'number' ? entry['timestamp'] : 0,
            output: typeof entry['output'] === 'string' ? entry['output'] : undefined,
        };
    });
}

export function normalizeStatus(data: unknown): { isRunning: boolean; results: Record<string, TestResult> } {
    if (!data || typeof data !== 'object') return { isRunning: false, results: {} };
    const s = data as Record<string, unknown>;
    return {
        isRunning: s['isRunning'] === true,
        results: (s['results'] && typeof s['results'] === 'object' && !Array.isArray(s['results']))
            ? s['results'] as Record<string, TestResult>
            : {},
    };
}

export function isRerunnableResult(status: string): boolean {
    return status === 'fail' || status === 'pass';
}

export function filterResults(results: TestResult[], options: {
    query: string;
    statusFilter: 'all' | 'fail' | 'running' | 'pass';
}): TestResult[] {
    const normalizedQuery = options.query.trim().toLowerCase();

    return results.filter((result) => {
        if (options.statusFilter !== 'all' && result.status !== options.statusFilter) {
            return false;
        }

        if (!normalizedQuery) {
            return true;
        }

        const haystack = [result.file, result.status, result.output ?? '']
            .join(' ')
            .toLowerCase();

        return haystack.includes(normalizedQuery);
    });
}