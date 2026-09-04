import {
  AlertSeverity,
  AlertStatus,
  NotificationDeliveryStatus,
  SyncJobStatus,
  TrackedAsinRole,
  TrackedAsinStatus
} from "@prisma/client";
import { formatShanghaiDate } from "@/lib/shanghai-time";
import { digestPreview } from "@/lib/digest-display";
import { db } from "@/server/db";
import { MONITORING_FRESHNESS_HOURS } from "@/server/services/monitoring-status";

const MAX_ACTIONS = 24;

export type HomeDashboardAction = {
  id: string;
  kind: "ALERT" | "SYNC_FAILURE" | "STALE_DATA" | "DELIVERY_FAILURE" | "DIGEST_FAILURE" | "DAILY_DIGEST";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  detail: string;
  projectId: string;
  projectName: string;
  marketplace: string;
  asin: string | null;
  occurredAt: Date;
  href: string;
};

export type HomeDashboardProject = {
  id: string;
  name: string;
  marketplace: string;
  ownAsinCount: number;
  competitorAsinCount: number;
  activeAsinCount: number;
  staleAsinCount: number;
  failedAsinCount: number;
  latestSuccessAt: Date | null;
  attentionCount: number;
  digestStatus: string | null;
};

export type HomeDashboard = {
  portfolio: {
    projectCount: number;
    activeAsinCount: number;
    freshAsinCount: number;
    staleAsinCount: number;
    attentionCount: number;
    freshnessPercent: number;
  };
  actions: HomeDashboardAction[];
  projects: HomeDashboardProject[];
};

type ProjectWithAsins = {
  id: string;
  name: string;
  marketplace: string;
  trackedAsins: Array<{
    id: string;
    asin: string;
    role: TrackedAsinRole;
    status: TrackedAsinStatus;
    lastSuccessAt: Date | null;
    consecutiveFailures: number;
  }>;
  dailyDigestRuns: Array<{
    id: string;
    digestDate: Date;
    status: string;
    summary: string;
  }>;
};

function isStale(lastSuccessAt: Date | null, staleBefore: Date) {
  return !lastSuccessAt || lastSuccessAt < staleBefore;
}

function severityRank(severity: HomeDashboardAction["severity"]) {
  return severity === "CRITICAL" ? 0 : severity === "WARNING" ? 1 : 2;
}

function toSeverity(value: AlertSeverity): HomeDashboardAction["severity"] {
  return value === AlertSeverity.CRITICAL ? "CRITICAL" : value === AlertSeverity.WARNING ? "WARNING" : "INFO";
}

function projectHref(projectId: string, section: string) {
  return `/projects/${projectId}/${section}`;
}

