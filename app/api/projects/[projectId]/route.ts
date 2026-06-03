import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getProjectStats } from "@/server/services/project-stats";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";
import { deleteProjectWithSubscriptions } from "@/server/services/project-lifecycle";

const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(80).optional()
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

  const updatedProject = await db.project.update({
    where: { id: project.id },
    data: parsed.data
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
