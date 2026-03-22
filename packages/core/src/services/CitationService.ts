/**
 * NotebookLM-Style Citation Service
 *
 * Provides source-grounded, citation-backed answers by:
 * 1. Accepting a user query + a set of source documents
 * 2. Retrieving relevant chunks via vector similarity (LanceDB)
 * 3. Generating an answer with inline citations [1], [2], etc.
 * 4. Returning the answer + citation metadata for UI rendering
 *
 * This is the Borg equivalent of NotebookLM's "Grounded Answers" feature.
 */

export interface CitationSource {
    id: string;
    title: string;
    content: string;
    url?: string;
    sourceType: 'document' | 'email' | 'web-memory' | 'bookmark' | 'file';
    metadata?: Record<string, unknown>;
}

export interface CitationChunk {
    sourceId: string;
    sourceTitle: string;
    chunkText: string;
    relevanceScore: number;
    startOffset?: number;
    endOffset?: number;
}

export interface InlineCitation {
    index: number;        // [1], [2], etc.
    sourceId: string;
    sourceTitle: string;
    excerpt: string;      // The exact passage cited
    url?: string;
}

export interface GroundedAnswer {
    answer: string;       // Text with inline references like [1], [2]
    citations: InlineCitation[];
    sourcesUsed: number;
    totalSourcesAvailable: number;
    confidence: number;   // 0-1 based on how well grounded the answer is
    generatedAt: Date;
}

export interface CitationServiceConfig {
    maxChunksPerQuery: number;
    chunkSize: number;
    chunkOverlap: number;
    minRelevanceScore: number;
    maxCitationsPerAnswer: number;
}

const DEFAULT_CONFIG: CitationServiceConfig = {
    maxChunksPerQuery: 20,
    chunkSize: 500,
    chunkOverlap: 50,
    minRelevanceScore: 0.3,
    maxCitationsPerAnswer: 10,
};

/**
 * Splits a document into overlapping chunks for embedding/retrieval.
 */
export function chunkDocument(content: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const words = content.split(/\s+/);

    if (words.length <= chunkSize) {
        return [content];
    }

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 0) {
            chunks.push(chunk);
        }
        if (i + chunkSize >= words.length) break;
    }

    return chunks;
}

/**
 * Extracts citation references from an LLM-generated answer.
 * Looks for patterns like [1], [2], [Source 1], etc.
 */
export function extractCitationReferences(answer: string): number[] {
    const matches = answer.matchAll(/\[(\d+)\]/g);
    const refs = new Set<number>();
    for (const match of matches) {
        refs.add(parseInt(match[1], 10));
    }
    return Array.from(refs).sort((a, b) => a - b);
}

/**
 * Builds a grounded prompt that instructs the LLM to cite sources.
 */
export function buildGroundedPrompt(query: string, chunks: CitationChunk[]): string {
    const sourceContext = chunks
        .map((chunk, i) => `[Source ${i + 1}] (${chunk.sourceTitle}):\n${chunk.chunkText}`)
        .join('\n\n');

    return `You are a research assistant that provides accurate, source-grounded answers.

SOURCES:
${sourceContext}

INSTRUCTIONS:
- Answer the user's question using ONLY the information from the sources above.
- Cite your sources using numbered references like [1], [2], etc.
- If the sources don't contain enough information, say so explicitly.
- Keep your answer concise and well-structured.
- Every claim must be backed by at least one source citation.

USER QUESTION: ${query}

GROUNDED ANSWER:`;
}

export class CitationService {
    private config: CitationServiceConfig;

    constructor(config?: Partial<CitationServiceConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    getConfig(): CitationServiceConfig {
        return { ...this.config };
    }

    /**
     * Index sources — splits each source into chunks ready for embedding.
     */
    indexSources(sources: CitationSource[]): CitationChunk[] {
        const allChunks: CitationChunk[] = [];

        for (const source of sources) {
            const textChunks = chunkDocument(
                source.content,
                this.config.chunkSize,
                this.config.chunkOverlap,
            );

            for (const chunkText of textChunks) {
                allChunks.push({
                    sourceId: source.id,
                    sourceTitle: source.title,
                    chunkText,
                    relevanceScore: 0, // Set during retrieval
                });
            }
        }

        return allChunks;
    }

    /**
     * Build citation metadata from an LLM answer and the chunks that were used.
     */
    buildCitations(answer: string, usedChunks: CitationChunk[], sources: CitationSource[]): InlineCitation[] {
        const refNumbers = extractCitationReferences(answer);
        const citations: InlineCitation[] = [];

        for (const refNum of refNumbers) {
            const chunkIndex = refNum - 1; // [1] → index 0
            if (chunkIndex >= 0 && chunkIndex < usedChunks.length) {
                const chunk = usedChunks[chunkIndex];
                const source = sources.find(s => s.id === chunk.sourceId);

                citations.push({
                    index: refNum,
                    sourceId: chunk.sourceId,
                    sourceTitle: chunk.sourceTitle,
                    excerpt: chunk.chunkText.substring(0, 200),
                    url: source?.url,
                });
            }
        }

        return citations;
    }

    /**
     * Generate a grounded answer with citations.
     * In production, this calls the LLM with the grounded prompt.
     */
    async generateGroundedAnswer(
        query: string,
        sources: CitationSource[],
        llmCall?: (prompt: string) => Promise<string>,
    ): Promise<GroundedAnswer> {
        const chunks = this.indexSources(sources);

        // Simple relevance scoring: keyword match (swap with vector similarity in production)
        const queryWords = new Set(query.toLowerCase().split(/\s+/));
        const scoredChunks = chunks.map(chunk => ({
            ...chunk,
            relevanceScore: chunk.chunkText
                .toLowerCase()
                .split(/\s+/)
                .filter(w => queryWords.has(w)).length / queryWords.size,
        }));

        // Sort by relevance and take top chunks
        const topChunks = scoredChunks
            .filter(c => c.relevanceScore >= this.config.minRelevanceScore)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, this.config.maxChunksPerQuery);

        const prompt = buildGroundedPrompt(query, topChunks);

        let answer: string;
        if (llmCall) {
            answer = await llmCall(prompt);
        } else {
            // Fallback: return a structured summary without LLM
            answer = topChunks.length > 0
                ? `Based on ${topChunks.length} relevant sources:\n\n` +
                  topChunks.map((c, i) => `[${i + 1}] ${c.chunkText.substring(0, 150)}...`).join('\n\n')
                : 'No relevant sources found for this query.';
        }

        const citations = this.buildCitations(answer, topChunks, sources);

        return {
            answer,
            citations,
            sourcesUsed: new Set(topChunks.map(c => c.sourceId)).size,
            totalSourcesAvailable: sources.length,
            confidence: topChunks.length > 0
                ? Math.min(1, topChunks.reduce((sum, c) => sum + c.relevanceScore, 0) / topChunks.length)
                : 0,
            generatedAt: new Date(),
        };
    }
}

export const citationService = new CitationService();
