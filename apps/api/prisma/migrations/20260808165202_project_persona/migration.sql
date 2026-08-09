-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "persona" TEXT NOT NULL DEFAULT 'generalist',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Project" ("createdAt", "id", "name", "root") SELECT "createdAt", "id", "name", "root" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_root_key" ON "Project"("root");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

