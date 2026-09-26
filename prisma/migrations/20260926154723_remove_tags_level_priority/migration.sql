-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "word" TEXT NOT NULL,
    "type" TEXT,
    "meaning" TEXT NOT NULL,
    "definition" TEXT,
    "example" TEXT,
    "note" TEXT,
    "topicId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewAt" DATETIME,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Word_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Word" ("correctCount", "createdAt", "definition", "example", "id", "lastReviewAt", "meaning", "nextReviewAt", "note", "stage", "topicId", "type", "word", "wrongCount") SELECT "correctCount", "createdAt", "definition", "example", "id", "lastReviewAt", "meaning", "nextReviewAt", "note", "stage", "topicId", "type", "word", "wrongCount" FROM "Word";
DROP TABLE "Word";
ALTER TABLE "new_Word" RENAME TO "Word";
CREATE INDEX "Word_topicId_idx" ON "Word"("topicId");
CREATE INDEX "Word_nextReviewAt_idx" ON "Word"("nextReviewAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

