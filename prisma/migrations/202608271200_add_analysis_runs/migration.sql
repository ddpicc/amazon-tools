CREATE TYPE "AnalysisType" AS ENUM ('PRODUCT_LOOKUP', 'REVIEW_INSIGHTS', 'KEYWORD_RESEARCH', 'LISTING_DIAGNOSIS', 'MARKET_OPPORTUNITY', 'COMPETITOR_COMPARE');
CREATE TYPE "AnalysisRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "trackedAsinId" TEXT,
    "toolKey" TEXT NOT NULL,
    "analysisType" "AnalysisType" NOT NULL,
    "marketplace" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'PENDING',
    "inputJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "inputFingerprint" TEXT,
    "sourceAsOf" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisEvidence" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "productSnapshotId" TEXT,
    "productKeywordSnapshotId" TEXT,
    "productReviewId" TEXT,
    "alertId" TEXT,
    "label" TEXT NOT NULL,
    "excerpt" TEXT,
    "fieldPath" TEXT,
    "observedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalysisRun_userId_requestedAt_idx" ON "AnalysisRun"("userId", "requestedAt" DESC);
CREATE INDEX "AnalysisRun_projectId_requestedAt_idx" ON "AnalysisRun"("projectId", "requestedAt" DESC);
CREATE INDEX "AnalysisRun_trackedAsinId_requestedAt_idx" ON "AnalysisRun"("trackedAsinId", "requestedAt" DESC);
CREATE INDEX "AnalysisRun_status_requestedAt_idx" ON "AnalysisRun"("status", "requestedAt" DESC);
CREATE INDEX "AnalysisEvidence_analysisRunId_idx" ON "AnalysisEvidence"("analysisRunId");
CREATE INDEX "AnalysisEvidence_productSnapshotId_idx" ON "AnalysisEvidence"("productSnapshotId");
CREATE INDEX "AnalysisEvidence_productKeywordSnapshotId_idx" ON "AnalysisEvidence"("productKeywordSnapshotId");
CREATE INDEX "AnalysisEvidence_productReviewId_idx" ON "AnalysisEvidence"("productReviewId");
CREATE INDEX "AnalysisEvidence_alertId_idx" ON "AnalysisEvidence"("alertId");

ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvidence" ADD CONSTRAINT "AnalysisEvidence_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvidence" ADD CONSTRAINT "AnalysisEvidence_productSnapshotId_fkey" FOREIGN KEY ("productSnapshotId") REFERENCES "ProductSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvidence" ADD CONSTRAINT "AnalysisEvidence_productKeywordSnapshotId_fkey" FOREIGN KEY ("productKeywordSnapshotId") REFERENCES "ProductKeywordSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvidence" ADD CONSTRAINT "AnalysisEvidence_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "ProductReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvidence" ADD CONSTRAINT "AnalysisEvidence_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
