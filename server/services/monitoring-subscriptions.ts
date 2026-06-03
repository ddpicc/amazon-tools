import { MonitoringSubscriptionType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { changeAsinMonitoringSubscriptions, subscribeAsinMonitoring } from "@/server/sorftime/subscriptions";

function buildDigest(values: string[]) {
  return values
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join("|");
}

export async function getAsinMonitoringSubscription(trackedAsinId: string) {
  return db.monitoringSubscription.findFirst({
    where: {
      trackedAsinId,
      type: MonitoringSubscriptionType.ASIN,
      enabled: true
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function markMonitoringSubscriptionPolled(
  subscriptionId: string,
  input: {
    lastBatchId?: string | null;
    externalStatus?: string | null;
    rawPayload?: Prisma.InputJsonValue;
  }
) {
  return db.monitoringSubscription.update({
    where: { id: subscriptionId },
    data: {
      lastBatchId: input.lastBatchId,
      externalStatus: input.externalStatus,
      rawPayload: input.rawPayload,
      lastSyncedAt: new Date()
    }
  });
}

export async function ensureAsinMonitoringSubscription(trackedAsinId: string) {
  const trackedAsin = await db.trackedAsin.findUnique({
    where: { id: trackedAsinId },
    include: {
      project: true
    }
  });

  if (!trackedAsin) {
    throw new Error("Tracked ASIN not found");
  }

  const asinDigest = buildDigest([trackedAsin.asin]);
  const existing = await db.monitoringSubscription.findUnique({
    where: {
      projectId_trackedAsinId_type: {
        projectId: trackedAsin.projectId,
        trackedAsinId: trackedAsin.id,
        type: MonitoringSubscriptionType.ASIN
      }
    }
  });

  if (existing && existing.enabled && existing.asinDigest === asinDigest) {
    return existing;
  }

  const subscription = await subscribeAsinMonitoring(trackedAsin.asin, trackedAsin.marketplace);

  const saved = await db.monitoringSubscription.upsert({
    where: {
      projectId_trackedAsinId_type: {
        projectId: trackedAsin.projectId,
        trackedAsinId: trackedAsin.id,
        type: MonitoringSubscriptionType.ASIN
      }
    },
    create: {
      projectId: trackedAsin.projectId,
      trackedAsinId: trackedAsin.id,
      type: MonitoringSubscriptionType.ASIN,
      enabled: true,
      asinDigest,
      rawPayload: subscription.rawPayload as Prisma.InputJsonValue,
      externalStatus: "ACTIVE",
      lastSyncedAt: new Date()
    },
    update: {
      enabled: true,
      asinDigest,
      rawPayload: subscription.rawPayload as Prisma.InputJsonValue,
      externalStatus: "ACTIVE",
      lastSyncedAt: new Date()
    }
  });

  await db.apiUsageLog.create({
    data: {
      projectId: trackedAsin.projectId,
      trackedAsinId: trackedAsin.id,
      apiName: "ASINSubscription",
      requestConsumed: subscription.requestConsumed,
      requestLeft: subscription.requestLeft,
      status: "SUCCESS",
      contextRef: `${trackedAsin.asin}:single-subscribe`
    }
  });

  return saved;
}

export async function batchEnsureAsinMonitoringSubscriptions(
  projectId: string,
  trackedAsins: Array<{
    id: string;
    asin: string;
    marketplace: string;
  }>
) {
  if (!trackedAsins.length) {
    return [];
  }

  const marketplace = trackedAsins[0]?.marketplace;
  const uniqueAsins = Array.from(new Set(trackedAsins.map((item) => item.asin.trim().toUpperCase()).filter(Boolean)));
  const subscription = await changeAsinMonitoringSubscriptions(uniqueAsins, marketplace, "subscribe");

  const saved = [] as Array<Awaited<ReturnType<typeof db.monitoringSubscription.upsert>>>;

  for (const trackedAsin of trackedAsins) {
    const asinDigest = buildDigest([trackedAsin.asin]);
    const item = await db.monitoringSubscription.upsert({
      where: {
        projectId_trackedAsinId_type: {
          projectId,
          trackedAsinId: trackedAsin.id,
          type: MonitoringSubscriptionType.ASIN
        }
      },
      create: {
        projectId,
        trackedAsinId: trackedAsin.id,
        type: MonitoringSubscriptionType.ASIN,
        enabled: true,
        asinDigest,
        rawPayload: (subscription.rawPayloads[0] ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        externalStatus: "ACTIVE",
        lastSyncedAt: new Date()
      },
      update: {
        enabled: true,
        asinDigest,
        rawPayload: (subscription.rawPayloads[0] ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        externalStatus: "ACTIVE",
        lastSyncedAt: new Date()
      }
    });
    saved.push(item);
  }

  await db.apiUsageLog.create({
    data: {
      projectId,
      apiName: "ASINSubscription",
      requestConsumed: subscription.requestConsumed,
      requestLeft: subscription.requestLeft,
      status: "SUCCESS",
      contextRef: `${subscription.asins.length}asins:${subscription.action}`
    }
  });

  return saved;
}

export async function batchRemoveAsinMonitoringSubscriptions(
  projectId: string,
  marketplace: string,
  asins: string[]
) {
  const uniqueAsins = Array.from(new Set(asins.map((asin) => asin.trim().toUpperCase()).filter(Boolean)));
  if (!uniqueAsins.length) {
    return {
      requestConsumed: 0,
      requestLeft: null
    };
  }

  const result = await changeAsinMonitoringSubscriptions(uniqueAsins, marketplace, "unsubscribe");

  await db.apiUsageLog.create({
    data: {
      projectId,
      apiName: "ASINSubscription",
      requestConsumed: result.requestConsumed,
      requestLeft: result.requestLeft,
      status: "SUCCESS",
      contextRef: `${result.asins.length}asins:${result.action}`
    }
  });

  return {
    requestConsumed: result.requestConsumed,
    requestLeft: result.requestLeft
  };
}
