import { NotificationChannelType } from "@prisma/client";
import { db } from "@/server/db";

export async function ensureProjectNotificationChannels(projectId: string, notificationEmail?: string | null) {
  const existing = await db.notificationChannel.findMany({
    where: { projectId }
  });

  const existingByType = new Map(existing.map((channel) => [channel.type, channel]));

  const defaultChannels = [
    {
      type: NotificationChannelType.INBOX,
      enabled: true,
      name: "站内通知"
    },
    {
      type: NotificationChannelType.FEISHU,
      enabled: false,
      name: "飞书 Webhook"
    },
    {
      type: NotificationChannelType.WECOM,
      enabled: false,
      name: "企业微信 Webhook"
    },
    {
      type: NotificationChannelType.EMAIL,
      enabled: Boolean(notificationEmail),
      name: "邮件通知",
      email: notificationEmail ?? null
    }
  ];

  await Promise.all(
    defaultChannels.map((channel) => {
      if (existingByType.has(channel.type)) {
        if (channel.type === NotificationChannelType.EMAIL && notificationEmail) {
          return db.notificationChannel.update({
            where: {
              projectId_type: {
                projectId,
                type: channel.type
              }
            },
            data: {
              email: notificationEmail
            }
          });
        }

        return Promise.resolve(existingByType.get(channel.type));
      }

      return db.notificationChannel.create({
        data: {
          projectId,
          type: channel.type,
          enabled: channel.enabled,
          name: channel.name,
          email: "email" in channel ? channel.email : null
        }
      });
    })
  );

  return db.notificationChannel.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" }
  });
}
