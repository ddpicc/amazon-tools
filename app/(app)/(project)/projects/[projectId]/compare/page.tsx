import Link from "next/link";
import { auth } from "@/auth";
import { CompareTrendPanels } from "@/components/charts/compare-trend-panels";
import {
  MetricCard,
  Surface
} from "@/components/projects/project-workspace-shell";
import { db } from "@/server/db";
import { getProjectTrendOverview } from "@/server/services/project-trends";

const RANGE_OPTIONS = [7, 30] as const;

function mv(v: number | null, fmt?: (v: number) => string) {
  return v === null ? "-" : fmt ? fmt(v) : String(v);
}

function pct(v: number | null) {
  return mv(v, (value) => `${value.toFixed(1)}%`);
}

function parseDays(v?: string) {
  const n = Number(v);
  return RANGE_OPTIONS.includes(n as (typeof RANGE_OPTIONS)[number]) ? n : 7;
}

export default async function ProjectComparePage({
  params,
  searchParams
}: {
  params: { projectId: string };
  searchParams?: { days?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: { id: true, name: true, marketplace: true }
  });
  if (!project) return null;

  const days = parseDays(searchParams?.days);
  const trends = await getProjectTrendOverview(project.id, days);
  const s = trends.latestSummary;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Group comparison</p>
          <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">
            竞品对比
          </h1>
          <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">
            按 own 组与竞品组查看价格、销量、内容质量和生命周期的整体差异，并对单个 ASIN 的趋势进行对照。
          </p>
        </div>

        <div className="flex rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-1 font-label text-sm">
          {RANGE_OPTIONS.map((opt) => {
            const active = opt === days;
            return (
              <Link
                key={opt}
                href={`/projects/${project.id}/compare?days=${opt}`}
                className={`rounded-md px-4 py-1.5 transition ${
                  active
                    ? "bg-[var(--md-surface-variant)] text-[var(--md-on-surface)] shadow-sm"
                    : "text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
                }`}
              >
                {opt} 天
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="平均价格" ownValue={mv(s.ownAveragePrice, (v) => `$${v.toFixed(2)}`)} compValue={mv(s.competitorAveragePrice, (v) => `$${v.toFixed(2)}`)} ownLabel="Own" compLabel="竞品" />
        <MetricCard label="平均评分" ownValue={mv(s.ownAverageRating)} compValue={mv(s.competitorAverageRating)} ownLabel="Own" compLabel="竞品" />
        <MetricCard label="平均评论数" ownValue={mv(s.ownAverageReviews)} compValue={mv(s.competitorAverageReviews)} ownLabel="Own" compLabel="竞品" />
        <MetricCard label="平均 BSR" ownValue={mv(s.ownAverageBsr)} compValue={mv(s.competitorAverageBsr)} ownLabel="Own" compLabel="竞品" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">销量表现</h3>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <MetricCard label="平均月销量" ownValue={mv(s.ownAverageMonthlySales)} compValue={mv(s.competitorAverageMonthlySales)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="平均日销量" ownValue={mv(s.ownAverageDailySales)} compValue={mv(s.competitorAverageDailySales)} ownLabel="Own" compLabel="竞品" />
          </div>
        </Surface>

        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">Listing 质量</h3>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <MetricCard label="FBA 占比" ownValue={pct(s.ownFbaRatio)} compValue={pct(s.competitorFbaRatio)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="A+ 覆盖率" ownValue={pct(s.ownAPlusCoverage)} compValue={pct(s.competitorAPlusCoverage)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="视频覆盖率" ownValue={pct(s.ownVideoCoverage)} compValue={pct(s.competitorVideoCoverage)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="品牌店铺覆盖率" ownValue={pct(s.ownBrandStoreCoverage)} compValue={pct(s.competitorBrandStoreCoverage)} ownLabel="Own" compLabel="竞品" />
          </div>
        </Surface>

        <Surface className="lg:col-span-2">
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">生命周期</h3>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="平均在线天数" ownValue={mv(s.ownAverageOnlineDays)} compValue={mv(s.competitorAverageOnlineDays)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="中位在线天数" ownValue={mv(s.ownMedianOnlineDays)} compValue={mv(s.competitorMedianOnlineDays)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="最长在线天数" ownValue={mv(s.ownOldestOnlineDays)} compValue={mv(s.competitorOldestOnlineDays)} ownLabel="Own" compLabel="竞品" />
            <MetricCard label="最短在线天数" ownValue={mv(s.ownNewestOnlineDays)} compValue={mv(s.competitorNewestOnlineDays)} ownLabel="Own" compLabel="竞品" />
          </div>
        </Surface>
      </div>

      <CompareTrendPanels
        priceTrend={trends.priceTrend}
        ratingTrend={trends.ratingTrend}
        reviewTrend={trends.reviewTrend}
        bsrTrend={trends.bsrTrend}
        series={trends.series}
      />
    </div>
  );
}
