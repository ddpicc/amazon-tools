CREATE TYPE "DataSourceKind" AS ENUM ('LIVE_PROVIDER', 'MOCK', 'IMPORT', 'USER_INPUT', 'DERIVED', 'LEGACY_UNKNOWN');
CREATE TYPE "DataCaptureStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

CREATE TABLE "DataCapture" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "trackedAsinId" TEXT,
    "marketplace" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiName" TEXT NOT NULL,
    "sourceKind" "DataSourceKind" NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "normalizerVersion" TEXT,
    "schemaVersion" TEXT,
    "status" "DataCaptureStatus" NOT NULL DEFAULT 'RUNNING',
    "rawPayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataCapture_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductSnapshot" ADD COLUMN "captureId" TEXT;
ALTER TABLE "ProductKeywordSnapshot" ADD COLUMN "captureId" TEXT;
ALTER TABLE "ProductReview" ADD COLUMN "captureId" TEXT;

CREATE INDEX "DataCapture_projectId_capturedAt_idx" ON "DataCapture"("projectId", "capturedAt" DESC);
CREATE INDEX "DataCapture_trackedAsinId_capturedAt_idx" ON "DataCapture"("trackedAsinId", "capturedAt" DESC);
CREATE INDEX "DataCapture_status_requestedAt_idx" ON "DataCapture"("status", "requestedAt" DESC);
CREATE INDEX "ProductSnapshot_captureId_idx" ON "ProductSnapshot"("captureId");
CREATE INDEX "ProductKeywordSnapshot_captureId_idx" ON "ProductKeywordSnapshot"("captureId");
CREATE INDEX "ProductReview_captureId_idx" ON "ProductReview"("captureId");

ALTER TABLE "DataCapture" ADD CONSTRAINT "DataCapture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DataCapture" ADD CONSTRAINT "DataCapture_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataCapture" ADD CONSTRAINT "DataCapture_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSnapshot" ADD CONSTRAINT "ProductSnapshot_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "DataCapture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductKeywordSnapshot" ADD CONSTRAINT "ProductKeywordSnapshot_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "DataCapture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "DataCapture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
