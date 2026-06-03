-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "TrackedAsinStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "syncFrequencyMinutes" INTEGER NOT NULL DEFAULT 1440,
    "notificationEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedAsin" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "title" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "status" "TrackedAsinStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedAsin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSnapshot" (
    "id" TEXT NOT NULL,
    "trackedAsinId" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "listPrice" DECIMAL(12,2),
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER,
    "bsr" INTEGER,
    "variantCount" INTEGER,
    "stockStatus" TEXT,
    "title" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "rawPayload" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trackedAsinId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeValue" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "trackedAsinId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSettings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "priceChangeThresholdPercent" DECIMAL(6,2),
    "priceChangeThresholdValue" DECIMAL(12,2),
    "ratingDropThreshold" DECIMAL(3,2) NOT NULL DEFAULT 0.20,
    "reviewGrowthThreshold" INTEGER NOT NULL DEFAULT 20,
    "bsrChangeThresholdPercent" DECIMAL(6,2) NOT NULL DEFAULT 20.00,
    "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_marketplace_idx" ON "Project"("marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedAsin_projectId_asin_key" ON "TrackedAsin"("projectId", "asin");

-- CreateIndex
CREATE INDEX "TrackedAsin_projectId_idx" ON "TrackedAsin"("projectId");

-- CreateIndex
CREATE INDEX "TrackedAsin_asin_idx" ON "TrackedAsin"("asin");

-- CreateIndex
CREATE INDEX "TrackedAsin_status_idx" ON "TrackedAsin"("status");

-- CreateIndex
CREATE INDEX "ProductSnapshot_trackedAsinId_capturedAt_idx" ON "ProductSnapshot"("trackedAsinId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "ProductSnapshot_capturedAt_idx" ON "ProductSnapshot"("capturedAt" DESC);

-- CreateIndex
CREATE INDEX "Alert_projectId_createdAt_idx" ON "Alert"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Alert_trackedAsinId_createdAt_idx" ON "Alert"("trackedAsinId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "SyncJob_status_scheduledAt_idx" ON "SyncJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SyncJob_trackedAsinId_idx" ON "SyncJob"("trackedAsinId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSettings_projectId_key" ON "ProjectSettings"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedAsin" ADD CONSTRAINT "TrackedAsin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSnapshot" ADD CONSTRAINT "ProductSnapshot_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSettings" ADD CONSTRAINT "ProjectSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
