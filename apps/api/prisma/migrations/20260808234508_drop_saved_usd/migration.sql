-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "lever" TEXT NOT NULL,
    "tokensBefore" INTEGER NOT NULL,
    "tokensAfter" INTEGER NOT NULL,
    "saved" INTEGER NOT NULL,
    CONSTRAINT "LedgerEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LedgerEntry" ("id", "lever", "runId", "saved", "stageId", "tokensAfter", "tokensBefore") SELECT "id", "lever", "runId", "saved", "stageId", "tokensAfter", "tokensBefore" FROM "LedgerEntry";
DROP TABLE "LedgerEntry";
ALTER TABLE "new_LedgerEntry" RENAME TO "LedgerEntry";
CREATE INDEX "LedgerEntry_runId_idx" ON "LedgerEntry"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

