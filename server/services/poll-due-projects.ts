import { db } from "@/server/db";
import { pollProjectMonitoringSubscriptions } from "@/server/services/poll-monitoring-subscriptions";

type DueProjectResult = {
  projectId: string;
  projectName: string;
  polled: boolean;
  reason: string;
  error?: string;
};

function minutesSince(date: Date) {
  return (Date.now() - date.getTime()) / 60000;
}

export async function pollDueProjects(options?: { limit?: number }) {
  const limit = options?.limit ?? 20;

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

    if (latestPollJob?.startedAt) {
      const elapsedMinutes = minutesSince(latestPollJob.startedAt);
      if (elapsedMinutes < project.syncFrequencyMinutes) {
        results.push({
          projectId: project.id,
          projectName: project.name,
          polled: false,
          reason: `not_due:${Math.floor(elapsedMinutes)}/${project.syncFrequencyMinutes}`
        });
        continue;
      }
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
