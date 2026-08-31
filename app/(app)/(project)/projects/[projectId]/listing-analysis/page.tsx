import { auth } from "@/auth";
import { ListingDeepAnalysisForm } from "@/components/analysis/listing-deep-analysis-form";
import { db } from "@/server/db";

export default async function ListingDeepAnalysisPage({ params }: { params: { projectId: string } }) {
  const session = await auth(); if (!session?.user?.id) return null;
  const project = await db.project.findFirst({ where: { id: params.projectId, userId: session.user.id }, select: { id: true, name: true, marketplace: true, trackedAsins: { where: { status: "ACTIVE" }, orderBy: [{ role: "asc" }, { asin: "asc" }], select: { id: true, asin: true, title: true, role: true } }, analysisRuns: { where: { toolKey: "listing-deep-analysis" }, orderBy: { requestedAt: "desc" }, take: 5, select: { id: true, status: true, requestedAt: true, resultJson: true, errorMessage: true } } } });
  if (!project) return null;
  const ownCount = project.trackedAsins.filter((item) => item.role === "OWN").length; const competitorCount = project.trackedAsins.filter((item) => item.role === "COMPETITOR").length;
  return <div className="mx-auto max-w-6xl space-y-7"><div><p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Listing deep analysis</p><h1 className="mt-3 font-headline text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">Listing 深度分析</h1><p className="mt-2 max-w-3xl font-label text-sm text-[var(--md-on-surface-variant)]">{project.marketplace} · {project.name}。阶段 1 刷新自有与竞品的公开图片、Listing 文案和关键词事实；阶段 2 由 AI 生成图片、文案、关键词与广告策略建议。</p></div>{ownCount && competitorCount ? <ListingDeepAnalysisForm projectId={project.id} asins={project.trackedAsins} recentRuns={project.analysisRuns.map((run) => ({ ...run, requestedAt: run.requestedAt.toISOString() }))} /> : <div className="rounded-2xl border border-dashed border-[var(--md-outline-variant)] p-8 text-center font-label text-sm text-[var(--md-on-surface-variant)]">请先添加至少一个自有 ASIN 和一个竞品 ASIN，并保持为启用状态。</div>}</div>;
}
