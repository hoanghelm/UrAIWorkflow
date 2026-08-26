-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "persona" TEXT NOT NULL DEFAULT 'generalist',
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
    "version" TEXT NOT NULL DEFAULT '0.0.0',
    "source" TEXT NOT NULL DEFAULT 'discovered',
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
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "stars" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT '',
    "archive" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "Run" (
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
    "tokensInput" INTEGER NOT NULL DEFAULT 0,
    "tokensOutput" INTEGER NOT NULL DEFAULT 0,
    "tokensCached" INTEGER NOT NULL DEFAULT 0,
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
    "tokens" INTEGER NOT NULL DEFAULT 0,
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
CREATE TABLE "StageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "trace" TEXT NOT NULL DEFAULT '',
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardCard" (
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
    "labels" TEXT NOT NULL DEFAULT '[]',
    "sprintId" TEXT,
    "assignee" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "projectId" TEXT,
    "cardId" TEXT,
    "build" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "files" TEXT NOT NULL DEFAULT '[]',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "preview" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BoardAutomation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

-- CreateTable
CREATE TABLE "WorkspaceConnector" (
    "projectId" TEXT NOT NULL PRIMARY KEY,
    "connectorId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "packName" TEXT NOT NULL,
    "installedVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "blockKind" TEXT NOT NULL,
    "blockName" TEXT NOT NULL,
    "invocations" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DesignArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "designId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'mockup',
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'html',
    "content" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DesignArtifact_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DesignVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artifactId" TEXT NOT NULL,
    "build" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignVersion_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "DesignArtifact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "Bundle_kind_idx" ON "Bundle"("kind");

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
CREATE INDEX "StageLog_runId_idx" ON "StageLog"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "StageLog_runId_stageId_key" ON "StageLog"("runId", "stageId");

-- CreateIndex
CREATE INDEX "BoardCard_projectId_idx" ON "BoardCard"("projectId");

-- CreateIndex
CREATE INDEX "BoardCard_parentId_idx" ON "BoardCard"("parentId");

-- CreateIndex
CREATE INDEX "Artifact_cardId_idx" ON "Artifact"("cardId");

-- CreateIndex
CREATE INDEX "Artifact_runId_idx" ON "Artifact"("runId");

-- CreateIndex
CREATE INDEX "BoardComment_cardId_idx" ON "BoardComment"("cardId");

-- CreateIndex
CREATE INDEX "Sprint_projectId_idx" ON "Sprint"("projectId");

-- CreateIndex
CREATE INDEX "BoardAutomation_projectId_idx" ON "BoardAutomation"("projectId");

-- CreateIndex
CREATE INDEX "Trigger_projectId_idx" ON "Trigger"("projectId");

-- CreateIndex
CREATE INDEX "Connector_active_idx" ON "Connector"("active");

-- CreateIndex
CREATE INDEX "LedgerEntry_runId_idx" ON "LedgerEntry"("runId");

-- CreateIndex
CREATE INDEX "ProjectPack_projectId_idx" ON "ProjectPack"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPack_projectId_packName_key" ON "ProjectPack"("projectId", "packName");

-- CreateIndex
CREATE INDEX "UsageStat_projectId_idx" ON "UsageStat"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageStat_projectId_blockKind_blockName_key" ON "UsageStat"("projectId", "blockKind", "blockName");

-- CreateIndex
CREATE INDEX "Design_projectId_idx" ON "Design"("projectId");

-- CreateIndex
CREATE INDEX "DesignArtifact_designId_idx" ON "DesignArtifact"("designId");

-- CreateIndex
CREATE INDEX "DesignVersion_artifactId_idx" ON "DesignVersion"("artifactId");

