import { describe, expect, it } from "vitest";
import { extractBookmarksFromPayload, normalizeBookmarkUrl } from "./bobby-bookmarks-adapter.js";

describe("BobbyBookmarksBacklogAdapter helpers", () => {
    it("normalizes bookmark URLs by stripping tracking params and hashes", () => {
        expect(
            normalizeBookmarkUrl("https://example.com/page?utm_source=test&q=borg&fbclid=abc#section")
        ).toBe("https://example.com/page?q=borg");
    });

    it("extracts bookmarks from common API payload shapes", () => {
        const bookmark = { id: 1, url: "https://example.com" };

        expect(extractBookmarksFromPayload([bookmark])).toEqual([bookmark]);
        expect(extractBookmarksFromPayload({ items: [bookmark] })).toEqual([bookmark]);
        expect(extractBookmarksFromPayload({ bookmarks: [bookmark] })).toEqual([bookmark]);
        expect(extractBookmarksFromPayload({ data: [bookmark] })).toEqual([bookmark]);
        expect(extractBookmarksFromPayload({ nope: [] })).toEqual([]);
    });
});
