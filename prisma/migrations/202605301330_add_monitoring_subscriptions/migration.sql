-- CreateEnum
CREATE TYPE "MonitoringSubscriptionType" AS ENUM ('ASIN', 'KEYWORD');

-- CreateTable
CREATE TABLE "MonitoringSubscription" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trackedAsinId" TEXT,
    "type" "MonitoringSubscriptionType" NOT NULL,
    "externalTaskId" TEXT NOT NULL,
    "externalStatus" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "keywordsDigest" TEXT,
    "asinDigest" TEXT,
    "lastBatchId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringSubscription_type_externalTaskId_key" ON "MonitoringSubscription"("type", "externalTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringSubscription_projectId_trackedAsinId_type_key" ON "MonitoringSubscription"("projectId", "trackedAsinId", "type");

-- CreateIndex
CREATE INDEX "MonitoringSubscription_projectId_type_idx" ON "MonitoringSubscription"("projectId", "type");

-- CreateIndex
CREATE INDEX "MonitoringSubscription_trackedAsinId_type_idx" ON "MonitoringSubscription"("trackedAsinId", "type");

-- CreateIndex
CREATE INDEX "MonitoringSubscription_enabled_type_idx" ON "MonitoringSubscription"("enabled", "type");

-- AddForeignKey
ALTER TABLE "MonitoringSubscription" ADD CONSTRAINT "MonitoringSubscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringSubscription" ADD CONSTRAINT "MonitoringSubscription_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
