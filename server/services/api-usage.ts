import { db } from "@/server/db";

export async function getProjectApiUsage(projectId: string) {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [todayRequestConsumed, recentLogs, byApi] = await Promise.all([
    db.apiUsageLog.aggregate({
      where: {
        projectId,
        calledAt: {
          gte: todayStart
        }
      },
      _sum: {
        requestConsumed: true
      }
    }),
    db.apiUsageLog.findMany({
      where: { projectId },
      orderBy: { calledAt: "desc" },
      take: 12,
      include: {
        trackedAsin: {
          select: {
            asin: true
          }
        }
      }
    }),
    db.apiUsageLog.groupBy({
      by: ["apiName"],
      where: { projectId },
      _sum: {
        requestConsumed: true
      },
      _count: true,
      orderBy: {
        _sum: {
          requestConsumed: "desc"
        }
      }
    })
  ]);

  return {
    todayRequestConsumed: todayRequestConsumed._sum.requestConsumed ?? 0,
    byApi: byApi.map((item) => ({
      apiName: item.apiName,
      requestConsumed: item._sum.requestConsumed ?? 0,
      callCount: item._count
    })),
    recentLogs: recentLogs.map((log) => ({
      id: log.id,
      apiName: log.apiName,
      requestConsumed: log.requestConsumed,
      status: log.status,
      errorMessage: log.errorMessage,
      contextRef: log.contextRef,
      asin: log.trackedAsin?.asin ?? null,
      calledAt: log.calledAt
    }))
  };
}
