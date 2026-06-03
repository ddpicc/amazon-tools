import { TrackedAsinRole } from "@prisma/client";
import { getShanghaiStartOfDay } from "@/lib/shanghai-time";
import { db } from "@/server/db";
import { diffDaysInclusive } from "@/server/services/project-monitoring-days";

export async function getProjectOverview(projectId: string) {
  const todayStart = getShanghaiStartOfDay(new Date());

  const [
    project,
    trackedAsinCount,
    ownAsinCount,
    competitorAsinCount,
    todayAlertCount,
    latestSnapshot,
    firstSnapshot,
    todayDigestRun
  ] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        createdAt: true
      }
    }),
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
    db.productSnapshot.findFirst({
      where: {
        trackedAsin: {
          projectId
        }
      },
      orderBy: {
        capturedAt: "desc"
      },
      select: {
        capturedAt: true
      }
    }),
    db.productSnapshot.findFirst({
      where: {
        trackedAsin: {
          projectId
        }
      },
      orderBy: {
        capturedAt: "asc"
      },
      select: {
        capturedAt: true
      }
    }),
    db.dailyDigestRun.findUnique({
      where: {
        projectId_digestDate: {
          projectId,
          digestDate: todayStart
        }
      },
      select: {
        status: true,
        sentAt: true
      }
    })
  ]);

  if (!project) {
    throw new Error("Project not found");
  }

  const monitoringStartedAt = firstSnapshot?.capturedAt ?? project.createdAt;

  return {
    monitoredDays: diffDaysInclusive(monitoringStartedAt, new Date()),
    monitoringStartedAt,
    trackedAsinCount,
    ownAsinCount,
    competitorAsinCount,
    todayAlertCount,
    latestSnapshotAt: latestSnapshot?.capturedAt ?? null,
    todayDigestStatus: todayDigestRun?.status ?? null,
    todayDigestSentAt: todayDigestRun?.sentAt ?? null
  };
}
