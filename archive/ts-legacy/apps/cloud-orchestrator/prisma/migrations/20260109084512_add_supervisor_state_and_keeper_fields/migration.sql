-- CreateTable
CREATE TABLE "SupervisorState" (
    "sessionId" TEXT NOT NULL PRIMARY KEY,
    "lastProcessedActivityTimestamp" TEXT,
    "history" TEXT,
    "openaiThreadId" TEXT,
    "openaiAssistantId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeeperSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSwitch" BOOLEAN NOT NULL DEFAULT false,
    "checkIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "inactivityThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
    "activeWorkThresholdMinutes" INTEGER NOT NULL DEFAULT 5,
    "messages" TEXT NOT NULL,
    "customMessages" TEXT NOT NULL,
    "smartPilotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supervisorProvider" TEXT NOT NULL DEFAULT 'openai',
    "supervisorApiKey" TEXT,
    "julesApiKey" TEXT,
    "supervisorModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "contextMessageCount" INTEGER NOT NULL DEFAULT 10,
    "resumePaused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_KeeperSettings" ("activeWorkThresholdMinutes", "autoSwitch", "checkIntervalSeconds", "contextMessageCount", "customMessages", "id", "inactivityThresholdMinutes", "isEnabled", "messages", "smartPilotEnabled", "supervisorApiKey", "supervisorModel", "supervisorProvider", "updatedAt") SELECT "activeWorkThresholdMinutes", "autoSwitch", "checkIntervalSeconds", "contextMessageCount", "customMessages", "id", "inactivityThresholdMinutes", "isEnabled", "messages", "smartPilotEnabled", "supervisorApiKey", "supervisorModel", "supervisorProvider", "updatedAt" FROM "KeeperSettings";
DROP TABLE "KeeperSettings";
ALTER TABLE "new_KeeperSettings" RENAME TO "KeeperSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
