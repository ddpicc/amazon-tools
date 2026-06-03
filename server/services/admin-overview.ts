import "server-only";
import { db } from "@/server/db";
import { querySorftimeCoinBalance } from "@/server/sorftime/account";

export async function getAdminOverview() {
  const [
    userCount,
    projectCount,
    trackedAsinCount,
    activeSubscriptionCount,
    latestUser,
    latestProject,
    sorftimeCoinResult
  ] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.trackedAsin.count(),
    db.monitoringSubscription.count({
      where: {
        enabled: true
      }
    }),
    db.user.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true
      }
    }),
    db.project.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true
      }
    }),
    querySorftimeCoinBalance()
  ]);

  return {
    userCount,
    projectCount,
    trackedAsinCount,
    activeSubscriptionCount,
    sorftimeCoins: sorftimeCoinResult.data,
    sorftimeRequestLeft: sorftimeCoinResult.requestLeft,
    latestUserAt: latestUser?.createdAt ?? null,
    latestProjectAt: latestProject?.createdAt ?? null
  };
}
