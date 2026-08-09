-- CreateTable
CREATE TABLE "BoardCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL DEFAULT '',
    "pack" TEXT NOT NULL DEFAULT 'eng-loop',
    "model" TEXT NOT NULL DEFAULT 'sonnet',
    "maxLoops" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "runId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BoardCard_projectId_idx" ON "BoardCard"("projectId");
