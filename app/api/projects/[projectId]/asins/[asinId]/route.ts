import { NextResponse } from "next/server";
import { TrackedAsinRole, TrackedAsinStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { batchEnsureAsinMonitoringSubscriptions, batchRemoveAsinMonitoringSubscriptions } from "@/server/services/monitoring-subscriptions";

const updateSchema = z.object({ role: z.nativeEnum(TrackedAsinRole).optional(), status: z.nativeEnum(TrackedAsinStatus).optional() });

async function ownedAsin(userId: string, projectId: string, asinId: string) {
  return db.trackedAsin.findFirst({ where: { id: asinId, projectId, project: { userId } }, select: { id: true, asin: true, marketplace: true, projectId: true, status: true } });
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; asinId: string } }) {
  const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success || (!parsed.data.role && !parsed.data.status)) return NextResponse.json({ error: "更新参数无效" }, { status: 400 });
  const tracked = await ownedAsin(session.user.id, params.projectId, params.asinId); if (!tracked) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    if (parsed.data.status === TrackedAsinStatus.PAUSED && tracked.status !== TrackedAsinStatus.PAUSED) {
      await batchRemoveAsinMonitoringSubscriptions(tracked.projectId, tracked.marketplace, [tracked.asin]);
      await db.monitoringSubscription.updateMany({ where: { trackedAsinId: tracked.id }, data: { enabled: false, externalStatus: "PAUSED" } });
    }
    if (parsed.data.status === TrackedAsinStatus.ACTIVE && tracked.status !== TrackedAsinStatus.ACTIVE) {
      await batchEnsureAsinMonitoringSubscriptions(tracked.projectId, [{ id: tracked.id, asin: tracked.asin, marketplace: tracked.marketplace }]);
    }
    const item = await db.trackedAsin.update({ where: { id: tracked.id }, data: parsed.data });
    return NextResponse.json({ item });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新监控对象失败" }, { status: 400 }); }
}

export async function DELETE(_request: Request, { params }: { params: { projectId: string; asinId: string } }) {
  const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tracked = await ownedAsin(session.user.id, params.projectId, params.asinId); if (!tracked) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    if (tracked.status === TrackedAsinStatus.ACTIVE) await batchRemoveAsinMonitoringSubscriptions(tracked.projectId, tracked.marketplace, [tracked.asin]);
    await db.trackedAsin.delete({ where: { id: tracked.id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "删除监控对象失败" }, { status: 400 }); }
}
