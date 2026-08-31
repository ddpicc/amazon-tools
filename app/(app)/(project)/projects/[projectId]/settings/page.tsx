import { auth } from "@/auth";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { formatDateTime } from "@/lib/date-time";
import { db } from "@/server/db";
import { getBillingSummary } from "@/server/services/billing/get-billing-summary";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";

export default async function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const summary = await getBillingSummary(session.user.id);

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      marketplace: true,
      settings: {
        select: {
          dailyDigestSendHour: true,
          dailyDigestSendMinute: true,
        }
      },
      notificationEmail: true,
      notificationChannels: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!project) return null;

  const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <ProjectSettingsPanel
        projectId={project.id}
        projectName={project.name}
        marketplace={project.marketplace}
        dailyDigestSendHour={project.settings?.dailyDigestSendHour ?? 9}
        dailyDigestSendMinute={project.settings?.dailyDigestSendMinute ?? 0}
        planName={summary.entitlements.plan.displayName}
        projectCount={summary.entitlements.usage.projectCount}
        maxProjects={summary.entitlements.limits.maxProjects}
        activeTrackedAsinCount={summary.entitlements.usage.activeTrackedAsinCount}
        maxTrackedAsins={summary.entitlements.limits.maxTrackedAsins}
        maxManualRefreshesPerAsinPerDay={summary.entitlements.limits.maxManualRefreshesPerAsinPerDay}
        planRecentlyChanged={summary.planChange.recentlyChanged}
        planLastChangedAtLabel={summary.planChange.lastChangedAt ? formatDateTime(summary.planChange.lastChangedAt) : null}
        channels={channels}
      />
    </div>
  );
}
