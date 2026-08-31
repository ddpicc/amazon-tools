ALTER TABLE "ProductSnapshot"
  ADD COLUMN "fbaFee" INTEGER,
  ADD COLUMN "dealType" TEXT;

CREATE TABLE "ProductKeywordSnapshot" (
  "id" TEXT NOT NULL,
  "trackedAsinId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "naturalRank" INTEGER,
  "sponsoredRank" INTEGER,
  "searchVolume" INTEGER,
  "cpc" DECIMAL(12,2),
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductKeywordSnapshot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductKeywordSnapshot"
  ADD CONSTRAINT "ProductKeywordSnapshot_trackedAsinId_fkey"
  FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProductKeywordSnapshot_trackedAsinId_capturedAt_idx"
  ON "ProductKeywordSnapshot"("trackedAsinId", "capturedAt" DESC);
CREATE INDEX "ProductKeywordSnapshot_trackedAsinId_keyword_capturedAt_idx"
  ON "ProductKeywordSnapshot"("trackedAsinId", "keyword", "capturedAt" DESC);
