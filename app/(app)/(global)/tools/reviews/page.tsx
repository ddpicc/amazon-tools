import { ReviewInsightsForm } from "@/components/analysis/review-insights-form";
import { auth } from "@/auth";
import { db } from "@/server/db";

export default async function ReviewsToolPage({ searchParams }: { searchParams: { projectId?: string } }) {
  const session = await auth();
  const project = searchParams.projectId && session?.user?.id ? await db.project.findFirst({ where: { id: searchParams.projectId, userId: session.user.id }, select: { id: true, marketplace: true, trackedAsins: { select: { asin: true } } } }) : null;
  return <div className="mx-auto max-w-3xl"><p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Review insights</p><h1 className="mt-3 font-headline text-3xl font-bold">评论洞察</h1><p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">通过已接入的数据服务获取本次 Amazon 公开评论，按你的筛选条件展示全部结果并生成 AI 总结；不会创建监控订阅。</p><ReviewInsightsForm project={project ? { id: project.id, marketplace: project.marketplace, asins: project.trackedAsins.map((item) => item.asin) } : undefined} /></div>;
}
