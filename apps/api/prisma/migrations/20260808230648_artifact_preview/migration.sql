-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "projectId" TEXT,
    "cardId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "preview" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Artifact" ("cardId", "createdAt", "fileCount", "id", "name", "path", "projectId", "runId", "sizeBytes") SELECT "cardId", "createdAt", "fileCount", "id", "name", "path", "projectId", "runId", "sizeBytes" FROM "Artifact";
DROP TABLE "Artifact";
ALTER TABLE "new_Artifact" RENAME TO "Artifact";
CREATE INDEX "Artifact_cardId_idx" ON "Artifact"("cardId");
CREATE INDEX "Artifact_runId_idx" ON "Artifact"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

