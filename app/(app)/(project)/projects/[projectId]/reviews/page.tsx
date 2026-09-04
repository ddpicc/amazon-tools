import { auth } from "@/auth";
import { ReviewMonitorList } from "@/components/projects/review-monitor-list";
import { Surface } from "@/components/projects/project-workspace-shell";
import { db } from "@/server/db";

export default async function ProjectReviewsPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await db.project.findFirst({ where: { id: params.projectId, userId: session.user.id }, select: { id: true, trackedAsins: { where: { role: "OWN" }, orderBy: { asin: "asc" }, select: { id: true, asin: true } } } });
  if (!project) return null;
  const reviews = await db.productReview.findMany({ where: { trackedAsin: { projectId: project.id, role: "OWN" } }, include: { trackedAsin: { select: { asin: true } } }, orderBy: [{ reviewDate: "desc" }, { firstSeenAt: "desc" }], take: 100 });
  return <div className="mx-auto max-w-6xl space-y-8"><div><p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Review monitoring</p><h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">评论监控</h1><p className="mt-2 max-w-3xl font-label text-sm text-[var(--md-on-surface-variant)]">仅监控自有 ASIN，展示已采集的全部评论；新增评论会进入项目概览和日报，其中 1–3 星会重点标记。</p></div><Surface><ReviewMonitorList asins={project.trackedAsins.map((item) => item.asin)} reviews={reviews.map((review) => ({ id: review.id, asin: review.trackedAsin.asin, reviewDate: review.reviewDate?.toISOString() ?? null, title: review.title, rating: review.rating, content: review.content }))} /></Surface></div>;
}
