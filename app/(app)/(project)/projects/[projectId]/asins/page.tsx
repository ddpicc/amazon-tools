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
        <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Inventory management</p>
        <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">ASIN Management</h1>
        <p className="mt-2 max-w-2xl font-label text-sm text-[var(--md-on-surface-variant)]">
          Manage subscribed ASINs for your own products and competitor benchmarks. Each subscribed ASIN is collected once per day.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Total Tracked" ownLabel="" ownValue={stats.trackedAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">All monitored listings</span>} />
        <MetricCard label="Own Portfolio" ownLabel="" ownValue={stats.ownAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">Active ASINs</span>} />
        <MetricCard label="Competitors" ownLabel="" ownValue={stats.competitorAsinCount} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">Across markets</span>} />
        <MetricCard label="Sync Health" ownLabel="" ownValue={stats.lastSyncAt ? "Active" : "Pending"} footer={<span className="font-label text-xs text-emerald-400">{stats.lastSyncAt ? `Last sync: ${new Date(stats.lastSyncAt).toLocaleString("zh-CN")}` : "No sync yet"}</span>} />
      </div>

      <AddAsinForm projectId={project.id} />

      <Surface>
        <AsinTableWithFilters projectId={project.id} items={project.trackedAsins} />
      </Surface>
    </div>
  );
}
