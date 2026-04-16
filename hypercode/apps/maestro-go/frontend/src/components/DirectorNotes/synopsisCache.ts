type SynopsisStats = NonNullable<
	Awaited<ReturnType<typeof window.maestro.directorNotes.generateSynopsis>>['stats']
>;

export type CachedSynopsis = {
	content: string;
	generatedAt: number;
	lookbackDays: number;
	stats?: SynopsisStats;
};

let cachedSynopsis: CachedSynopsis | null = null;

export function getCachedSynopsis(): CachedSynopsis | null {
	return cachedSynopsis;
}

export function setCachedSynopsis(value: CachedSynopsis | null): void {
	cachedSynopsis = value;
}

export function hasCachedSynopsis(): boolean {
	return cachedSynopsis !== null;
}

export function resetSynopsisCacheForTesting(): void {
	cachedSynopsis = null;
}
