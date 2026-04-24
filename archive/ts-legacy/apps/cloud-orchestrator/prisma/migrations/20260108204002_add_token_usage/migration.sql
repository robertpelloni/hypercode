-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Debate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "summary" TEXT,
    "rounds" TEXT NOT NULL,
    "history" TEXT NOT NULL,
    "metadata" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Debate" ("createdAt", "history", "id", "metadata", "rounds", "summary", "topic", "updatedAt") SELECT "createdAt", "history", "id", "metadata", "rounds", "summary", "topic", "updatedAt" FROM "Debate";
DROP TABLE "Debate";
ALTER TABLE "new_Debate" RENAME TO "Debate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
