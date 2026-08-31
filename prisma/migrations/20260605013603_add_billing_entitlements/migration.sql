-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SCHEDULED_DOWNGRADE');

-- CreateTable
CREATE TABLE "PlanDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxProjects" INTEGER NOT NULL,
    "maxTrackedAsins" INTEGER NOT NULL,
    "maxOwnAsinsPerProject" INTEGER NOT NULL DEFAULT 3,
    "maxCompetitorAsinsPerProject" INTEGER NOT NULL DEFAULT 20,
    "canUseAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "canUseProductResearch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitlementOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxProjects" INTEGER,
    "maxTrackedAsins" INTEGER,
    "maxOwnAsinsPerProject" INTEGER,
    "maxCompetitorAsinsPerProject" INTEGER,
    "canUseAdvancedAnalytics" BOOLEAN,
    "canUseProductResearch" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntitlementOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDefinition_code_key" ON "PlanDefinition"("code");

-- CreateIndex
CREATE INDEX "PlanDefinition_active_sortOrder_idx" ON "PlanDefinition"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_key" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_planId_idx" ON "UserSubscription"("planId");

-- CreateIndex
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EntitlementOverride_userId_key" ON "EntitlementOverride"("userId");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementOverride" ADD CONSTRAINT "EntitlementOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
