import Link from "next/link";
import { auth } from "@/auth";
import { ComparisonLineChart } from "@/components/charts/comparison-line-chart";
import {
  MetricCard,
  Surface
} from "@/components/projects/project-workspace-shell";
import { db } from "@/server/db";
import { getProjectTrendOverview } from "@/server/services/project-trends";

const RANGE_OPTIONS = [7, 30, 90] as const;

function mv(v: number | null, fmt?: (v: number) => string) {
  return v === null ? "-" : fmt ? fmt(v) : String(v);
}

function parseDays(v?: string) {
  const n = Number(v);
  return RANGE_OPTIONS.includes(n as (typeof RANGE_OPTIONS)[number]) ? n : 30;
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
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Own vs competitor</p>
          <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">
            Compare
          </h1>
          <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">
            对比 own ASIN 与竞品组在价格、评分、评论量和 BSR 上的整体表现。
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
        <MetricCard label="Average Price" ownValue={mv(s.ownAveragePrice, (v) => `$${v.toFixed(2)}`)} compValue={mv(s.competitorAveragePrice, (v) => `$${v.toFixed(2)}`)} />
        <MetricCard label="Average Rating" ownValue={mv(s.ownAverageRating)} compValue={mv(s.competitorAverageRating)} />
        <MetricCard label="Review Total" ownValue={mv(s.ownTotalReviews)} compValue={mv(s.competitorTotalReviews)} />
        <MetricCard label="Best BSR" ownValue={mv(s.ownBestBsr)} compValue={mv(s.competitorBestBsr)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Surface className="lg:col-span-2">
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">价格对比趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <ComparisonLineChart data={trends.priceTrend} suffix="$" ownColor="#f9bc45" competitorColor="#5bd5fc" />
          </div>
        </Surface>

        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">评分趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <ComparisonLineChart data={trends.ratingTrend} ownColor="#f9bc45" competitorColor="#8b5cf6" />
          </div>
        </Surface>

        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">评论量趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <ComparisonLineChart data={trends.reviewTrend} ownColor="#f59e0b" competitorColor="#22d3ee" />
          </div>
        </Surface>

        <Surface className="lg:col-span-2">
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">BSR 对比趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <ComparisonLineChart data={trends.bsrTrend} ownColor="#34d399" competitorColor="#c084fc" />
          </div>
        </Surface>
      </div>
    </div>
  );
}
