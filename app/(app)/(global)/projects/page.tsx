import { TrackedAsinRole } from "@prisma/client";
import { auth } from "@/auth";
import { MonitoringOpsOverviewPanel } from "@/components/projects/monitoring-ops-overview";
import { db } from "@/server/db";
import { ensureDemoUser } from "@/server/ensure-demo-user";
import { ProjectCard } from "@/components/projects/project-card";
import { getMonitoringOpsOverview } from "@/server/services/monitoring-ops";
import { diffDaysInclusive } from "@/server/services/project-monitoring-days";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  await ensureDemoUser();

  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";
  if (isAdmin) {
    redirect("/admin");
  }

  const [projects, monitoringOverview] = userId
    ? await Promise.all([
        db.project.findMany({
          where: { userId },
          include: {
            trackedAsins: {
              select: {
                role: true,
                snapshots: {
                  select: {
                    capturedAt: true
                  },
                  orderBy: {
                    capturedAt: "asc"
                  },
                  take: 1
                }
              }
            },
            _count: {
              select: {
                trackedAsins: true,
                alerts: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        isAdmin ? getMonitoringOpsOverview(userId) : Promise.resolve(null)
      ]) 
    : [[], null];

  const normalizedProjects = projects.map(({ trackedAsins, ...project }) => {
    const firstSnapshotAt = trackedAsins
      .map((item) => item.snapshots[0]?.capturedAt ?? null)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const monitoringStartedAt = firstSnapshotAt ?? project.createdAt;

    return {
      ...project,
      monitoredDays: diffDaysInclusive(monitoringStartedAt, new Date()),
      counts: {
        ownAsins: trackedAsins.filter((item) => item.role === TrackedAsinRole.OWN).length,
        competitorAsins: trackedAsins.filter((item) => item.role === TrackedAsinRole.COMPETITOR).length
      }
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">
            Competitor Monitor
          </p>
          <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">
            项目总览
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--md-on-surface-variant)]">
            创建一个项目，系统会在初始化时完成 ASIN 批量订阅和首批数据落库，之后你只需查看每日采集后的告警、趋势和摘要。
          </p>
        </div>
        <a
          href="/projects/new"
          className="inline-flex items-center justify-center rounded-xl bg-[var(--md-primary)] px-5 py-3 text-sm font-semibold text-[var(--md-on-primary)] transition hover:bg-[var(--md-primary-dim)]"
        >
          新建项目
        </a>
      </div>

      {projects.length && monitoringOverview ? (
        <div className="mt-10">
          <MonitoringOpsOverviewPanel overview={monitoringOverview} />
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {normalizedProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {!normalizedProjects.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-10 text-center text-[var(--md-on-surface-variant)]">
          还没有项目，先创建一个用于监控竞品的工作区。
        </div>
      ) : null}
    </div>
  );
}
