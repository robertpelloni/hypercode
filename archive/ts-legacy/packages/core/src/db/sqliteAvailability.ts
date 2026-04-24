export function sqliteErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function isSqliteUnavailableError(error: unknown): boolean {
    const message = sqliteErrorMessage(error);
    return message.includes('SQLite runtime is unavailable')
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/db/sqliteAvailability.ts
        || message.includes('SQLite runtime is unavailable for HyperCode DB-backed features')
=======
        || message.includes('SQLite runtime is unavailable for borg DB-backed features')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/db/sqliteAvailability.ts
        || (
            message.includes('Could not locate the bindings file')
            && message.includes('better-sqlite3')
        )
        || message.includes('ERR_DLOPEN_FAILED');
}

export function formatOptionalSqliteFailure(action: string, error: unknown): string {
    if (isSqliteUnavailableError(error)) {
        return `${action}: SQLite runtime is unavailable for this run.`;
    }

    return `${action}: ${sqliteErrorMessage(error)}`;
}
