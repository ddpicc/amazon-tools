import { NotificationChannelType, NotificationDeliveryStatus } from "@prisma/client";
import { db } from "@/server/db";
import { classifyFailure } from "@/server/services/failure-classification";

type ProjectMonitoringHistoryOptions = {
  pollJobLimit?: number;
  deliveryLimit?: number;
  suppressionLimit?: number;
  digestLimit?: number;
};

export async function getProjectMonitoringHistory(
  projectId: string,
  {
    pollJobLimit = 8,
    deliveryLimit = 8,
    suppressionLimit = 8,
    digestLimit = 5
  }: ProjectMonitoringHistoryOptions = {}
) {
  const [pollJobs, webhookDeliveries, suppressions, dailyDigests] = await Promise.all([
    db.syncJob.findMany({
      where: {
        projectId,
        jobType: "monitoring_poll_project"
      },
      orderBy: { createdAt: "desc" },
      take: pollJobLimit
    }),
    db.notificationDelivery.findMany({
      where: {
        projectId,
        channelType: {
          in: [NotificationChannelType.FEISHU, NotificationChannelType.WECOM, NotificationChannelType.EMAIL]
        }
      },
      include: {
        alert: {
          select: {
            title: true
          }
        },
        channel: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: deliveryLimit
    }),
    db.alertSuppressionLog.findMany({
      where: { projectId },
      include: {
        trackedAsin: {
          select: {
            asin: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: suppressionLimit
    }),
    db.dailyDigestRun.findMany({
      where: { projectId },
      orderBy: { digestDate: "desc" },
      take: digestLimit
    })
  ]);

  const successCount = webhookDeliveries.filter((delivery) => delivery.status === NotificationDeliveryStatus.SUCCESS).length;
  const failedCount = webhookDeliveries.filter((delivery) => delivery.status === NotificationDeliveryStatus.FAILED).length;

  const channelHealth = [NotificationChannelType.FEISHU, NotificationChannelType.WECOM, NotificationChannelType.EMAIL].map((channelType) => {
    const channelDeliveries = webhookDeliveries.filter((delivery) => delivery.channelType === channelType);

    return {
      channelType,
      successCount: channelDeliveries.filter((delivery) => delivery.status === NotificationDeliveryStatus.SUCCESS).length,
      failedCount: channelDeliveries.filter((delivery) => delivery.status === NotificationDeliveryStatus.FAILED).length,
      totalCount: channelDeliveries.length
    };
  });

  return {
    pollJobs: pollJobs.map((job) => ({
      ...job,
      failureLabel: classifyFailure(job.errorMessage).label,
      failureDetail: classifyFailure(job.errorMessage).detail ?? null
    })),
    webhookDeliveries: webhookDeliveries.map((delivery) => ({
      ...delivery,
      failureLabel: classifyFailure(delivery.errorMessage).label,
      failureDetail: classifyFailure(delivery.errorMessage).detail ?? null
    })),
    suppressions,
    dailyDigests,
    deliveryHealth: {
      successCount,
      failedCount,
      totalCount: webhookDeliveries.length,
      channelHealth
    }
  };
}
