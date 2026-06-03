import { auth } from '@/auth';
import { AlertList } from '@/components/alerts/alert-list';
import {
  MetricCard,
  SectionHeading,
  Surface
} from '@/components/projects/project-workspace-shell';
import { ApiUsagePanel } from '@/components/usage/api-usage-panel';
import { db } from '@/server/db';
import { getProjectApiUsage } from '@/server/services/api-usage';
import { getProjectOverview } from '@/server/services/project-overview';

function fmtDateTime(v: Date | null) {
  return v ? new Date(v).toLocaleString('zh-CN') : '-';
}

export default async function ProjectDetailPage({
  params
}: {
  params: { projectId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const isAdmin = session.user.role === 'ADMIN';

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    include: {
      alerts: { include: { trackedAsin: true }, orderBy: { createdAt: 'desc' }, take: 6 }
    }
  });
  if (!project) return null;

  const [overview, apiUsage] = await Promise.all([
    getProjectOverview(project.id),
    isAdmin ? getProjectApiUsage(project.id) : Promise.resolve(null)
  ]);
  const digestCardValue =
    overview.todayDigestSentAt
      ? 'Sent'
      : overview.todayDigestStatus === 'FAILED'
        ? 'Failed'
        : overview.todayDigestStatus === 'SKIPPED'
          ? 'Skipped'
          : 'Pending';
  const digestCardFooter = overview.todayDigestSentAt
    ? `Sent ${fmtDateTime(overview.todayDigestSentAt)}`
    : overview.todayDigestStatus
      ? `Status: ${overview.todayDigestStatus}`
      : 'Not sent today';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Executive Summary Banner */}
      <Surface>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--md-primary)]/10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-[var(--md-primary)]">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">
              Project Overview
            </h2>
            <p className="mt-2 max-w-3xl font-label text-sm leading-relaxed text-[var(--md-on-surface-variant)]">
              这里汇总项目的核心监测状态。对比分析看 Compare，单个 ASIN 快照看 Snapshots。
            </p>
          </div>
        </div>
      </Surface>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Monitored Days" ownLabel="" ownValue={overview.monitoredDays} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">Started {new Date(overview.monitoringStartedAt).toLocaleDateString('zh-CN')}</span>} />
        <MetricCard
          label="Tracked ASINs"
          ownLabel=""
          ownValue={overview.trackedAsinCount}
          footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{overview.ownAsinCount} own / {overview.competitorAsinCount} competitors</span>}
        />
        <MetricCard
          label="Today's Digest"
          ownLabel=""
          ownValue={digestCardValue}
          footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{digestCardFooter}</span>}
        />
        <MetricCard
          label="Latest Snapshot"
          ownLabel=""
          ownValue={overview.latestSnapshotAt ? 'Active' : 'Pending'}
          footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{fmtDateTime(overview.latestSnapshotAt)}</span>}
        />
      </div>

      <div id="recent-alerts">
        <Surface>
          <SectionHeading title="Recent alerts" description={`Today ${overview.todayAlertCount} new alerts`} />
          <div className="mt-5">
            <AlertList alerts={project.alerts} />
          </div>
        </Surface>
      </div>

      {isAdmin && apiUsage ? <ApiUsagePanel usage={apiUsage} /> : null}
    </div>
  );
}
