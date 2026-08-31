import { BillingInterval, type Prisma, type UserPlan } from "@prisma/client";
import { db } from "@/server/db";

export const DEFAULT_PLAN_CATALOG = [
  {
    code: "starter",
    displayName: "入门版",
    description: "适合刚开始监控少量竞品的卖家。",
    priceCents: 1900,
    currency: "CNY",
    interval: BillingInterval.MONTHLY,
    active: true,
    sortOrder: 10,
    maxProjects: 2,
    maxTrackedAsins: 20,
    maxOwnAsinsPerProject: 3,
    maxCompetitorAsinsPerProject: 20,
    canUseAdvancedAnalytics: false,
    canUseProductResearch: false
  },
  {
    code: "basic",
    displayName: "基础版",
    description: "适合需要同时监控多个项目和更多 ASIN 的团队。",
    priceCents: 4900,
    currency: "CNY",
    interval: BillingInterval.MONTHLY,
    active: true,
    sortOrder: 20,
    maxProjects: 5,
    maxTrackedAsins: 100,
    maxOwnAsinsPerProject: 3,
    maxCompetitorAsinsPerProject: 20,
    canUseAdvancedAnalytics: true,
    canUseProductResearch: false
  }
] as const satisfies Prisma.PlanDefinitionCreateInput[];

const LEGACY_PLAN_CODE_BY_USER_PLAN: Record<UserPlan, string> = {
  FREE: "starter",
  PRO: "basic"
};

const LEGACY_USER_PLAN_BY_CODE: Record<string, UserPlan> = {
  starter: "FREE",
  basic: "PRO"
};

export function getLegacyPlanCode(userPlan: UserPlan) {
  return LEGACY_PLAN_CODE_BY_USER_PLAN[userPlan];
}

export function getLegacyUserPlan(code: string): UserPlan {
  return LEGACY_USER_PLAN_BY_CODE[code] ?? "FREE";
}

export function getDefaultPlanDefinitionByCode(code: string) {
  return DEFAULT_PLAN_CATALOG.find((plan) => plan.code === code) ?? null;
}

export async function listPlanDefinitions() {
  const items = await db.planDefinition.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }]
  });

  return items.length ? items : DEFAULT_PLAN_CATALOG;
}

export async function ensureDefaultPlanDefinitions() {
  await Promise.all(
    DEFAULT_PLAN_CATALOG.map((plan) =>
      db.planDefinition.upsert({
        where: { code: plan.code },
        update: {
          displayName: plan.displayName,
          description: plan.description,
          priceCents: plan.priceCents,
          currency: plan.currency,
          interval: plan.interval,
          active: plan.active,
          sortOrder: plan.sortOrder,
          maxProjects: plan.maxProjects,
          maxTrackedAsins: plan.maxTrackedAsins,
          maxOwnAsinsPerProject: plan.maxOwnAsinsPerProject,
          maxCompetitorAsinsPerProject: plan.maxCompetitorAsinsPerProject,
          canUseAdvancedAnalytics: plan.canUseAdvancedAnalytics,
          canUseProductResearch: plan.canUseProductResearch
        },
        create: plan
      })
    )
  );

  return db.planDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }]
  });
}
