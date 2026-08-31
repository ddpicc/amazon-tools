import { auth } from "@/auth";
import { AddAsinForm } from "@/components/asins/add-asin-form";
import { AsinTableWithFilters } from "@/components/asins/asin-table-with-filters";
import { MetricCard, Surface } from "@/components/projects/project-workspace-shell";
import { db } from "@/server/db";
import { getProjectStats } from "@/server/services/project-stats";

export default async function ProjectAsinsPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      marketplace: true,
      trackedAsins: {
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          asin: true,
          marketplace: true,
          role: true,
          title: true,
          brand: true,
          status: true,
          lastSuccessAt: true,
          consecutiveFailures: true,
          category: true
        }
      }
    }
  });
  if (!project) return null;

  const stats = await getProjectStats(project.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Monitoring setup</p>
        <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">监控对象</h1>
        <p className="mt-2 max-w-2xl font-label text-sm text-[var(--md-on-surface-variant)]">
          在一个项目中维护自有商品与竞品。所有启用的 ASIN 每天自动采集一次，用于生成监控、对比与报告。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="全部监控" ownLabel="" ownValue={stats.trackedAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">所有已订阅商品</span>} />
        <MetricCard label="自有商品" ownLabel="" ownValue={stats.ownAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">运营对象</span>} />
        <MetricCard label="竞品" ownLabel="" ownValue={stats.competitorAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">对照对象</span>} />
        <MetricCard label="采集状态" ownLabel="" ownValue={stats.lastSyncAt ? "正常" : "等待首次采集"} footer={<span className="font-label text-xs text-emerald-400">{stats.lastSyncAt ? `最近采集：${new Date(stats.lastSyncAt).toLocaleString("zh-CN")}` : "尚未采集"}</span>} />
      </div>

      <AddAsinForm projectId={project.id} />

      <Surface>
        <AsinTableWithFilters projectId={project.id} items={project.trackedAsins} />
      </Surface>
    </div>
  );
}
