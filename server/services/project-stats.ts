import { TrackedAsinRole } from "@prisma/client";
import { db } from "@/server/db";

export async function getProjectStats(projectId: string) {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [trackedAsinCount, ownAsinCount, competitorAsinCount, todayAlertCount, lastSync] = await Promise.all([
    db.trackedAsin.count({ where: { projectId } }),
    db.trackedAsin.count({ where: { projectId, role: TrackedAsinRole.OWN } }),
    db.trackedAsin.count({ where: { projectId, role: TrackedAsinRole.COMPETITOR } }),
    db.alert.count({
      where: {
        projectId,
        createdAt: {
          gte: todayStart
        }
      }
    }),
    db.trackedAsin.findFirst({
      where: { projectId },
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true }
    })
  ]);

  return {
    trackedAsinCount,
    ownAsinCount,
    competitorAsinCount,
    todayAlertCount,
    lastSyncAt: lastSync?.lastSyncedAt ?? null
  };
}
