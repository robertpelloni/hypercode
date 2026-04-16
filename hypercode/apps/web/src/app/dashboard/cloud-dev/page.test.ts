import { describe, expect, it } from "vitest";
import { filterHistoryEntries, getHistoryCoverage, getLoadAllLimit } from "./page-helpers";

describe("cloud-dev page helpers", () => {
    it("reports history coverage and remaining count", () => {
        expect(getHistoryCoverage({ loadedCount: 100, totalCount: 264, label: "messages" })).toEqual({
            loaded: 100,
            total: 264,
            hasMore: true,
            remaining: 164,
            label: "Showing 100 of 264 messages",
        });
    });

    it("caps load-all limit to the maximum supported query window", () => {
        expect(getLoadAllLimit(380, 1000)).toBe(380);
        expect(getLoadAllLimit(2300, 2000)).toBe(2000);
        expect(getLoadAllLimit(0, 2000)).toBe(1);
    });

    it("filters history entries across message content and metadata case-insensitively", () => {
        const filtered = filterHistoryEntries(
            [
                { id: "1", content: "Investigate failed sync", role: "agent", timestamp: "2026-03-17T10:00:00.000Z" },
                { id: "2", message: "Auto-accept plan toggled", level: "info", timestamp: "2026-03-17T10:05:00.000Z" },
                { id: "3", content: "Normal progress update", role: "user", timestamp: "2026-03-17T10:10:00.000Z" },
            ],
            "AUTO-ACCEPT"
        );

        expect(filtered).toEqual([
            { id: "2", message: "Auto-accept plan toggled", level: "info", timestamp: "2026-03-17T10:05:00.000Z" },
        ]);
    });

    it("returns the original array when the history filter is empty", () => {
        const entries = [{ id: "1", content: "hello" }];
        expect(filterHistoryEntries(entries, "   ")).toBe(entries);
    });
});
