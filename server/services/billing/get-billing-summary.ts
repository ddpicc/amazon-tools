import { getUserEntitlements } from "@/server/services/entitlements";
import { listPlanDefinitions } from "@/server/services/billing/catalog";
import { getUserSubscription } from "@/server/services/billing/get-user-subscription";

const RECENT_PLAN_CHANGE_WINDOW_MS = 15 * 60 * 1000;

export async function getBillingSummary(userId: string) {
  const [entitlements, plans, subscription] = await Promise.all([
    getUserEntitlements(userId),
    listPlanDefinitions(),
    getUserSubscription(userId)
  ]);

  const planChange = {
    source: subscription.source,
    lastChangedAt: subscription.lastChangedAt,
    recentlyChanged:
      subscription.source === "subscription" &&
      subscription.lastChangedAt !== null &&
      Date.now() - subscription.lastChangedAt.getTime() <= RECENT_PLAN_CHANGE_WINDOW_MS
  };

  return {
    entitlements,
    plans,
    planChange
  };
}
