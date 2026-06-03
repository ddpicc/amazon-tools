-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trackedAsinId" TEXT,
    "apiName" TEXT NOT NULL,
    "requestConsumed" INTEGER NOT NULL DEFAULT 1,
    "requestLeft" INTEGER,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "contextRef" TEXT,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiUsageLog_projectId_calledAt_idx" ON "ApiUsageLog"("projectId", "calledAt" DESC);

-- CreateIndex
CREATE INDEX "ApiUsageLog_apiName_calledAt_idx" ON "ApiUsageLog"("apiName", "calledAt" DESC);

-- AddForeignKey
ALTER TABLE "ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
