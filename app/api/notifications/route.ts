import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await db.inboxNotification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { readAt: null } : {})
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          marketplace: true
        }
      },
      alert: {
        select: {
          id: true,
          severity: true,
          type: true,
          trackedAsinId: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const unreadCount = await db.inboxNotification.count({
    where: {
      userId: session.user.id,
      readAt: null
    }
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await request.json().catch(() => null)) as { notificationIds?: string[]; markAllRead?: boolean } | null;

  if (json?.markAllRead) {
    await db.inboxNotification.updateMany({
      where: {
        userId: session.user.id,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });
  } else if (json?.notificationIds?.length) {
    await db.inboxNotification.updateMany({
      where: {
        userId: session.user.id,
        id: { in: json.notificationIds }
      },
      data: {
        readAt: new Date()
      }
    });
  } else {
    return NextResponse.json({ error: "Missing notificationIds or markAllRead" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
