import { NotificationChannelType, NotificationDeliveryStatus } from "@prisma/client";
import { db } from "@/server/db";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";
import { sendEmailMessage } from "@/server/services/email-delivery";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function severityTone(severity: string) {
  if (severity === "CRITICAL") {
    return {
      bg: "#7f1d1d",
      fg: "#fecaca",
      border: "#ef4444"
    };
  }

  if (severity === "WARNING") {
    return {
      bg: "#78350f",
      fg: "#fde68a",
      border: "#f59e0b"
    };
  }

  return {
    bg: "#0f3b4c",
    fg: "#bae6fd",
    border: "#38bdf8"
  };
}

function buildDigestHtml(input: {
  title: string;
  projectName: string;
  marketplace: string;
  digestDateLabel: string;
  activeAsinCount: number;
  counts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  latestPollLabel: string;
  importantAlerts: Array<{
    asin: string;
    title: string;
    message: string | null;
    severity: string;
  }>;
}) {
  const alertItems = input.importantAlerts.length
    ? input.importantAlerts
        .map((alert) => {
          const tone = severityTone(alert.severity);
          return `
            <tr>
              <td style="padding: 0 0 14px 0;">
                <div style="border: 1px solid #27272a; border-left: 4px solid ${tone.border}; border-radius: 14px; background: #111113; padding: 16px 18px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div style="font-size: 15px; line-height: 22px; font-weight: 600; color: #fafafa;">
                      ${escapeHtml(alert.asin)} · ${escapeHtml(alert.title)}
                    </div>
                    <span style="display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: ${tone.fg}; background: ${tone.bg};">
                      ${escapeHtml(alert.severity)}
                    </span>
                  </div>
                  ${alert.message ? `<div style="margin-top: 8px; font-size: 13px; line-height: 20px; color: #a1a1aa;">${escapeHtml(alert.message)}</div>` : ""}
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td style="padding: 0;">
          <div style="border: 1px dashed #3f3f46; border-radius: 14px; background: #111113; padding: 18px; font-size: 14px; line-height: 22px; color: #a1a1aa;">
            今日没有新增异常，监控状态稳定。
          </div>
        </td>
      </tr>
    `;

  return `
    <!doctype html>
    <html lang="zh-CN">
      <body style="margin: 0; padding: 0; background: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #09090b; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; background: #18181b; border: 1px solid #27272a; border-radius: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 28px 20px; background: linear-gradient(135deg, rgba(245,158,11,0.16), rgba(24,24,27,1));">
                    <div style="font-size: 12px; line-height: 18px; letter-spacing: 0.14em; text-transform: uppercase; color: #fbbf24;">Amazon Tools Daily Digest</div>
                    <div style="margin-top: 10px; font-size: 28px; line-height: 34px; font-weight: 700; color: #fafafa;">${escapeHtml(input.projectName)}</div>
                    <div style="margin-top: 6px; font-size: 14px; line-height: 22px; color: #d4d4d8;">${escapeHtml(input.marketplace)} · ${escapeHtml(input.digestDateLabel)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 28px 10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding: 0 8px 16px 0;">
                          <div style="border-radius: 18px; background: #111113; border: 1px solid #27272a; padding: 18px;">
                            <div style="font-size: 12px; line-height: 18px; color: #a1a1aa;">活跃 ASIN</div>
                            <div style="margin-top: 8px; font-size: 28px; line-height: 32px; font-weight: 700; color: #fbbf24;">${input.activeAsinCount}</div>
                          </div>
                        </td>
                        <td width="50%" style="padding: 0 0 16px 8px;">
                          <div style="border-radius: 18px; background: #111113; border: 1px solid #27272a; padding: 18px;">
                            <div style="font-size: 12px; line-height: 18px; color: #a1a1aa;">今日新增异常</div>
                            <div style="margin-top: 8px; font-size: 28px; line-height: 32px; font-weight: 700; color: #fafafa;">${input.counts.total}</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0 0 16px;">
                          <div style="border-radius: 18px; background: #111113; border: 1px solid #27272a; padding: 18px;">
                            <div style="font-size: 12px; line-height: 18px; color: #a1a1aa;">异常分布</div>
                            <div style="margin-top: 10px; font-size: 14px; line-height: 22px; color: #e4e4e7;">
                              CRITICAL ${input.counts.critical} / WARNING ${input.counts.warning} / INFO ${input.counts.info}
                            </div>
                            <div style="margin-top: 8px; font-size: 13px; line-height: 20px; color: #a1a1aa;">
                              最近轮询：${escapeHtml(input.latestPollLabel)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 28px 28px;">
                    <div style="font-size: 18px; line-height: 26px; font-weight: 600; color: #fafafa; margin-bottom: 14px;">重点变化</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${alertItems}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildWebhookPayload(text: string, channelType: NotificationChannelType) {
  if (channelType === NotificationChannelType.FEISHU) {
    return {
      msg_type: "text",
      content: { text }
    };
  }

  if (channelType === NotificationChannelType.WECOM) {
    return {
      msgtype: "text",
      text: { content: text }
    };
  }

  return { text };
}

async function sendDigestToWebhook(channel: { webhookUrl: string; type: NotificationChannelType }, text: string) {
  const response = await fetch(channel.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildWebhookPayload(text, channel.type))
  });

  const responseBody = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`Webhook responded with status ${response.status}${responseBody ? ` | ${responseBody}` : ""}`);
  }
}

async function buildProjectDigest(projectId: string, digestDate: Date) {
  const from = startOfDay(digestDate);
  const to = endOfDay(digestDate);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      settings: true,
      trackedAsins: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          asin: true,
          role: true
        }
      }
    }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const [alerts, latestPollJob] = await Promise.all([
    db.alert.findMany({
      where: {
        projectId,
        createdAt: {
          gte: from,
          lt: to
        }
      },
      include: {
        trackedAsin: {
          select: {
            asin: true
          }
        }
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50
    }),
    db.syncJob.findFirst({
      where: {
        projectId,
        jobType: "monitoring_poll_project"
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const counts = {
    total: alerts.length,
    critical: alerts.filter((item) => item.severity === "CRITICAL").length,
    warning: alerts.filter((item) => item.severity === "WARNING").length,
    info: alerts.filter((item) => item.severity === "INFO").length
  };

  const importantAlerts = alerts.slice(0, 5);
  const digestDateLabel = from.toLocaleDateString("zh-CN");
  const title = `[日报] ${project.marketplace} · ${project.name} · ${digestDateLabel}`;
  const latestPollLabel = latestPollJob
    ? `${latestPollJob.status}${latestPollJob.errorMessage ? ` · ${latestPollJob.errorMessage}` : ""}`
    : "暂无记录";
  const lines = [
    title,
    `活跃 ASIN: ${project.trackedAsins.length}`,
    `今日新增异常: ${counts.total} 条`,
    `CRITICAL ${counts.critical} / WARNING ${counts.warning} / INFO ${counts.info}`,
    `最近轮询: ${latestPollLabel}`,
    importantAlerts.length ? "重点变化:" : "重点变化: 今日无新增异常"
  ];

  for (const alert of importantAlerts) {
    lines.push(`- ${alert.trackedAsin.asin}: ${alert.title}`);
  }

  return {
    project,
    title,
    summary: lines.join("\n"),
    html: buildDigestHtml({
      title,
      projectName: project.name,
      marketplace: project.marketplace,
      digestDateLabel,
      activeAsinCount: project.trackedAsins.length,
      counts,
      latestPollLabel,
      importantAlerts: importantAlerts.map((alert) => ({
        asin: alert.trackedAsin.asin,
        title: alert.title,
        message: alert.message,
        severity: alert.severity
      }))
    })
  };
}

export async function sendProjectDailyDigest(projectId: string, digestDate = new Date()) {
  const normalizedDate = startOfDay(digestDate);
  const existing = await db.dailyDigestRun.findUnique({
    where: {
      projectId_digestDate: {
        projectId,
        digestDate: normalizedDate
      }
    }
  });

  if (existing?.status === "SUCCESS") {
    return {
      skipped: true,
      reason: "already_sent",
      run: existing
    };
  }

  const { project, title, summary, html } = await buildProjectDigest(projectId, normalizedDate);
  const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);
  const externalChannels = channels.filter(
    (channel) =>
      channel.enabled &&
      ((channel.type === NotificationChannelType.FEISHU && Boolean(channel.webhookUrl)) ||
        (channel.type === NotificationChannelType.WECOM && Boolean(channel.webhookUrl)) ||
        (channel.type === NotificationChannelType.EMAIL && Boolean(channel.email)))
  );

  if (!externalChannels.length) {
    const run = await db.dailyDigestRun.upsert({
      where: {
        projectId_digestDate: {
          projectId,
          digestDate: normalizedDate
        }
      },
      create: {
        projectId,
        digestDate: normalizedDate,
        status: "SKIPPED",
        summary,
        channelResults: [],
        errorMessage: "No enabled delivery channels",
        sentAt: null
      },
      update: {
        status: "SKIPPED",
        summary,
        channelResults: [],
        errorMessage: "No enabled delivery channels",
        sentAt: null
      }
    });

    return {
      skipped: true,
      reason: "no_delivery_channels",
      run
    };
  }

  const channelResults = [] as Array<{
    type: NotificationChannelType;
    status: NotificationDeliveryStatus;
    errorMessage?: string;
  }>;

  for (const channel of externalChannels) {
    try {
      if (channel.type === NotificationChannelType.EMAIL) {
        if (!channel.email) {
          channelResults.push({
            type: channel.type,
            status: NotificationDeliveryStatus.SKIPPED,
            errorMessage: "Email address is not configured"
          });
          continue;
        }

        await sendEmailMessage({
          to: channel.email,
          subject: title,
          text: summary,
          html,
          senderType: "digest"
        });
        channelResults.push({
          type: channel.type,
          status: NotificationDeliveryStatus.SUCCESS
        });
        continue;
      }

      if (!channel.webhookUrl) {
        channelResults.push({
          type: channel.type,
          status: NotificationDeliveryStatus.SKIPPED,
          errorMessage: "Webhook URL is not configured"
        });
        continue;
      }

      await sendDigestToWebhook(
        {
          webhookUrl: channel.webhookUrl,
          type: channel.type
        },
        summary
      );

      channelResults.push({
        type: channel.type,
        status: NotificationDeliveryStatus.SUCCESS
      });
    } catch (error) {
      channelResults.push({
        type: channel.type,
        status: NotificationDeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown digest delivery error"
      });
    }
  }

  const successCount = channelResults.filter((item) => item.status === NotificationDeliveryStatus.SUCCESS).length;
  const failedCount = channelResults.filter((item) => item.status === NotificationDeliveryStatus.FAILED).length;
  const status =
    successCount > 0 ? "SUCCESS" : failedCount > 0 ? "FAILED" : "SKIPPED";

  const run = await db.dailyDigestRun.upsert({
    where: {
      projectId_digestDate: {
        projectId,
        digestDate: normalizedDate
      }
    },
    create: {
      projectId,
      digestDate: normalizedDate,
      status,
      summary,
      channelResults,
      errorMessage: failedCount ? `${failedCount} channels failed` : null,
      sentAt: successCount > 0 ? new Date() : null
    },
    update: {
      status,
      summary,
      channelResults,
      errorMessage: failedCount ? `${failedCount} channels failed` : null,
      sentAt: successCount > 0 ? new Date() : null
    }
  });

  return {
    skipped: false,
    run,
    successCount,
    failedCount,
    channelResults
  };
}

export async function runDueDailyDigests(options?: { limit?: number; digestDate?: Date }) {
  const limit = options?.limit ?? 20;
  const digestDate = startOfDay(options?.digestDate ?? new Date());
  const projects = await db.project.findMany({
    where: {
      trackedAsins: {
        some: {
          status: "ACTIVE"
        }
      }
    },
    select: {
      id: true,
      name: true
    },
    orderBy: { updatedAt: "asc" },
    take: limit
  });

  const results = [] as Array<{
    projectId: string;
    projectName: string;
    status: string;
    reason?: string;
  }>;

  for (const project of projects) {
    const result = await sendProjectDailyDigest(project.id, digestDate);
    results.push({
      projectId: project.id,
      projectName: project.name,
      status: result.skipped ? "SKIPPED" : result.run?.status ?? "FAILED",
      reason: result.skipped ? result.reason : undefined
    });
  }

  return {
    digestDate,
    attempted: projects.length,
    results
  };
}
