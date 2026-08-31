import { TrackedAsinRole } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ensureDemoUser } from "@/server/ensure-demo-user";
import { ProjectCard } from "@/components/projects/project-card";
import { diffDaysInclusive } from "@/server/services/project-monitoring-days";
import { getMonitoringState } from "@/server/services/monitoring-status";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  await ensureDemoUser();

  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";
  if (isAdmin) {
    redirect("/admin");
  }

  const projects = userId
    ? await db.project.findMany({
        where: { userId },
        include: {
          trackedAsins: {
            select: {
              role: true,
              status: true,
              lastSuccessAt: true,
              consecutiveFailures: true,
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
              trackedAsins: { where: { status: "ACTIVE" } },
              alerts: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const normalizedProjects = projects.map(({ trackedAsins, ...project }) => {
    const firstSnapshotAt = trackedAsins
      .map((item) => item.snapshots[0]?.capturedAt ?? null)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const monitoringStartedAt = firstSnapshotAt ?? project.createdAt;
    const activeAsins = trackedAsins.filter((item) => item.status === "ACTIVE");
    const latestSuccessAt = activeAsins.reduce<Date | null>((latest, item) => {
      if (!item.lastSuccessAt) return latest;
      return !latest || item.lastSuccessAt > latest ? item.lastSuccessAt : latest;
    }, null);
    const failedAsinCount = activeAsins.filter((item) => item.consecutiveFailures > 0).length;
    const staleAsinCount = activeAsins.filter((item) => {
      const state = getMonitoringState(item);
      return state === "DATA_OVERDUE" || state === "WAITING_FOR_FIRST_COLLECTION";
    }).length;

    return {
      ...project,
      monitoredDays: diffDaysInclusive(monitoringStartedAt, new Date()),
      latestSuccessAt,
      failedAsinCount,
      staleAsinCount,
      attentionCount: failedAsinCount + staleAsinCount + project._count.alerts,
      counts: {
        ownAsins: activeAsins.filter((item) => item.role === TrackedAsinRole.OWN).length,
        competitorAsins: activeAsins.filter((item) => item.role === TrackedAsinRole.COMPETITOR).length
      }
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">
            Product intelligence
          </p>
          <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">
            项目
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--md-on-surface-variant)]">
            以项目为单位管理自有商品和竞品。系统会完成 ASIN 订阅与每日快照采集，供你查看变化报告、趋势和竞品对比。
          </p>
        </div>
        <a
          href="/projects/new"
          className="inline-flex items-center justify-center rounded-xl bg-[var(--md-primary)] px-5 py-3 text-sm font-semibold text-[var(--md-on-primary)] transition hover:bg-[var(--md-primary-dim)]"
        >
          新建项目
        </a>
      </div>

      <div className="mt-10 rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--md-primary)]">手动刷新规则</p>
        <h3 className="mt-2 font-headline text-xl font-semibold text-[var(--md-on-surface)]">
          每个 ASIN 每天最多 1 次
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--md-on-surface-variant)]">
          这个限制不区分套餐，避免同一天内重复抓取没有变化的数据。不同套餐只影响项目数、总 ASIN 数和功能层级。
        </p>
      </div>

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