export async function getHomeDashboard(userId: string, now = new Date()): Promise<HomeDashboard> {
  const staleBefore = new Date(now.getTime() - MONITORING_FRESHNESS_HOURS * 60 * 60 * 1000);

  const [projects, failedSyncJobs, openAlerts, failedDeliveries, failedDigests] = await Promise.all([
    db.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        marketplace: true,
        trackedAsins: {
          where: { status: TrackedAsinStatus.ACTIVE },
          select: {
            id: true,
            asin: true,
            role: true,
            status: true,
            lastSuccessAt: true,
            consecutiveFailures: true
          }
        },
        dailyDigestRuns: {
          orderBy: { digestDate: "desc" },
          take: 1,
          select: {
            id: true,
            digestDate: true,
            status: true,
            summary: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    db.syncJob.findMany({
      where: {
        status: SyncJobStatus.FAILED,
        project: { userId }
      },
      select: {
        id: true,
        errorMessage: true,
        updatedAt: true,
        projectId: true,
        trackedAsin: { select: { id: true, asin: true } },
        project: { select: { id: true, name: true, marketplace: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 12
    }),
    db.alert.findMany({
      where: {
        status: AlertStatus.OPEN,
        project: { userId }
      },
      select: {
        id: true,
        severity: true,
        title: true,
        message: true,
        createdAt: true,
        projectId: true,
        project: { select: { id: true, name: true, marketplace: true } },
        trackedAsin: { select: { asin: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.notificationDelivery.findMany({
      where: {
        status: NotificationDeliveryStatus.FAILED,
        project: { userId }
      },
      select: {
        id: true,
        errorMessage: true,
        createdAt: true,
        projectId: true,
        project: { select: { id: true, name: true, marketplace: true } },
        alert: { select: { title: true, trackedAsin: { select: { asin: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    db.dailyDigestRun.findMany({
      where: {
        status: { in: ["FAILED", "PARTIAL"] },
        project: { userId }
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
        projectId: true,
        project: { select: { id: true, name: true, marketplace: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
  ]);

  const typedProjects = projects as ProjectWithAsins[];
  const actions: HomeDashboardAction[] = [];

  for (const alert of openAlerts) {
    actions.push({
      id: `alert:${alert.id}`,
      kind: "ALERT",
      severity: toSeverity(alert.severity),
      title: alert.title,
      detail: alert.message ?? "项目中有一条待处理告警。",
      projectId: alert.project.id,
      projectName: alert.project.name,
      marketplace: alert.project.marketplace,
      asin: alert.trackedAsin.asin,
      occurredAt: alert.createdAt,
      href: projectHref(alert.project.id, "trends")
    });
  }

  for (const job of failedSyncJobs) {
    if (!job.project) continue;
    actions.push({
      id: `sync:${job.id}`,
      kind: "SYNC_FAILURE",
      severity: "WARNING",
      title: job.trackedAsin ? `${job.trackedAsin.asin} 同步失败` : "项目同步失败",
      detail: job.errorMessage ?? "最近一次商品数据采集没有成功。",
      projectId: job.project.id,
      projectName: job.project.name,
      marketplace: job.project.marketplace,
      asin: job.trackedAsin?.asin ?? null,
      occurredAt: job.updatedAt,
      href: projectHref(job.project.id, "asins")
    });
  }

  for (const project of typedProjects) {
    for (const asin of project.trackedAsins) {
      if (asin.lastSuccessAt || asin.consecutiveFailures === 0) continue;
      actions.push({
        id: `initial:${asin.id}`,
        kind: "SYNC_FAILURE",
        severity: "WARNING",
        title: `${asin.asin} 等待重新采集`,
        detail: `已连续失败 ${asin.consecutiveFailures} 次，暂未产生成功快照。`,
        projectId: project.id,
        projectName: project.name,
        marketplace: project.marketplace,
        asin: asin.asin,
        occurredAt: now,
        href: projectHref(project.id, "asins")
      });
    }
  }

  for (const delivery of failedDeliveries) {
    if (!delivery.project) continue;
    actions.push({
      id: `delivery:${delivery.id}`,
      kind: "DELIVERY_FAILURE",
      severity: "WARNING",
      title: "通知投递失败",
      detail: delivery.errorMessage ?? `${delivery.alert.title} 未能投递到通知渠道。`,
      projectId: delivery.project.id,
      projectName: delivery.project.name,
      marketplace: delivery.project.marketplace,
      asin: delivery.alert.trackedAsin?.asin ?? null,
      occurredAt: delivery.createdAt,
      href: projectHref(delivery.project.id, "digest")
    });
  }

  for (const digest of failedDigests) {
    if (!digest.project) continue;
    actions.push({
      id: `digest:${digest.id}`,
      kind: "DIGEST_FAILURE",
      severity: "WARNING",
      title: "日报未成功完成",
      detail: digest.errorMessage ?? `当前日报状态：${digest.status}。`,
      projectId: digest.project.id,
      projectName: digest.project.name,
      marketplace: digest.project.marketplace,
      asin: null,
      occurredAt: digest.updatedAt,
      href: projectHref(digest.project.id, "digest")
    });
  }

  for (const project of typedProjects) {
    for (const asin of project.trackedAsins) {
      if (!asin.lastSuccessAt && asin.consecutiveFailures > 0) continue;
      if (!isStale(asin.lastSuccessAt, staleBefore)) continue;
      const hasFailure = asin.consecutiveFailures > 0;
      actions.push({
        id: `stale:${asin.id}`,
        kind: "STALE_DATA",
        severity: hasFailure ? "WARNING" : "INFO",
        title: `${asin.asin} 数据${asin.lastSuccessAt ? "已过期" : "尚未采集"}`,
        detail: asin.lastSuccessAt
          ? `最近成功采集：${asin.lastSuccessAt.toLocaleString("zh-CN")}。`
          : "该对象还没有成功快照。",
        projectId: project.id,
        projectName: project.name,
        marketplace: project.marketplace,
        asin: asin.asin,
        occurredAt: asin.lastSuccessAt ?? now,
        href: projectHref(project.id, "asins")
      });
    }
  }

  const dedupedActions = Array.from(new Map(actions.map((action) => [action.id, action])).values())
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, MAX_ACTIONS);

  const dailyDigestActions: HomeDashboardAction[] = typedProjects.flatMap((project) => {
    const digest = project.dailyDigestRuns[0];
    if (!digest) return [];

    return [{
      id: `daily-digest:${digest.id}`,
      kind: "DAILY_DIGEST",
      severity: "INFO",
      title: `最近日报 · ${formatShanghaiDate(digest.digestDate)}`,
      detail: digestPreview(digest.summary) || "日报暂无摘要内容。",
      projectId: project.id,
      projectName: project.name,
      marketplace: project.marketplace,
      asin: null,
      occurredAt: digest.digestDate,
      href: projectHref(project.id, "digest")
    } satisfies HomeDashboardAction];
  });
  const visibleActions = dedupedActions.length ? dedupedActions : dailyDigestActions.slice(0, MAX_ACTIONS);

  const projectHealth = typedProjects.map((project) => {
    const activeAsins = project.trackedAsins;
    const staleAsins = activeAsins.filter((asin) => isStale(asin.lastSuccessAt, staleBefore));
    const failedAsins = activeAsins.filter((asin) => asin.consecutiveFailures > 0);
    const projectActions = dedupedActions.filter((action) => action.projectId === project.id);
    const latestSuccessAt = activeAsins.reduce<Date | null>((latest, asin) => {
      if (!asin.lastSuccessAt) return latest;
      return !latest || asin.lastSuccessAt > latest ? asin.lastSuccessAt : latest;
    }, null);

    return {
      id: project.id,
      name: project.name,
      marketplace: project.marketplace,
      ownAsinCount: activeAsins.filter((asin) => asin.role === TrackedAsinRole.OWN).length,
      competitorAsinCount: activeAsins.filter((asin) => asin.role === TrackedAsinRole.COMPETITOR).length,
      activeAsinCount: activeAsins.length,
      staleAsinCount: staleAsins.length,
      failedAsinCount: failedAsins.length,
      latestSuccessAt,
      attentionCount: projectActions.length,
      digestStatus: project.dailyDigestRuns[0]?.status ?? null
    } satisfies HomeDashboardProject;
  });

  const activeAsins = typedProjects.flatMap((project) => project.trackedAsins);
  const staleAsinCount = activeAsins.filter((asin) => isStale(asin.lastSuccessAt, staleBefore)).length;
  const freshAsinCount = activeAsins.length - staleAsinCount;

  return {
    portfolio: {
      projectCount: typedProjects.length,
      activeAsinCount: activeAsins.length,
      freshAsinCount,
      staleAsinCount,
      attentionCount: visibleActions.length,
      freshnessPercent: activeAsins.length ? Math.round((freshAsinCount / activeAsins.length) * 100) : 0
    },
    actions: visibleActions,
    projects: projectHealth
  };
}
