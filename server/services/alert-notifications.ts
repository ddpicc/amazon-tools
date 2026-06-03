import { Alert, NotificationChannel, NotificationChannelType, NotificationDeliveryStatus } from "@prisma/client";
import { db } from "@/server/db";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";

type CreateProjectAlertInput = {
  projectId: string;
  trackedAsinId: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message?: string;
  oldValue?: string;
  newValue?: string;
  changeValue?: string;
  payload?: object | null;
};

const DEFAULT_ALERT_COOLDOWN_MINUTES = 12 * 60;

const ALERT_COOLDOWN_MINUTES: Partial<Record<string, number>> = {
  price_change: 6 * 60,
  rating_drop: 12 * 60,
  review_growth: 6 * 60,
  bsr_change: 6 * 60,
  variant_change: 12 * 60,
  listing_title_change: 24 * 60,
  listing_brand_change: 24 * 60,
  listing_category_change: 24 * 60
};

const WEBHOOK_MAX_RETRY_COUNT = 3;
const WEBHOOK_RETRY_DELAYS_MINUTES = [5, 30, 120];

function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function buildAlertFingerprint(input: CreateProjectAlertInput) {
  return JSON.stringify({
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    changeValue: input.changeValue ?? null,
    payload: sortObjectDeep(input.payload ?? null)
  });
}

