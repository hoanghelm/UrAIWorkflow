-- CreateTable
CREATE TABLE "StageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "cardId" TEXT,
    "cwd" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'pipeline',
    "name" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "breach" TEXT,
    "question" TEXT,
    "workflow" TEXT NOT NULL,
    "tokensConsumed" INTEGER NOT NULL DEFAULT 0,
    "tokensSaved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("breach", "cardId", "createdAt", "cwd", "id", "name", "pack", "projectId", "question", "status", "tokensConsumed", "tokensSaved", "updatedAt", "workflow") SELECT "breach", "cardId", "createdAt", "cwd", "id", "name", "pack", "projectId", "question", "status", "tokensConsumed", "tokensSaved", "updatedAt", "workflow" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
CREATE INDEX "Run_projectId_idx" ON "Run"("projectId");
CREATE INDEX "Run_status_idx" ON "Run"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StageLog_runId_idx" ON "StageLog"("runId");
