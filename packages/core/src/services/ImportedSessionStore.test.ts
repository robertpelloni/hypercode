import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let sqliteForTest: Database.Database;

vi.mock('../db/index.js', () => ({
    get sqliteInstance() {
        return sqliteForTest;
    },
}));

type ImportedSessionStoreModule = typeof import('./ImportedSessionStore.js');

function createSchema(database: Database.Database): void {
    database.pragma('foreign_keys = ON');
    database.exec(`
        CREATE TABLE imported_sessions (
            uuid TEXT PRIMARY KEY,
            source_tool TEXT NOT NULL,
            source_path TEXT NOT NULL,
            external_session_id TEXT,
            title TEXT,
            session_format TEXT NOT NULL,
            transcript TEXT NOT NULL,
            excerpt TEXT,
            working_directory TEXT,
            transcript_hash TEXT NOT NULL UNIQUE,
            normalized_session TEXT NOT NULL DEFAULT '{}',
            metadata TEXT NOT NULL DEFAULT '{}',
            discovered_at INTEGER NOT NULL,
            imported_at INTEGER NOT NULL,
            last_modified_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE imported_session_memories (
            uuid TEXT PRIMARY KEY,
            imported_session_uuid TEXT NOT NULL,
            memory_index INTEGER NOT NULL,
            kind TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]',
            source TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL,
            FOREIGN KEY (imported_session_uuid) REFERENCES imported_sessions(uuid) ON DELETE CASCADE,
            UNIQUE(imported_session_uuid, memory_index)
        );
    `);
}

function createSessionInput(hash: string, transcript: string, memoryContent: string) {
    return {
        sourceTool: 'antigravity',
        sourcePath: `C:\\temp\\${hash}.jsonl`,
        externalSessionId: `ext-${hash}`,
        title: `Imported ${hash}`,
        sessionFormat: 'jsonl',
        transcript,
        excerpt: transcript.slice(0, 40),
        workingDirectory: 'C:\\temp',
        transcriptHash: hash,
        normalizedSession: {
            sourceTool: 'antigravity',
            transcriptHash: hash,
        },
        metadata: {
            antigravityImportSurface: 'experimental',
        },
        discoveredAt: 1_700_000_000_000,
        importedAt: 1_700_000_000_100,
        lastModifiedAt: 1_700_000_000_050,
        parsedMemories: [
            {
                kind: 'instruction' as const,
                content: memoryContent,
                tags: ['antigravity', 'instruction'],
                source: 'heuristic' as const,
                metadata: { extraction: 'heuristic' },
            },
            {
                kind: 'memory' as const,
                content: `memory-${hash}`,
                tags: ['antigravity', 'memory'],
                source: 'llm' as const,
                metadata: { extraction: 'llm' },
            },
        ],
    };
}

describe('ImportedSessionStore', () => {
    beforeEach(() => {
        sqliteForTest = new Database(':memory:');
        createSchema(sqliteForTest);
    });

    afterEach(() => {
        sqliteForTest.close();
        vi.restoreAllMocks();
    });

    it('upserts, lists, and fetches imported sessions with parsed memories', async () => {
        const { ImportedSessionStore } = await import('./ImportedSessionStore.js') as ImportedSessionStoreModule;
        const store = new ImportedSessionStore();
        const input = createSessionInput('hash-a', 'User: keep imports truthful.', 'Keep imports truthful.');

        const created = store.upsertSession(input);
        const fetched = store.getImportedSession(created.id);
        const listed = store.listImportedSessions(10);

        expect(store.hasTranscriptHash('hash-a')).toBe(true);
        expect(created.sourceTool).toBe('antigravity');
        expect(created.parsedMemories).toHaveLength(2);
        expect(fetched).not.toBeNull();
        expect(fetched?.parsedMemories.map((entry) => entry.content)).toEqual([
            'Keep imports truthful.',
            'memory-hash-a',
        ]);
        expect(listed).toHaveLength(1);
        expect(listed[0]?.id).toBe(created.id);
    });

    it('reuses the same session row for an existing transcript hash and replaces parsed memories', async () => {
        const { ImportedSessionStore } = await import('./ImportedSessionStore.js') as ImportedSessionStoreModule;
        const store = new ImportedSessionStore();

        const first = store.upsertSession(createSessionInput('hash-b', 'User: first transcript.', 'First instruction.'));
        const second = store.upsertSession({
            ...createSessionInput('hash-b', 'User: updated transcript.', 'Updated instruction.'),
            transcript: 'User: updated transcript.\n\nAssistant: keep antigravity experimental.',
            metadata: {
                antigravityImportSurface: 'experimental',
                revision: 2,
            },
        });

        expect(second.id).toBe(first.id);
        expect(second.transcript).toContain('updated transcript');
        expect(second.metadata).toMatchObject({
            antigravityImportSurface: 'experimental',
            revision: 2,
        });
        expect(second.parsedMemories).toHaveLength(2);
        expect(second.parsedMemories[0]?.content).toBe('Updated instruction.');

        const memoryCount = sqliteForTest
            .prepare('SELECT COUNT(*) AS count FROM imported_session_memories WHERE imported_session_uuid = ?')
            .get(first.id) as { count: number };
        expect(memoryCount.count).toBe(2);
    });

    it('lists only instruction memories in newest-first order', async () => {
        const nowSpy = vi.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(1_700_000_000_100).mockReturnValueOnce(1_700_000_000_200);

        const { ImportedSessionStore } = await import('./ImportedSessionStore.js') as ImportedSessionStoreModule;
        const store = new ImportedSessionStore();

        store.upsertSession(createSessionInput('hash-c', 'User: first transcript.', 'First instruction.'));
        store.upsertSession(createSessionInput('hash-d', 'User: second transcript.', 'Second instruction.'));

        const instructionMemories = store.listInstructionMemories(10);

        expect(instructionMemories).toHaveLength(2);
        expect(instructionMemories.map((entry) => entry.kind)).toEqual(['instruction', 'instruction']);
        expect(instructionMemories.map((entry) => entry.content)).toEqual([
            'Second instruction.',
            'First instruction.',
        ]);
    });
});
