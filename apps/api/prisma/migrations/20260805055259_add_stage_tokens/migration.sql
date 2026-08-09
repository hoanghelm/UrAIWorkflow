-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "agent" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'inherit',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Stage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Stage" ("agent", "attempts", "id", "model", "order", "runId", "stageId", "status", "title") SELECT "agent", "attempts", "id", "model", "order", "runId", "stageId", "status", "title" FROM "Stage";
DROP TABLE "Stage";
ALTER TABLE "new_Stage" RENAME TO "Stage";
CREATE INDEX "Stage_runId_idx" ON "Stage"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
