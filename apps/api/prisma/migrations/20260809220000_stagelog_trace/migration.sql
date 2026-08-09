-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "trace" TEXT NOT NULL DEFAULT '',
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StageLog" ("createdAt", "id", "runId", "stageId", "text", "tokens") SELECT "createdAt", "id", "runId", "stageId", "text", "tokens" FROM "StageLog";
DROP TABLE "StageLog";
ALTER TABLE "new_StageLog" RENAME TO "StageLog";
CREATE INDEX "StageLog_runId_idx" ON "StageLog"("runId");
CREATE UNIQUE INDEX "StageLog_runId_stageId_key" ON "StageLog"("runId", "stageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

