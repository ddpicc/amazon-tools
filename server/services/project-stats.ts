import { TrackedAsinRole } from "@prisma/client";
import { getShanghaiStartOfDay } from "@/lib/shanghai-time";
import { db } from "@/server/db";

export async function getProjectStats(projectId: string) {
  const todayStart = getShanghaiStartOfDay(new Date());

  const [trackedAsinCount, ownAsinCount, competitorAsinCount, todayAlertCount, lastSync] = await Promise.all([
    db.trackedAsin.count({ where: { projectId, status: "ACTIVE" } }),
    db.trackedAsin.count({ where: { projectId, status: "ACTIVE", role: TrackedAsinRole.OWN } }),
    db.trackedAsin.count({ where: { projectId, status: "ACTIVE", role: TrackedAsinRole.COMPETITOR } }),
    db.alert.count({
      where: {
        projectId,
        createdAt: {
          gte: todayStart
        }
      }
    }),
    db.trackedAsin.findFirst({
      where: { projectId, status: "ACTIVE", lastSuccessAt: { not: null } },
      orderBy: { lastSuccessAt: "desc" },
      select: { lastSuccessAt: true }
    })
  ]);

  return {
    trackedAsinCount,
    ownAsinCount,
    competitorAsinCount,
    todayAlertCount,
    lastSyncAt: lastSync?.lastSuccessAt ?? null
  };
}
