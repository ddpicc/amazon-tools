import { SubscriptionStatus, type UserPlan } from "@prisma/client";
import { db } from "@/server/db";
import {
  ensureDefaultPlanDefinitions,
  getDefaultPlanDefinitionByCode,
  getLegacyPlanCode
} from "@/server/services/billing/catalog";

export type ResolvedUserSubscription = {
  source: "subscription" | "legacy-plan";
  status: SubscriptionStatus;
  lastChangedAt: Date | null;
  plan: {
    id: string | null;
    code: string;
    displayName: string;
    description: string | null;
    priceCents: number;
    currency: string;
    maxProjects: number;
    maxTrackedAsins: number;
    maxOwnAsinsPerProject: number;
    maxCompetitorAsinsPerProject: number;
    canUseAdvancedAnalytics: boolean;
    canUseProductResearch: boolean;
  };
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

function buildLegacySubscription(plan: UserPlan): ResolvedUserSubscription {
  const planCode = getLegacyPlanCode(plan);
  const definition = getDefaultPlanDefinitionByCode(planCode);

  if (!definition) {
    throw new Error(`Missing default plan definition for legacy plan: ${planCode}`);
  }

  return {
    source: "legacy-plan",
    status: SubscriptionStatus.ACTIVE,
    lastChangedAt: null,
    plan: {
      id: null,
      code: definition.code,
      displayName: definition.displayName,
      description: definition.description ?? null,
      priceCents: definition.priceCents,
      currency: definition.currency,
      maxProjects: definition.maxProjects,
      maxTrackedAsins: definition.maxTrackedAsins,
      maxOwnAsinsPerProject: definition.maxOwnAsinsPerProject,
      maxCompetitorAsinsPerProject: definition.maxCompetitorAsinsPerProject,
      canUseAdvancedAnalytics: definition.canUseAdvancedAnalytics,
      canUseProductResearch: definition.canUseProductResearch
    },
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  };
}

export async function getUserSubscription(userId: string) {
  await ensureDefaultPlanDefinitions();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.subscription) {
    return buildLegacySubscription(user.plan);
  }

  return {
    source: "subscription" as const,
    status: user.subscription.status,
    lastChangedAt: user.subscription.updatedAt,
    plan: {
      id: user.subscription.plan.id,
      code: user.subscription.plan.code,
      displayName: user.subscription.plan.displayName,
      description: user.subscription.plan.description ?? null,
      priceCents: user.subscription.plan.priceCents,
      currency: user.subscription.plan.currency,
      maxProjects: user.subscription.plan.maxProjects,
      maxTrackedAsins: user.subscription.plan.maxTrackedAsins,
      maxOwnAsinsPerProject: user.subscription.plan.maxOwnAsinsPerProject,
      maxCompetitorAsinsPerProject: user.subscription.plan.maxCompetitorAsinsPerProject,
      canUseAdvancedAnalytics: user.subscription.plan.canUseAdvancedAnalytics,
      canUseProductResearch: user.subscription.plan.canUseProductResearch
    },
    currentPeriodStart: user.subscription.currentPeriodStart,
    currentPeriodEnd: user.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd
  } satisfies ResolvedUserSubscription;
}
