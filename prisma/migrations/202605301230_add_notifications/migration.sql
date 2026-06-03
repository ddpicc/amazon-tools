-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('INBOX', 'FEISHU', 'WECOM', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "NotificationChannelType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT,
    "webhookUrl" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "channelId" TEXT,
    "channelType" "NotificationChannelType" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "responseBody" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationChannel_projectId_type_key" ON "NotificationChannel"("projectId", "type");

-- CreateIndex
CREATE INDEX "NotificationChannel_projectId_idx" ON "NotificationChannel"("projectId");

-- CreateIndex
CREATE INDEX "NotificationChannel_enabled_idx" ON "NotificationChannel"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "InboxNotification_userId_alertId_key" ON "InboxNotification"("userId", "alertId");

-- CreateIndex
CREATE INDEX "InboxNotification_userId_createdAt_idx" ON "InboxNotification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InboxNotification_projectId_createdAt_idx" ON "InboxNotification"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InboxNotification_readAt_idx" ON "InboxNotification"("readAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_projectId_createdAt_idx" ON "NotificationDelivery"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NotificationDelivery_alertId_createdAt_idx" ON "NotificationDelivery"("alertId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NotificationDelivery_channelType_createdAt_idx" ON "NotificationDelivery"("channelType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "NotificationChannel" ADD CONSTRAINT "NotificationChannel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
