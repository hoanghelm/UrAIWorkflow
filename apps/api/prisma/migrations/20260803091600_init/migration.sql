-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "path" TEXT,
    "trust" TEXT NOT NULL DEFAULT 'community',
    "meta" TEXT NOT NULL DEFAULT '{}',
    "projectId" TEXT,
    CONSTRAINT "CatalogItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "trust" TEXT NOT NULL DEFAULT 'community',
    "manifest" TEXT NOT NULL,
    "installed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "agent" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'inherit',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Stage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'info',
    "stageId" TEXT,
    "status" TEXT,
    "stageStatus" TEXT,
    "breach" TEXT,
    "message" TEXT NOT NULL,
    CONSTRAINT "RunEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Checkpoint_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseUrl" TEXT,
    "models" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "lever" TEXT NOT NULL,
    "tokensBefore" INTEGER NOT NULL,
    "tokensAfter" INTEGER NOT NULL,
    "saved" INTEGER NOT NULL,
    CONSTRAINT "LedgerEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_root_key" ON "Project"("root");

-- CreateIndex
CREATE INDEX "CatalogItem_kind_idx" ON "CatalogItem"("kind");

-- CreateIndex
CREATE INDEX "CatalogItem_projectId_idx" ON "CatalogItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Pack_name_version_key" ON "Pack"("name", "version");

-- CreateIndex
CREATE INDEX "Run_projectId_idx" ON "Run"("projectId");

-- CreateIndex
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- CreateIndex
CREATE INDEX "Stage_runId_idx" ON "Stage"("runId");

-- CreateIndex
CREATE INDEX "RunEvent_runId_idx" ON "RunEvent"("runId");

-- CreateIndex
CREATE INDEX "Checkpoint_runId_idx" ON "Checkpoint"("runId");

-- CreateIndex
CREATE INDEX "Connector_active_idx" ON "Connector"("active");

-- CreateIndex
CREATE INDEX "LedgerEntry_runId_idx" ON "LedgerEntry"("runId");
