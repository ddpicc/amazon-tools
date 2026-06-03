import { db } from "@/server/db";
import { PROJECT_DAILY_POLL_HOUR, PROJECT_DAILY_POLL_MINUTE } from "@/lib/project-schedule";
import { getShanghaiDateKey, getShanghaiStartOfDay, isAfterShanghaiTime } from "@/lib/shanghai-time";
import { pollProjectMonitoringSubscriptions } from "@/server/services/poll-monitoring-subscriptions";

type DueProjectResult = {
  projectId: string;
  projectName: string;
  polled: boolean;
  reason: string;
  error?: string;
};

export async function pollDueProjects(options?: { limit?: number }) {
  const limit = options?.limit ?? 20;
  const now = new Date();
  const todayStart = getShanghaiStartOfDay(now);
  const todayKey = getShanghaiDateKey(now);

  if (!isAfterShanghaiTime(now, PROJECT_DAILY_POLL_HOUR, PROJECT_DAILY_POLL_MINUTE)) {
    return {
      scanned: 0,
      polled: 0,
      limit,
      results: [] as DueProjectResult[]
    };
  }

  const projects = await db.project.findMany({
    include: {
      trackedAsins: {
        where: { status: "ACTIVE" },
        select: { id: true }
      }
    },
    orderBy: { updatedAt: "asc" }
  });

  const results = [] as DueProjectResult[];
  let polledCount = 0;

  for (const project of projects) {
    if (polledCount >= limit) {
      results.push({
        projectId: project.id,
        projectName: project.name,
        polled: false,
        reason: "limit_reached"
      });
      continue;
    }

    if (!project.trackedAsins.length) {
      results.push({
        projectId: project.id,
        projectName: project.name,
        polled: false,
        reason: "no_active_asins"
      });
      continue;
    }

    const latestPollJob = await db.syncJob.findFirst({
      where: {
        projectId: project.id,
        jobType: "monitoring_poll_project",
        status: { in: ["RUNNING", "SUCCESS"] }
      },
      orderBy: { startedAt: "desc" }
    });

    if (latestPollJob?.status === "RUNNING") {
      results.push({
        projectId: project.id,
        projectName: project.name,
        polled: false,
        reason: "already_running"
      });
      continue;
    }

    if (latestPollJob?.startedAt && latestPollJob.startedAt >= todayStart) {
      results.push({
        projectId: project.id,
        projectName: project.name,
        polled: false,
        reason: `already_polled:${todayKey}`
      });
      continue;
    }

    try {
      await pollProjectMonitoringSubscriptions(project.id);
      polledCount += 1;
      results.push({
        projectId: project.id,
        projectName: project.name,
        polled: true,
        reason: "polled"
      });
    } catch (error) {
      results.push({
        projectId: project.id,
        projectName: project.name,
        polled: false,
        reason: "poll_failed",
        error: error instanceof Error ? error.message : "Unknown poll error"
      });
    }
  }

  return {
    scanned: projects.length,
    polled: polledCount,
    limit,
    results
  };
}
