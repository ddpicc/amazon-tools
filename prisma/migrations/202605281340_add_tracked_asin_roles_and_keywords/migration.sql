-- CreateEnum
CREATE TYPE "TrackedAsinRole" AS ENUM ('OWN', 'COMPETITOR');

-- AlterTable
ALTER TABLE "ProjectSettings"
ADD COLUMN "keywordRankDropThreshold" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "manualRefreshLimitPerDay" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "TrackedAsin"
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "role" "TrackedAsinRole" NOT NULL DEFAULT 'COMPETITOR';

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordRankSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trackedAsinId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "rank" INTEGER,
    "page" INTEGER,
    "rawPayload" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordRankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedAsin_role_idx" ON "TrackedAsin"("role");

-- CreateIndex
CREATE INDEX "TrackedAsin_priority_idx" ON "TrackedAsin"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_projectId_keyword_key" ON "Keyword"("projectId", "keyword");

-- CreateIndex
CREATE INDEX "Keyword_projectId_idx" ON "Keyword"("projectId");

-- CreateIndex
CREATE INDEX "Keyword_enabled_idx" ON "Keyword"("enabled");

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_projectId_capturedAt_idx" ON "KeywordRankSnapshot"("projectId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_trackedAsinId_keywordId_capturedAt_idx" ON "KeywordRankSnapshot"("trackedAsinId", "keywordId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_keywordId_capturedAt_idx" ON "KeywordRankSnapshot"("keywordId", "capturedAt" DESC);

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
