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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CatalogItem" (
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
INSERT INTO "new_CatalogItem" ("id", "kind", "meta", "name", "path", "projectId", "scope", "trust") SELECT "id", "kind", "meta", "name", "path", "projectId", "scope", "trust" FROM "CatalogItem";
DROP TABLE "CatalogItem";
ALTER TABLE "new_CatalogItem" RENAME TO "CatalogItem";
CREATE INDEX "CatalogItem_kind_idx" ON "CatalogItem"("kind");
CREATE INDEX "CatalogItem_projectId_idx" ON "CatalogItem"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UsageStat_projectId_idx" ON "UsageStat"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageStat_projectId_blockKind_blockName_key" ON "UsageStat"("projectId", "blockKind", "blockName");

