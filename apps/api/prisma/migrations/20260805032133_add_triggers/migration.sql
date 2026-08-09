-- CreateTable
CREATE TABLE "Trigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'manual',
    "intervalSec" INTEGER NOT NULL DEFAULT 3600,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Trigger_projectId_idx" ON "Trigger"("projectId");
