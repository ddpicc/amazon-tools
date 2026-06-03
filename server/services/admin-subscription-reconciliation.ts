import "server-only";
import { db } from "@/server/db";
import { queryAsinMonitoringSubscriptions } from "@/server/sorftime/subscriptions";

type LocalAsinReference = {
  projectId: string;
  projectName: string;
  userEmail: string;
  userName: string | null;
  marketplace: string;
};

export type AdminSubscriptionReconciliationRow = {
  asin: string;
  inSorftime: boolean;
  inLocal: boolean;
  localReferences: LocalAsinReference[];
  mismatch: boolean;
};

export async function getAdminSubscriptionReconciliation() {
  const [sorftimeResult, localTrackedAsins] = await Promise.all([
    queryAsinMonitoringSubscriptions("US"),
    db.trackedAsin.findMany({
      where: {
        marketplace: "US"
      },
      orderBy: [
        { asin: "asc" },
        { createdAt: "asc" }
      ],
      select: {
        asin: true,
        marketplace: true,
        project: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    })
  ]);

  const sorftimeAsins = Array.from(
    new Set(sorftimeResult.data.map((item) => item.asin.trim().toUpperCase()).filter(Boolean))
  ).sort();

  const localByAsin = new Map<string, LocalAsinReference[]>();

  for (const item of localTrackedAsins) {
    const asin = item.asin.trim().toUpperCase();
    if (!asin) {
      continue;
    }

    const references = localByAsin.get(asin) ?? [];
    references.push({
      projectId: item.project.id,
      projectName: item.project.name,
      userEmail: item.project.user.email,
      userName: item.project.user.name,
      marketplace: item.marketplace
    });
    localByAsin.set(asin, references);
  }

  const allAsins = Array.from(new Set([...sorftimeAsins, ...localByAsin.keys()])).sort();
  const sorftimeSet = new Set(sorftimeAsins);

  const rows: AdminSubscriptionReconciliationRow[] = allAsins.map((asin) => {
    const localReferences = localByAsin.get(asin) ?? [];
    const inSorftime = sorftimeSet.has(asin);
    const inLocal = localReferences.length > 0;

    return {
      asin,
      inSorftime,
      inLocal,
      localReferences,
      mismatch: inSorftime !== inLocal
    };
  });

  return {
    marketplace: "US",
    sorftimeCount: sorftimeAsins.length,
    localCount: localByAsin.size,
    mismatchCount: rows.filter((row) => row.mismatch).length,
    rows
  };
}
