-- CreateTable
CREATE TABLE "BoardComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'human',
    "kind" TEXT NOT NULL DEFAULT 'comment',
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardComment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BoardCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoardCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'task',
    "project" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_BoardCard" ("artifacts", "createdAt", "id", "links", "maxLoops", "model", "order", "pack", "parentId", "project", "projectId", "requirement", "runId", "status", "title", "type", "worktree") SELECT "artifacts", "createdAt", "id", "links", "maxLoops", "model", "order", "pack", "parentId", "project", "projectId", "requirement", "runId", "status", "title", "type", "worktree" FROM "BoardCard";
DROP TABLE "BoardCard";
ALTER TABLE "new_BoardCard" RENAME TO "BoardCard";
CREATE INDEX "BoardCard_projectId_idx" ON "BoardCard"("projectId");
CREATE INDEX "BoardCard_parentId_idx" ON "BoardCard"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BoardComment_cardId_idx" ON "BoardComment"("cardId");

