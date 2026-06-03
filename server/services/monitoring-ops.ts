import { NotificationChannelType, NotificationDeliveryStatus, SyncJobStatus } from "@prisma/client";
import { db } from "@/server/db";
import { classifyFailure } from "@/server/services/failure-classification";

const DEFAULT_WINDOW_HOURS = 24;

export type MonitoringOpsOverview = {
  windowHours: number;
  projectCount: number;
  stats: {
    polledProjectCount: number;
    successfulPollJobCount: number;
    failedPollJobCount: number;
    failedWebhookCount: number;
    suppressedAlertCount: number;
  };
  recentFailedPolls: Array<{
    id: string;
    projectId: string;
    projectName: string;
    errorMessage: string | null;
    failureLabel: string;
    failureDetail: string | null;
    finishedAt: Date | null;
  }>;
  recentWebhookFailures: Array<{
    id: string;
    projectId: string;
    projectName: string;
    channelType: NotificationChannelType;
    channelName: string | null;
    errorMessage: string | null;
    failureLabel: string;
    failureDetail: string | null;
    createdAt: Date;
    alertTitle: string;
  }>;
  recentSuppressions: Array<{
    id: string;
    projectId: string;
    projectName: string;
    asin: string;
    type: string;
    title: string;
    duplicateAlertTitle: string | null;
    cooldownMinutes: number;
    createdAt: Date;
  }>;
};

export async function getMonitoringOpsOverview(userId: string): Promise<MonitoringOpsOverview> {
  const windowHours = DEFAULT_WINDOW_HOURS;
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const projects = await db.project.findMany({
    where: { userId },
    select: { id: true, name: true }
  });

  if (!projects.length) {
    return {
      windowHours,
      projectCount: 0,
      stats: {
        polledProjectCount: 0,
        successfulPollJobCount: 0,
        failedPollJobCount: 0,
        failedWebhookCount: 0,
        suppressedAlertCount: 0
      },
      recentFailedPolls: [],
      recentWebhookFailures: [],
      recentSuppressions: []
    };
  }

  const projectIds = projects.map((project) => project.id);

  const [
    polledProjectGroups,
    successfulPollJobCount,
    failedPollJobCount,
    recentFailedPolls,
    failedWebhookCount,
    recentWebhookFailures,
    suppressedAlertCount,
    recentSuppressions
  ] = await Promise.all([
    db.syncJob.groupBy({
      by: ["projectId"],
      where: {
        projectId: { in: projectIds },
        jobType: "monitoring_poll_project",
        status: SyncJobStatus.SUCCESS,
        startedAt: { gte: windowStart }
      }
    }),
    db.syncJob.count({
      where: {
        projectId: { in: projectIds },
        jobType: "monitoring_poll_project",
        status: SyncJobStatus.SUCCESS,
        startedAt: { gte: windowStart }
      }
    }),
    db.syncJob.count({
      where: {
        projectId: { in: projectIds },
        jobType: "monitoring_poll_project",
        status: SyncJobStatus.FAILED,
        startedAt: { gte: windowStart }
      }
    }),
    db.syncJob.findMany({
      where: {
        projectId: { in: projectIds },
        jobType: "monitoring_poll_project",
        status: SyncJobStatus.FAILED,
        startedAt: { gte: windowStart }
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startedAt: "desc" },
      take: 6
    }),
    db.notificationDelivery.count({
      where: {
        projectId: { in: projectIds },
        channelType: {
          in: [NotificationChannelType.FEISHU, NotificationChannelType.WECOM]
        },
        status: NotificationDeliveryStatus.FAILED,
        createdAt: { gte: windowStart }
      }
    }),
    db.notificationDelivery.findMany({
      where: {
        projectId: { in: projectIds },
        channelType: {
          in: [NotificationChannelType.FEISHU, NotificationChannelType.WECOM]
        },
        status: NotificationDeliveryStatus.FAILED,
        createdAt: { gte: windowStart }
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        channel: {
          select: { name: true }
        },
        alert: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    db.alertSuppressionLog.count({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: windowStart }
      }
    }),
    db.alertSuppressionLog.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: windowStart }
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        trackedAsin: {
          select: { asin: true }
        },
        duplicateAlert: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return {
    windowHours,
    projectCount: projectIds.length,
    stats: {
      polledProjectCount: polledProjectGroups.length,
      successfulPollJobCount,
      failedPollJobCount,
      failedWebhookCount,
      suppressedAlertCount
    },
    recentFailedPolls: recentFailedPolls.map((job) => {
      const classification = classifyFailure(job.errorMessage);
      return {
        id: job.id,
        projectId: job.projectId ?? "",
        projectName: job.project?.name ?? "Unknown project",
        errorMessage: job.errorMessage,
        failureLabel: classification.label,
        failureDetail: classification.detail ?? null,
        finishedAt: job.finishedAt
      };
    }),
    recentWebhookFailures: recentWebhookFailures.map((delivery) => {
      const classification = classifyFailure(delivery.errorMessage);
      return {
        id: delivery.id,
        projectId: delivery.projectId,
        projectName: delivery.project.name,
        channelType: delivery.channelType,
        channelName: delivery.channel?.name ?? null,
        errorMessage: delivery.errorMessage,
        failureLabel: classification.label,
        failureDetail: classification.detail ?? null,
        createdAt: delivery.createdAt,
        alertTitle: delivery.alert.title
      };
    }),
    recentSuppressions: recentSuppressions.map((log) => ({
      id: log.id,
      projectId: log.projectId,
      projectName: log.project.name,
      asin: log.trackedAsin.asin,
      type: log.type,
      title: log.title,
      duplicateAlertTitle: log.duplicateAlert?.title ?? null,
      cooldownMinutes: log.cooldownMinutes,
      createdAt: log.createdAt
    }))
  };
}