function getCooldownMinutes(type: string) {
  return ALERT_COOLDOWN_MINUTES[type] ?? DEFAULT_ALERT_COOLDOWN_MINUTES;
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function getWebhookNextRetryAt(retryCount: number) {
  const delayMinutes = WEBHOOK_RETRY_DELAYS_MINUTES[retryCount];
  if (delayMinutes === undefined) {
    return null;
  }

  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

function buildNotificationText(alert: Alert & { project: { name: string; marketplace: string } }) {
  return [
    `[${alert.severity}] ${alert.project.marketplace} · ${alert.project.name}`,
    alert.title,
    alert.message ?? "",
    alert.oldValue || alert.newValue ? `变化: ${alert.oldValue ?? "-"} -> ${alert.newValue ?? "-"}` : "",
    alert.changeValue ? `幅度: ${alert.changeValue}` : "",
    `时间: ${alert.createdAt.toLocaleString("zh-CN")}`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWebhookPayload(
  alert: Alert & { project: { name: string; marketplace: string } },
  channelType: NotificationChannelType
) {
  const text = buildNotificationText(alert);

  if (channelType === NotificationChannelType.FEISHU) {
    return {
      msg_type: "text",
      content: {
        text
      }
    };
  }

  if (channelType === NotificationChannelType.WECOM) {
    return {
      msgtype: "text",
      text: {
        content: text
      }
    };
  }

  return { text };
}

type AlertWithProjectContext = Alert & {
  project: {
    id: string;
    name: string;
    marketplace: string;
    userId?: string;
    notificationEmail?: string | null;
  };
};

async function sendWebhookDelivery(
  alert: AlertWithProjectContext,
  channel: NotificationChannel
) {
  const payload = buildWebhookPayload(alert, channel.type);
  const response = await fetch(channel.webhookUrl!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return {
    ok: response.ok,
    status: response.status,
    responseBody: truncate(await response.text().catch(() => ""), 2000)
  };
}

async function persistWebhookDeliveryResult(input: {
  alert: AlertWithProjectContext;
  channel: NotificationChannel;
  deliveryId?: string;
  status: NotificationDeliveryStatus;
  errorMessage?: string | null;
  responseBody?: string | null;
  retryCount: number;
}) {
  const nextRetryAt =
    input.status === NotificationDeliveryStatus.FAILED && input.retryCount < WEBHOOK_MAX_RETRY_COUNT
      ? getWebhookNextRetryAt(input.retryCount)
      : null;

  const data = {
    projectId: input.alert.projectId,
    alertId: input.alert.id,
    channelId: input.channel.id,
    channelType: input.channel.type,
    status: input.status,
    errorMessage: input.errorMessage ?? null,
    responseBody: input.responseBody ?? null,
    deliveredAt: input.status === NotificationDeliveryStatus.SUCCESS ? new Date() : null,
    retryCount: input.retryCount,
    nextRetryAt,
    lastRetriedAt: input.deliveryId ? new Date() : null
  };

  if (input.deliveryId) {
    await db.notificationDelivery.update({
      where: { id: input.deliveryId },
      data
    });
    return;
  }

  await db.notificationDelivery.create({
    data
  });
}

async function deliverInboxNotification(alert: Alert & { project: { userId: string } }) {
  await db.inboxNotification.upsert({
    where: {
      userId_alertId: {
        userId: alert.project.userId,
        alertId: alert.id
      }
    },
    create: {
      userId: alert.project.userId,
      projectId: alert.projectId,
      alertId: alert.id,
      title: alert.title,
      message: alert.message,
      deliveredAt: new Date()
    },
    update: {
      title: alert.title,
      message: alert.message,
      deliveredAt: new Date()
    }
  });

  await db.notificationDelivery.create({
    data: {
      projectId: alert.projectId,
      alertId: alert.id,
      channelType: NotificationChannelType.INBOX,
      status: NotificationDeliveryStatus.SUCCESS,
      deliveredAt: new Date()
    }
  });
}

async function deliverWebhookNotification(
  alert: AlertWithProjectContext,
  channel: NotificationChannel,
  options?: { deliveryId?: string; retryCount?: number }
) {
  if (!channel.enabled || !channel.webhookUrl) {
    await persistWebhookDeliveryResult({
      alert,
      channel,
      deliveryId: options?.deliveryId,
      status: NotificationDeliveryStatus.SKIPPED,
      errorMessage: channel.enabled ? "Webhook URL is not configured" : "Channel is disabled",
      retryCount: options?.retryCount ?? 0
    });
    return NotificationDeliveryStatus.SKIPPED;
  }

  try {
    const response = await sendWebhookDelivery(alert, channel);

    await persistWebhookDeliveryResult({
      alert,
      channel,
      deliveryId: options?.deliveryId,
      status: response.ok ? NotificationDeliveryStatus.SUCCESS : NotificationDeliveryStatus.FAILED,
      errorMessage: response.ok ? null : `Webhook responded with status ${response.status}`,
      responseBody: response.responseBody,
      retryCount: options?.retryCount ?? 0
    });
    return response.ok ? NotificationDeliveryStatus.SUCCESS : NotificationDeliveryStatus.FAILED;
  } catch (error) {
    await persistWebhookDeliveryResult({
      alert,
      channel,
      deliveryId: options?.deliveryId,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : "Unknown webhook delivery error",
      retryCount: options?.retryCount ?? 0
    });
    return NotificationDeliveryStatus.FAILED;
  }
}

export async function dispatchAlertNotifications(alertId: string) {
  const alert = await db.alert.findUnique({
    where: { id: alertId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          marketplace: true,
          userId: true,
          notificationEmail: true
        }
      }
    }
  });

  if (!alert) {
    throw new Error("Alert not found");
  }

  const channels = await ensureProjectNotificationChannels(alert.projectId, alert.project.notificationEmail);

  for (const channel of channels) {
    if (channel.type === NotificationChannelType.INBOX) {
      await deliverInboxNotification(alert);
      continue;
    }

    if (
      channel.type === NotificationChannelType.FEISHU ||
      channel.type === NotificationChannelType.WECOM
    ) {
      await deliverWebhookNotification(alert, channel);
    }
  }
}

export async function retryFailedProjectWebhookDeliveries(projectId: string, options?: { limit?: number }) {
  const limit = options?.limit ?? 10;
  const failedDeliveries = await db.notificationDelivery.findMany({
    where: {
      projectId,
      channelType: {
        in: [NotificationChannelType.FEISHU, NotificationChannelType.WECOM]
      },
      status: NotificationDeliveryStatus.FAILED
    },
    include: {
      alert: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              marketplace: true
            }
          }
        }
      },
      channel: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const deduped = [] as typeof failedDeliveries;
  const seen = new Set<string>();

  for (const delivery of failedDeliveries) {
    const key = `${delivery.alertId}:${delivery.channelType}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(delivery);
    if (deduped.length >= limit) {
      break;
    }
  }

  const results = [] as Array<{
    deliveryId: string;
    alertId: string;
    channelType: NotificationChannelType;
    retried: boolean;
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    errorMessage?: string;
  }>;

  for (const delivery of deduped) {
    const channel = delivery.channel;

    if (!channel || channel.type === NotificationChannelType.INBOX || channel.type === NotificationChannelType.EMAIL) {
      results.push({
        deliveryId: delivery.id,
        alertId: delivery.alertId,
        channelType: delivery.channelType,
        retried: false,
        status: "SKIPPED",
        errorMessage: "Channel is unavailable for retry"
      });
      continue;
    }

    try {
      const status = await deliverWebhookNotification(delivery.alert as AlertWithProjectContext, channel, {
        deliveryId: delivery.id,
        retryCount: delivery.retryCount + 1
      });
      results.push({
        deliveryId: delivery.id,
        alertId: delivery.alertId,
        channelType: delivery.channelType,
        retried: true,
        status
      });
    } catch (error) {
      results.push({
        deliveryId: delivery.id,
        alertId: delivery.alertId,
        channelType: delivery.channelType,
        retried: true,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown retry error"
      });
    }
  }

  return {
    attempted: deduped.length,
    successCount: results.filter((item) => item.status === "SUCCESS").length,
    failedCount: results.filter((item) => item.status === "FAILED").length,
    skippedCount: results.filter((item) => item.status === "SKIPPED").length,
    results
  };
}

export async function retryDueWebhookDeliveries(options?: { limit?: number }) {
  const limit = options?.limit ?? 25;
  const deliveries = await db.notificationDelivery.findMany({
    where: {
      channelType: {
        in: [NotificationChannelType.FEISHU, NotificationChannelType.WECOM]
      },
      status: NotificationDeliveryStatus.FAILED,
      nextRetryAt: {
        lte: new Date()
      },
      retryCount: {
        lt: WEBHOOK_MAX_RETRY_COUNT
      }
    },
    include: {
      alert: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              marketplace: true
            }
          }
        }
      },
      channel: true
    },
    orderBy: { nextRetryAt: "asc" },
    take: limit
  });

  const results = [] as Array<{
    deliveryId: string;
    channelType: NotificationChannelType;
    status: NotificationDeliveryStatus;
    retryCount: number;
  }>;

  for (const delivery of deliveries) {
    if (!delivery.channel) {
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          nextRetryAt: null,
          lastRetriedAt: new Date(),
          errorMessage: "Channel is unavailable for retry"
        }
      });
      results.push({
        deliveryId: delivery.id,
        channelType: delivery.channelType,
        status: NotificationDeliveryStatus.SKIPPED,
        retryCount: delivery.retryCount
      });
      continue;
    }

    const status = await deliverWebhookNotification(delivery.alert as AlertWithProjectContext, delivery.channel, {
      deliveryId: delivery.id,
      retryCount: delivery.retryCount + 1
    });

    results.push({
      deliveryId: delivery.id,
      channelType: delivery.channelType,
      status,
      retryCount: delivery.retryCount + 1
    });
  }

  return {
    attempted: deliveries.length,
    successCount: results.filter((item) => item.status === NotificationDeliveryStatus.SUCCESS).length,
    failedCount: results.filter((item) => item.status === NotificationDeliveryStatus.FAILED).length,
    skippedCount: results.filter((item) => item.status === NotificationDeliveryStatus.SKIPPED).length,
    results
  };
}

export async function createProjectAlert(input: CreateProjectAlertInput) {
  const fingerprint = buildAlertFingerprint(input);
  const cooldownMinutes = getCooldownMinutes(input.type);
  const cooldownStart = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const recentAlerts = await db.alert.findMany({
    where: {
      projectId: input.projectId,
      trackedAsinId: input.trackedAsinId,
      type: input.type,
      createdAt: {
        gte: cooldownStart
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const duplicate = recentAlerts.find((alert) => {
    const recentFingerprint = JSON.stringify({
      type: alert.type,
      title: alert.title,
      message: alert.message ?? null,
      oldValue: alert.oldValue ?? null,
      newValue: alert.newValue ?? null,
      changeValue: alert.changeValue ?? null,
      payload: sortObjectDeep(alert.payload ?? null)
    });

    return recentFingerprint === fingerprint;
  });

  if (duplicate) {
    await db.alertSuppressionLog.create({
      data: {
        projectId: input.projectId,
        trackedAsinId: input.trackedAsinId,
        type: input.type,
        title: input.title,
        fingerprint,
        duplicateAlertId: duplicate.id,
        cooldownMinutes,
        payload: input.payload ?? undefined
      }
    });
    return duplicate;
  }

  const alert = await db.alert.create({
    data: {
      projectId: input.projectId,
      trackedAsinId: input.trackedAsinId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      oldValue: input.oldValue,
      newValue: input.newValue,
      changeValue: input.changeValue,
      payload: input.payload ?? undefined
    }
  });

  await dispatchAlertNotifications(alert.id);
  return alert;
}
