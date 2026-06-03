CREATE TABLE "AlertSuppressionLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trackedAsinId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "duplicateAlertId" TEXT,
    "cooldownMinutes" INTEGER NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertSuppressionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertSuppressionLog_projectId_createdAt_idx" ON "AlertSuppressionLog"("projectId", "createdAt" DESC);
CREATE INDEX "AlertSuppressionLog_trackedAsinId_createdAt_idx" ON "AlertSuppressionLog"("trackedAsinId", "createdAt" DESC);
CREATE INDEX "AlertSuppressionLog_type_createdAt_idx" ON "AlertSuppressionLog"("type", "createdAt" DESC);
CREATE INDEX "AlertSuppressionLog_fingerprint_idx" ON "AlertSuppressionLog"("fingerprint");

ALTER TABLE "AlertSuppressionLog" ADD CONSTRAINT "AlertSuppressionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertSuppressionLog" ADD CONSTRAINT "AlertSuppressionLog_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertSuppressionLog" ADD CONSTRAINT "AlertSuppressionLog_duplicateAlertId_fkey" FOREIGN KEY ("duplicateAlertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
