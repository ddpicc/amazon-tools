import { NotificationChannelType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";

const channelInputSchema = z.object({
  type: z.nativeEnum(NotificationChannelType),
  enabled: z.boolean().optional(),
  webhookUrl: z.string().trim().url().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  name: z.string().trim().min(1).max(80).nullable().optional()
});

const patchSchema = z.object({
  channels: z.array(channelInputSchema)
});

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id
    },
    select: {
      id: true,
      notificationEmail: true
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);
  return NextResponse.json({ channels });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id
    },
    select: {
      id: true,
      notificationEmail: true
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ensureProjectNotificationChannels(project.id, project.notificationEmail);

  await Promise.all(
    parsed.data.channels.map((channel) =>
      db.notificationChannel.upsert({
        where: {
          projectId_type: {
            projectId: project.id,
            type: channel.type
          }
        },
        create: {
          projectId: project.id,
          type: channel.type,
          enabled: channel.type === NotificationChannelType.INBOX ? true : channel.enabled ?? false,
          webhookUrl: channel.webhookUrl ?? null,
          email: channel.email ?? null,
          name: channel.name ?? null
        },
        update: {
          enabled: channel.type === NotificationChannelType.INBOX ? true : channel.enabled,
          webhookUrl: channel.webhookUrl,
          email: channel.email,
          name: channel.name
        }
      })
    )
  );

  const emailChannel = parsed.data.channels.find((channel) => channel.type === NotificationChannelType.EMAIL);
  if (emailChannel) {
    await db.project.update({
      where: { id: project.id },
      data: {
        notificationEmail: emailChannel.email ?? null
      }
    });
  }

  const channels = await db.notificationChannel.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ channels });
}
