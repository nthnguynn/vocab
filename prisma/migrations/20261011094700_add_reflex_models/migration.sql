-- CreateTable
CREATE TABLE "ReflexSentenceProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitNumber" INTEGER NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "timesPracticed" INTEGER NOT NULL DEFAULT 0,
    "lastScore" INTEGER,
    "lastPracticedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReflexSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitNumber" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracy" REAL,
    "totalCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "timeSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ReflexSentenceProgress_unitNumber_idx" ON "ReflexSentenceProgress"("unitNumber");

-- CreateIndex
CREATE INDEX "ReflexSentenceProgress_isBookmarked_idx" ON "ReflexSentenceProgress"("isBookmarked");

-- CreateIndex
CREATE UNIQUE INDEX "ReflexSentenceProgress_unitNumber_orderNumber_key" ON "ReflexSentenceProgress"("unitNumber", "orderNumber");

-- CreateIndex
CREATE INDEX "ReflexSession_unitNumber_idx" ON "ReflexSession"("unitNumber");

-- CreateIndex
CREATE INDEX "ReflexSession_createdAt_idx" ON "ReflexSession"("createdAt");
