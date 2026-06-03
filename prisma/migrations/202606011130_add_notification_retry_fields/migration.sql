ALTER TABLE "NotificationDelivery"
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "lastRetriedAt" TIMESTAMP(3);

CREATE INDEX "NotificationDelivery_nextRetryAt_status_idx" ON "NotificationDelivery"("nextRetryAt", "status");
