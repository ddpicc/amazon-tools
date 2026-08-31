import { TrackedAsinRole, TrackedAsinStatus } from "@prisma/client";
import { db } from "@/server/db";
import { getUserSubscription } from "@/server/services/billing/get-user-subscription";
import { getUserUsageSummary } from "@/server/services/billing/get-user-usage-summary";
import {
  createProjectAsinLimitError,
  createProjectLimitError,
  createTrackedAsinLimitError
} from "@/server/services/billing/errors";

export const MAX_ASINS_PER_PROJECT = 10;

export type UserEntitlements = {
  source: "subscription" | "legacy-plan";
  plan: {
    code: string;
    displayName: string;
    priceCents: number;
    currency: string;
  };
  billingState: string;
  limits: {
    maxProjects: number;
    maxTrackedAsins: number;
    maxOwnAsinsPerProject: number;
    maxCompetitorAsinsPerProject: number;
    maxManualRefreshesPerAsinPerDay: number;
  };
  features: {
    canUseAdvancedAnalytics: boolean;
    canUseProductResearch: boolean;
  };
  usage: {
    projectCount: number;
    activeTrackedAsinCount: number;
    ownAsinCount: number;
    competitorAsinCount: number;
  };
  remaining: {
    projectSlots: number;
    trackedAsinSlots: number;
  };
};

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const [subscription, usage, override] = await Promise.all([
    getUserSubscription(userId),
    getUserUsageSummary(userId),
    db.entitlementOverride.findUnique({ where: { userId } })
  ]);

  const maxProjects = override?.maxProjects ?? subscription.plan.maxProjects;
  const maxTrackedAsins = override?.maxTrackedAsins ?? subscription.plan.maxTrackedAsins;
  const maxOwnAsinsPerProject =
    override?.maxOwnAsinsPerProject ?? subscription.plan.maxOwnAsinsPerProject;
  const maxCompetitorAsinsPerProject =
    override?.maxCompetitorAsinsPerProject ?? subscription.plan.maxCompetitorAsinsPerProject;
  const canUseAdvancedAnalytics =
    override?.canUseAdvancedAnalytics ?? subscription.plan.canUseAdvancedAnalytics;
  const canUseProductResearch =
    override?.canUseProductResearch ?? subscription.plan.canUseProductResearch;

  return {
    source: subscription.source,
    plan: {
      code: subscription.plan.code,
      displayName: subscription.plan.displayName,
      priceCents: subscription.plan.priceCents,
      currency: subscription.plan.currency
    },
    billingState: subscription.status,
    limits: {
      maxProjects,
      maxTrackedAsins,
      maxOwnAsinsPerProject,
      maxCompetitorAsinsPerProject,
      maxManualRefreshesPerAsinPerDay: 1
    },
    features: {
      canUseAdvancedAnalytics,
      canUseProductResearch
    },
    usage,
    remaining: {
      projectSlots: Math.max(0, maxProjects - usage.projectCount),
      trackedAsinSlots: Math.max(0, maxTrackedAsins - usage.activeTrackedAsinCount)
    }
  };
}

export async function assertCanCreateProject(
  userId: string,
  counts: { ownAsins: number; competitorAsins: number }
) {
  const entitlements = await getUserEntitlements(userId);

  if (entitlements.usage.projectCount + 1 > entitlements.limits.maxProjects) {
    throw createProjectLimitError(entitlements.limits.maxProjects);
  }

  const nextTrackedAsinCount =
    entitlements.usage.activeTrackedAsinCount + counts.ownAsins + counts.competitorAsins;

  if (nextTrackedAsinCount > entitlements.limits.maxTrackedAsins) {
    throw createTrackedAsinLimitError(
      entitlements.limits.maxTrackedAsins,
      nextTrackedAsinCount
    );
  }

  if (counts.ownAsins + counts.competitorAsins > MAX_ASINS_PER_PROJECT) {
    throw createProjectAsinLimitError(MAX_ASINS_PER_PROJECT);
  }

  return entitlements;
}

export async function assertCanUpsertTrackedAsins(input: {
  userId: string;
  projectId: string;
  asins: string[];
  role: TrackedAsinRole;
}) {
  const { userId, projectId, role } = input;
  const asins = Array.from(new Set(input.asins.map((item) => item.trim().toUpperCase()).filter(Boolean)));

  if (!asins.length) {
    throw new Error("请至少填写一个 ASIN 后再继续。");
  }

  const [entitlements, currentProjectItems, currentUserItems, existingItems] = await Promise.all([
    getUserEntitlements(userId),
    db.trackedAsin.findMany({
      where: {
        projectId,
        status: TrackedAsinStatus.ACTIVE
      },
      select: { asin: true, role: true }
    }),
    db.trackedAsin.findMany({
      where: {
        status: TrackedAsinStatus.ACTIVE,
        project: { userId }
      },
      select: { asin: true }
    }),
    db.trackedAsin.findMany({
      where: {
        projectId,
        asin: { in: asins }
      },
      select: {
        asin: true,
        role: true,
        status: true
      }
    })
  ]);

  let additionsToTotal = 0;

  const existingByAsin = new Map(existingItems.map((item) => [item.asin, item]));

  for (const asin of asins) {
    const existing = existingByAsin.get(asin);

    if (!existing || existing.status !== TrackedAsinStatus.ACTIVE) {
      additionsToTotal += 1;
      continue;
    }

    if (existing.role === role) {
      continue;
    }

  }

  if (currentProjectItems.length + additionsToTotal > MAX_ASINS_PER_PROJECT) {
    throw createProjectAsinLimitError(MAX_ASINS_PER_PROJECT);
  }

  const nextTrackedAsinCount = currentUserItems.length + additionsToTotal;
  if (nextTrackedAsinCount > entitlements.limits.maxTrackedAsins) {
    throw createTrackedAsinLimitError(
      entitlements.limits.maxTrackedAsins,
      nextTrackedAsinCount
    );
  }

  return {
    entitlements,
    normalizedAsins: asins
  };
}
