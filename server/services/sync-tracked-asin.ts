import { Prisma } from "@prisma/client";
import { getShanghaiStartOfDay } from "@/lib/shanghai-time";
import { db } from "@/server/db";
import { fetchAsinSubscriptionCollection } from "@/server/sorftime/subscriptions";
import {
  ensureAsinMonitoringSubscription,
  getAsinMonitoringSubscription,
  markMonitoringSubscriptionPolled
} from "@/server/services/monitoring-subscriptions";
import { formatOperationalError } from "@/server/services/failure-classification";
import { generateAlertsForSnapshot } from "@/server/services/generate-alerts";

type SyncTrackedAsinOptions = {
  skipManualLimit?: boolean;
  jobType?: string;
};

function toNullableJsonValue(value: Prisma.InputJsonValue | null | undefined) {
  return value === null || value === undefined ? Prisma.JsonNull : value;
}

export async function syncTrackedAsin(trackedAsinId: string, options: SyncTrackedAsinOptions = {}) {
  const trackedAsin = await db.trackedAsin.findUnique({
    where: { id: trackedAsinId },
    include: {
      project: { include: { settings: true } },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1
      }
    }
  });

  if (!trackedAsin) {
    throw new Error("Tracked ASIN not found");
  }

  const manualRefreshLimit = trackedAsin.project.settings?.manualRefreshLimitPerDay ?? 10;
  const todayStart = getShanghaiStartOfDay(new Date());

  const todaysManualSyncCount = await db.syncJob.count({
    where: {
      projectId: trackedAsin.projectId,
      status: { in: ["RUNNING", "SUCCESS"] },
      jobType: "manual_sync",
      scheduledAt: {
        gte: todayStart
      }
    }
  });

  if (!options.skipManualLimit && todaysManualSyncCount >= manualRefreshLimit) {
    throw new Error(`Manual sync limit reached for today (${manualRefreshLimit})`);
  }

  const syncJob = await db.syncJob.create({
    data: {
      projectId: trackedAsin.projectId,
      trackedAsinId,
      jobType: options.jobType ?? "manual_sync",
      status: "RUNNING",
      attemptCount: 1,
      scheduledAt: new Date(),
      startedAt: new Date()
    }
  });

  try {
    const ensuredAsinSubscription = await ensureAsinMonitoringSubscription(trackedAsinId);
    const asinSubscription = ensuredAsinSubscription ?? (await getAsinMonitoringSubscription(trackedAsinId));

    if (!asinSubscription) {
      throw new Error("ASIN monitoring subscription not found");
    }

    const snapshot = await fetchAsinSubscriptionCollection(trackedAsin.asin, trackedAsin.marketplace);

    await markMonitoringSubscriptionPolled(asinSubscription.id, {
      externalStatus: "POLLED",
      rawPayload: snapshot.rawPayload as Prisma.InputJsonValue
    }).catch(() => null);

    const latestSnapshot = trackedAsin.snapshots[0] ?? null;
    const createdSnapshot = await db.productSnapshot.create({
      data: {
        trackedAsinId,
        storeName: snapshot.data.storeName,
        asinSalesCount: snapshot.data.asinSalesCount,
        parentAsin: snapshot.data.parentAsin,
        price: snapshot.data.price,
        listPrice: snapshot.data.listPrice,
        listingSaleCount: snapshot.data.listingSaleCount,
        listingSaleCountOfDaily: toNullableJsonValue(snapshot.data.listingSaleCountOfDaily),
        coupon: snapshot.data.coupon,
        rating: snapshot.data.rating,
        reviewCount: snapshot.data.reviewCount,
        bsr: snapshot.data.bsr,
        bsrCategory: toNullableJsonValue(snapshot.data.bsrCategory),
        sellerCount: snapshot.data.sellerCount,
        variantCount: snapshot.data.variantCount,
        stockStatus: snapshot.data.stockStatus,
        title: snapshot.data.title,
        photoUrls: toNullableJsonValue(snapshot.data.photoUrls),
        ebcPhotoUrls: toNullableJsonValue(snapshot.data.ebcPhotoUrls),
        brand: snapshot.data.brand,
        description: snapshot.data.description,
        buyboxSeller: snapshot.data.buyboxSeller,
        buyboxSellerId: snapshot.data.buyboxSellerId,
        isFBA: snapshot.data.isFBA,
        shipCost: snapshot.data.shipCost,
        onlineDate: snapshot.data.onlineDate,
        onlineDays: snapshot.data.onlineDays,
        category: snapshot.data.category,
        categoryNodeId: snapshot.data.categoryNodeId,
        hasVideo: snapshot.data.hasVideo,
        aPlus: snapshot.data.aPlus,
        hasBrandStore: snapshot.data.hasBrandStore,
        packageSize: toNullableJsonValue(snapshot.data.packageSize),
        weightGrams: snapshot.data.weightGrams,
        extraSavings: toNullableJsonValue(snapshot.data.extraSavings),
        properties: toNullableJsonValue(snapshot.data.properties),
        rawPayload: toNullableJsonValue(snapshot.rawPayload as Prisma.InputJsonValue | null),
        capturedAt: snapshot.data.capturedAt
      }
    });

    await db.apiUsageLog.create({
      data: {
        projectId: trackedAsin.projectId,
        trackedAsinId,
        apiName: snapshot.apiName,
        requestConsumed: snapshot.requestConsumed,
        requestLeft: snapshot.requestLeft,
        status: "SUCCESS",
        contextRef: `${trackedAsin.asin}:${snapshot.source}`
      }
    });

    await db.trackedAsin.update({
      where: { id: trackedAsinId },
      data: {
        title: snapshot.data.title,
        brand: snapshot.data.brand,
        category: snapshot.data.category,
        consecutiveFailures: 0,
        lastSyncedAt: snapshot.data.capturedAt,
        lastSuccessAt: snapshot.data.capturedAt
      }
    });

    const alerts = latestSnapshot ? await generateAlertsForSnapshot(trackedAsinId) : [];

    await db.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date()
      }
    });

    return { snapshot: createdSnapshot, alerts };
  } catch (error) {
    const errorMessage = formatOperationalError(error, "Unknown sync error");
    await db.apiUsageLog.create({
      data: {
        projectId: trackedAsin.projectId,
        trackedAsinId,
        apiName: "ASINSubscriptionCollection",
        requestConsumed: 1,
        requestLeft: null,
        status: "FAILED",
        errorMessage,
        contextRef: trackedAsin.asin
      }
    });

    await db.trackedAsin.update({
      where: { id: trackedAsinId },
      data: {
        consecutiveFailures: { increment: 1 },
        lastSyncedAt: new Date()
      }
    });

    await db.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage
      }
    });

    throw error;
  }
}
