-- CreateTable
CREATE TABLE "Passage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "translation" TEXT,
    "topicId" INTEGER,
    "level" TEXT NOT NULL DEFAULT 'Intermediate',
    "tags" TEXT,
    "timesPracticed" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" DATETIME,
    "bestScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Passage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PassageSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "passageId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracy" REAL,
    "wpm" INTEGER,
    "timeSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassageSession_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Passage_topicId_idx" ON "Passage"("topicId");

-- CreateIndex
CREATE INDEX "Passage_createdAt_idx" ON "Passage"("createdAt");

-- CreateIndex
CREATE INDEX "PassageSession_passageId_idx" ON "PassageSession"("passageId");

-- CreateIndex
CREATE INDEX "PassageSession_createdAt_idx" ON "PassageSession"("createdAt");
