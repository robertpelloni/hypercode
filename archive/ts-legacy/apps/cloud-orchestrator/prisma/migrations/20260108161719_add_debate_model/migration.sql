-- CreateTable
CREATE TABLE "SessionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isPrebuilt" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KeeperSettings" (
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
    "supervisorModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "contextMessageCount" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KeeperLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "summary" TEXT,
    "rounds" TEXT NOT NULL,
    "history" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
