-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoardCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'task',
    "parentId" TEXT,
    "pack" TEXT NOT NULL DEFAULT 'eng-loop',
    "model" TEXT NOT NULL DEFAULT 'sonnet',
    "maxLoops" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "review" TEXT NOT NULL DEFAULT 'none',
    "runId" TEXT,
    "worktree" TEXT,
    "artifacts" TEXT NOT NULL DEFAULT '[]',
    "links" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_BoardCard" ("artifacts", "createdAt", "id", "links", "maxLoops", "model", "order", "pack", "parentId", "projectId", "requirement", "review", "runId", "status", "title", "type", "worktree") SELECT "artifacts", "createdAt", "id", "links", "maxLoops", "model", "order", "pack", "parentId", "projectId", "requirement", "review", "runId", "status", "title", "type", "worktree" FROM "BoardCard";
DROP TABLE "BoardCard";
ALTER TABLE "new_BoardCard" RENAME TO "BoardCard";
CREATE INDEX "BoardCard_projectId_idx" ON "BoardCard"("projectId");
CREATE INDEX "BoardCard_parentId_idx" ON "BoardCard"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

