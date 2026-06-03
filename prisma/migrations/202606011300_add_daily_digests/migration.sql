ALTER TABLE "ProjectSettings"
ADD COLUMN "immediateCriticalAlertEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DailyDigestRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "digestDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "channelResults" JSONB,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDigestRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyDigestRun_projectId_digestDate_key" ON "DailyDigestRun"("projectId", "digestDate");
CREATE INDEX "DailyDigestRun_projectId_digestDate_idx" ON "DailyDigestRun"("projectId", "digestDate" DESC);
CREATE INDEX "DailyDigestRun_status_digestDate_idx" ON "DailyDigestRun"("status", "digestDate" DESC);

ALTER TABLE "DailyDigestRun" ADD CONSTRAINT "DailyDigestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
