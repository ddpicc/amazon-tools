import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isDailyDigestTimeValid } from "@/lib/project-schedule";
import { db } from "@/server/db";
import { getProjectStats } from "@/server/services/project-stats";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";
import { deleteProjectWithSubscriptions } from "@/server/services/project-lifecycle";

const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  dailyDigestSendTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
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
    include: {
      trackedAsins: {
        orderBy: { updatedAt: "desc" }
      },
      alerts: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      settings: true,
      notificationChannels: {
        orderBy: { createdAt: "asc" }
      },
      monitoringSubscriptions: {
        orderBy: [{ type: "asc" }, { updatedAt: "desc" }]
      },
      inboxNotifications: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              marketplace: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  project.notificationChannels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);
  const stats = await getProjectStats(project.id);
  return NextResponse.json({ project, stats });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id
    },
    select: { id: true }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let dailyDigestTimeData:
    | {
        dailyDigestSendHour: number;
        dailyDigestSendMinute: number;
      }
    | undefined;

  if (parsed.data.dailyDigestSendTime) {
    const [hourText, minuteText] = parsed.data.dailyDigestSendTime.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return NextResponse.json({ error: "Invalid daily digest time" }, { status: 400 });
    }

    if (!isDailyDigestTimeValid(hour, minute)) {
      return NextResponse.json({ error: "Daily digest time must be later than 08:00" }, { status: 400 });
    }

    dailyDigestTimeData = {
      dailyDigestSendHour: hour,
      dailyDigestSendMinute: minute
    };
  }

  const updatedProject = await db.project.update({
    where: { id: project.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(dailyDigestTimeData
        ? {
            settings: {
              upsert: {
                create: dailyDigestTimeData,
                update: dailyDigestTimeData
              }
            }
          }
        : {})
    },
    include: {
      settings: true
    }
  });

  return NextResponse.json({ project: updatedProject });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deleteProjectWithSubscriptions(params.projectId, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Project deletion failed" },
      { status: 400 }
    );
  }
}
