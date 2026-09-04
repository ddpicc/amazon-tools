import { auth } from '@/auth';
import Link from 'next/link';
import { formatDateTime } from '@/lib/date-time';
import { formatShanghaiDate, getShanghaiStartOfDay } from '@/lib/shanghai-time';
import { digestPreview } from '@/lib/digest-display';
import {
  MetricCard,
  Surface
} from '@/components/projects/project-workspace-shell';
import { ApiUsagePanel } from '@/components/usage/api-usage-panel';
import { db } from '@/server/db';
import { getProjectApiUsage } from '@/server/services/api-usage';
import { getProjectOverview } from '@/server/services/project-overview';
import { DigestModal } from '@/components/projects/digest-modal';

function fmtDateTime(v: Date | null) {
  return formatDateTime(v);
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
    select: { id: true, name: true, marketplace: true }
  });
  if (!project) return null;

  const [overview, apiUsage] = await Promise.all([
    getProjectOverview(project.id),
    isAdmin ? getProjectApiUsage(project.id) : Promise.resolve(null)
  ]);
  const todayStart = getShanghaiStartOfDay(new Date());
  const [failedAsins, newLowStarReviews, latestDigest] = await Promise.all([
    db.trackedAsin.findMany({ where: { projectId: project.id, consecutiveFailures: { gt: 0 } }, orderBy: { consecutiveFailures: "desc" }, take: 5, select: { asin: true, consecutiveFailures: true } }),
    db.productReview.findMany({ where: { trackedAsin: { projectId: project.id, role: "OWN" }, rating: { lte: 3 }, firstSeenAt: { gte: todayStart } }, orderBy: { firstSeenAt: "desc" }, take: 5, select: { rating: true, trackedAsin: { select: { asin: true } } } }),
    db.dailyDigestRun.findFirst({ where: { projectId: project.id }, orderBy: { digestDate: "desc" }, select: { digestDate: true, summary: true } })
  ]);
  const digestCardValue =
    overview.todayDigestSentAt
      ? 'Sent'
      : overview.todayDigestStatus === 'PARTIAL'
        ? 'Retrying'
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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Daily operations</p>
          <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">今日运营简报</h1>
          <p className="mt-2 max-w-2xl font-label text-sm text-[var(--md-on-surface-variant)]">
            汇总自有 Listing、竞品和评论指标的每日变化，方便每天统一复盘。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/projects/${project.id}/asins`}
            className="rounded-lg border border-[var(--md-outline-variant)] px-4 py-2 font-label text-sm font-semibold text-[var(--md-on-surface)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            管理商品对象
          </Link>
          <Link
            href={`/projects/${project.id}/trends`}
            className="rounded-lg bg-[var(--md-primary)] px-4 py-2 font-label text-sm font-semibold text-[var(--md-on-primary)] transition-colors hover:bg-[var(--md-primary-dim)]"
          >
            查看监控动态
          </Link>
        </div>
      </div>

      <Surface>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--md-primary)]/10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-[var(--md-primary)]">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">
              今日状态
            </h2>
            <p className="mt-2 max-w-3xl font-label text-sm leading-relaxed text-[var(--md-on-surface-variant)]">
              数据按日自动采集，并在日报中逐项列出与上一份快照相比发生的变化，不按阈值筛选或即时打扰。
            </p>
          </div>
        </div>
      </Surface>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="监控对象" ownLabel="" ownValue={overview.trackedAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{overview.ownAsinCount} 个自有商品 · {overview.competitorAsinCount} 个竞品</span>} />
        <MetricCard
          label="自有商品"
          ownLabel=""
          ownValue={overview.ownAsinCount}
          footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">项目中的运营对象</span>}
        />
        <MetricCard
          label="竞品"
          ownLabel=""
          ownValue={overview.competitorAsinCount}
          footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">每日汇总竞品变化</span>}
        />
        <MetricCard
          label="今日报告"
          ownLabel=""
          ownValue={digestCardValue}
          footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{digestCardFooter}</span>}
        />
      </div>

      <Surface>
        <div className="flex items-center justify-between gap-4"><div><h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">今日需处理</h2><p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">优先处理采集失败和新发现的低星评论。</p></div><Link href={`/projects/${project.id}/trends`} className="font-label text-sm text-[var(--md-primary)]">查看监控动态</Link></div><div className="mt-5 grid gap-3 md:grid-cols-2">{failedAsins.map((item) => <div key={item.asin} className="rounded-xl border border-[var(--md-error)]/30 p-4 font-label text-sm"><strong>{item.asin}</strong> 已连续采集失败 {item.consecutiveFailures} 次</div>)}{newLowStarReviews.map((review, index) => <Link key={`${review.trackedAsin.asin}-${index}`} href={`/projects/${project.id}/reviews`} className="rounded-xl border border-amber-500/30 p-4 font-label text-sm"><strong>{review.trackedAsin.asin}</strong> 新增 {review.rating} 星评论</Link>)}{!failedAsins.length && !newLowStarReviews.length ? <p className="rounded-xl border border-dashed border-[var(--md-outline-variant)] p-4 font-label text-sm text-[var(--md-on-surface-variant)]">暂无需要立即处理的事项。</p> : null}</div>{latestDigest ? <div className="mt-5 rounded-xl bg-[var(--md-surface-container-low)] p-4"><p className="font-label text-xs text-[var(--md-on-surface-variant)]">最近日报 · {formatShanghaiDate(latestDigest.digestDate)}</p><p className="mt-2 line-clamp-3 whitespace-pre-wrap font-label text-sm text-[var(--md-on-surface-variant)]">{digestPreview(latestDigest.summary)}</p><DigestModal dateLabel={formatShanghaiDate(latestDigest.digestDate)} summary={latestDigest.summary} /></div> : null}</Surface>

      {isAdmin && apiUsage ? <ApiUsagePanel usage={apiUsage} /> : null}
    </div>
  );
}
