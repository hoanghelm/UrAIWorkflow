-- CreateTable
CREATE TABLE "ProjectPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "packName" TEXT NOT NULL,
    "installedVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProjectPack_projectId_idx" ON "ProjectPack"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPack_projectId_packName_key" ON "ProjectPack"("projectId", "packName");

