/**
 * @file config.repo.ts
 * @module packages/core/src/db/repositories/config.repo
 *
 * WHAT:
 * Repository for Global Configuration.
 *
 * WHY:
 * Stores app-wide settings (e.g. timeouts, auth flags).
 * Note: Config table is simple Key-Value store.
 */

import { eq } from "drizzle-orm";

import { db } from "../index";
import { configTable } from "../metamcp-schema";

export class ConfigRepository {
    async get(key: string): Promise<string | null> {
        const [config] = await db
            .select({ value: configTable.value })
            .from(configTable)
            .where(eq(configTable.key, key));

        return config?.value ?? null;
    }

    async set(key: string, value: string): Promise<void> {
        await db
            .insert(configTable)
            .values({ key, value })
            .onConflictDoUpdate({
                target: configTable.key,
                set: { value, updated_at: new Date() },
            });
    }

    async delete(key: string): Promise<void> {
        await db.delete(configTable).where(eq(configTable.key, key));
    }

    // Helper to get typed configs (boolean/number)
    // Logic usually in service, but simple helpers here are fine
}

export const configRepo = new ConfigRepository();
