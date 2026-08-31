import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Surface } from "@/components/projects/project-workspace-shell";

type Change = {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "negative";
};

type Competitor = {
  id: string;
  asin: string;
  latest: {
    capturedAt: Date;
    price: number | null;
    rating: number | null;
    monthlySales: number | null;
    bsr: number | null;
    variantCount: number | null;
    isFBA: boolean | null;
  } | null;
  changes: Change[];
};

function metric(value: number | null, format?: (value: number) => string) {
  return value === null ? "-" : format ? format(value) : value.toLocaleString("en-US");
}

export function CompetitorIntelligenceList({
  projectId,
  competitors
}: {
  projectId: string;
  competitors: Competitor[];
}) {
  return (
    <div className="space-y-6">
      <Surface>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">竞品当前态势</h2>
            <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">
              每张卡片展示最新快照与上一份快照的关键变化；点击可查看该竞品的完整快照与趋势。
            </p>
          </div>
          <span className="font-label text-sm text-[var(--md-on-surface-variant)]">{competitors.length} 个竞品</span>
        </div>

        {!competitors.length ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--md-outline-variant)] p-8 text-center font-label text-sm text-[var(--md-on-surface-variant)]">
            还没有竞品。到“监控对象”中添加竞品 ASIN 后，这里会形成每日情报。
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {competitors.map((competitor) => (
              <article key={competitor.id} className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-headline text-base font-semibold text-[var(--md-on-surface)]">{competitor.asin}</p>
                    <p className="mt-1 font-label text-xs text-[var(--md-on-surface-variant)]">
                      {competitor.latest ? `最近采集：${competitor.latest.capturedAt.toLocaleString("zh-CN")}` : "尚未采集到快照"}
                    </p>
                  </div>
                  <Link href={`/projects/${projectId}/trends?asinId=${competitor.id}`} className="inline-flex items-center gap-1 font-label text-sm text-[var(--md-primary)] transition-colors hover:text-[var(--md-primary-dim)]">
                    查看详情 <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {competitor.latest ? (
                  <>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                      <div><dt className="font-label text-xs text-[var(--md-on-surface-variant)]">价格</dt><dd className="mt-1 font-headline text-lg font-semibold text-[var(--md-on-surface)]">{metric(competitor.latest.price, (value) => `$${value.toFixed(2)}`)}</dd></div>
                      <div><dt className="font-label text-xs text-[var(--md-on-surface-variant)]">评分</dt><dd className="mt-1 font-headline text-lg font-semibold text-[var(--md-on-surface)]">{metric(competitor.latest.rating, (value) => value.toFixed(1))}</dd></div>
                      <div><dt className="font-label text-xs text-[var(--md-on-surface-variant)]">月销量</dt><dd className="mt-1 font-headline text-lg font-semibold text-[var(--md-on-surface)]">{metric(competitor.latest.monthlySales)}</dd></div>
                      <div><dt className="font-label text-xs text-[var(--md-on-surface-variant)]">BSR</dt><dd className="mt-1 font-headline text-lg font-semibold text-[var(--md-on-surface)]">{competitor.latest.bsr === null ? "-" : `#${metric(competitor.latest.bsr)}`}</dd></div>
                      <div><dt className="font-label text-xs text-[var(--md-on-surface-variant)]">变体数</dt><dd className="mt-1 font-headline text-lg font-semibold text-[var(--md-on-surface)]">{metric(competitor.latest.variantCount)}</dd></div>
                      <div><dt className="font-label text-xs text-[var(--md-on-surface-variant)]">配送方式</dt><dd className="mt-1 font-headline text-lg font-semibold text-[var(--md-on-surface)]">{competitor.latest.isFBA === null ? "-" : competitor.latest.isFBA ? "FBA" : "FBM"}</dd></div>
                    </dl>
                    <div className="mt-5 border-t border-[var(--md-outline-variant)] pt-4">
                      <p className="font-label text-xs font-semibold uppercase tracking-[0.14em] text-[var(--md-on-surface-variant)]">较上一份快照</p>
                      {competitor.changes.length ? (
                        <ul className="mt-3 space-y-2">
                          {competitor.changes.slice(0, 4).map((change) => {
                            const Icon = change.tone === "positive" ? TrendingUp : TrendingDown;
                            return <li key={change.label} className="flex items-center justify-between gap-3 font-label text-sm"><span className="flex min-w-0 items-center gap-2 text-[var(--md-on-surface)]"><Icon className={`h-4 w-4 shrink-0 ${change.tone === "positive" ? "text-emerald-400" : "text-rose-400"}`} />{change.label}：{change.value}</span><span className={change.tone === "positive" ? "shrink-0 text-emerald-400" : "shrink-0 text-rose-400"}>{change.detail}</span></li>;
                          })}
                        </ul>
                      ) : <p className="mt-3 font-label text-sm text-[var(--md-on-surface-variant)]">关键指标暂无变化，继续观察。</p>}
                    </div>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
