import { auth } from "@/auth";
import NewProjectForm from "@/app/(app)/(global)/projects/new/new-project-form";
import { getBillingStatusPresentation } from "@/lib/billing-status";
import { formatDateTime } from "@/lib/date-time";
import { getBillingSummary } from "@/server/services/billing/get-billing-summary";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const summary = await getBillingSummary(session.user.id);
  const billingStatus = getBillingStatusPresentation(summary.entitlements.billingState);

  return (
    <NewProjectForm
      billing={{
        planName: summary.entitlements.plan.displayName,
        billingState: summary.entitlements.billingState,
        billingStatusLabel: billingStatus.label,
        billingStatusDescription: billingStatus.description,
        billingStatusBadgeClassName: billingStatus.badgeClassName,
        projectCount: summary.entitlements.usage.projectCount,
        maxProjects: summary.entitlements.limits.maxProjects,
        activeTrackedAsinCount: summary.entitlements.usage.activeTrackedAsinCount,
        maxTrackedAsins: summary.entitlements.limits.maxTrackedAsins,
        maxOwnAsinsPerProject: summary.entitlements.limits.maxOwnAsinsPerProject,
        maxCompetitorAsinsPerProject: summary.entitlements.limits.maxCompetitorAsinsPerProject,
        planRecentlyChanged: summary.planChange.recentlyChanged,
        planLastChangedAtLabel: summary.planChange.lastChangedAt
          ? formatDateTime(summary.planChange.lastChangedAt)
          : null
      }}
    />
  );
}
