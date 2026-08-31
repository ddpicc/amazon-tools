import { Prisma } from "@prisma/client";
import { getShanghaiStartOfDay } from "@/lib/shanghai-time";
import { db } from "@/server/db";
import { fetchAsinSubscriptionCollection } from "@/server/sorftime/subscriptions";
import { getSorftimeSource } from "@/server/sorftime/adapter";
import {
  ensureAsinMonitoringSubscription,
  getAsinMonitoringSubscription,
  markMonitoringSubscriptionPolled
} from "@/server/services/monitoring-subscriptions";
import { formatOperationalError } from "@/server/services/failure-classification";
import { createManualSyncLimitError } from "@/server/services/billing/errors";
import { syncListingKeywords } from "@/server/services/sync-listing-keywords";
import { completeDataCapture, failDataCapture, startDataCapture, toDataSourceKind } from "@/server/services/data-captures";

type SyncTrackedAsinOptions = {
  skipManualLimit?: boolean;
  jobType?: string;
  skipKeywordSync?: boolean;
};

function normalizeDescriptionWithFallback(current: string, previous: string | null | undefined) {
  const normalizedCurrent = current.trim();
  if (normalizedCurrent) {
    return current;
  }

  const normalizedPrevious = previous?.trim();
  return normalizedPrevious ? previous! : current;
}

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

  const todayStart = getShanghaiStartOfDay(new Date());

  const todaysManualSyncCount = await db.syncJob.count({
    where: {
      trackedAsinId,
      status: { in: ["RUNNING", "SUCCESS"] },
      jobType: "manual_sync",
      scheduledAt: {
        gte: todayStart
      }
    }
  });

  if (!options.skipManualLimit && todaysManualSyncCount >= 1) {
    throw createManualSyncLimitError(1);
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

  let captureId: string | null = null;

  try {
    const ensuredAsinSubscription = await ensureAsinMonitoringSubscription(trackedAsinId);
    const asinSubscription = ensuredAsinSubscription ?? (await getAsinMonitoringSubscription(trackedAsinId));

    if (!asinSubscription) {
      throw new Error("ASIN monitoring subscription not found");
    }

    // The monitoring subscription is the authoritative product source. Record
    // the operation before requesting it so failures remain auditable.
    const capture = await startDataCapture({
      userId: trackedAsin.project.userId,
      projectId: trackedAsin.projectId,
      trackedAsinId,
      marketplace: trackedAsin.marketplace,
      apiName: "ASINSubscriptionCollection",
      sourceKind: toDataSourceKind(getSorftimeSource())
    });
    captureId = capture.id;
    const snapshot = await fetchAsinSubscriptionCollection(trackedAsin.asin, trackedAsin.marketplace);
    await completeDataCapture(capture.id, snapshot.rawPayload as Prisma.InputJsonValue, snapshot.data.capturedAt);
    const previousSnapshot = trackedAsin.snapshots[0] ?? null;
    const description = normalizeDescriptionWithFallback(snapshot.data.description, previousSnapshot?.description);

    await markMonitoringSubscriptionPolled(asinSubscription.id, {
      externalStatus: "POLLED",
      rawPayload: snapshot.rawPayload as Prisma.InputJsonValue
    }).catch(() => null);

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
        description,
        buyboxSeller: snapshot.data.buyboxSeller,
        buyboxSellerId: snapshot.data.buyboxSellerId,
        isFBA: snapshot.data.isFBA,
        fbaFee: snapshot.data.fbaFee,
        shipCost: snapshot.data.shipCost,
        dealType: snapshot.data.dealType,
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
        capturedAt: snapshot.data.capturedAt,
        captureId: capture.id
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
        contextRef: `${trackedAsin.asin}:${snapshot.source}:${options.jobType ?? "manual_sync"}`
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

    if (!options.skipKeywordSync) {
      await syncListingKeywords(trackedAsinId, createdSnapshot.capturedAt).catch(async (error) => {
        await db.apiUsageLog.create({
          data: {
            projectId: trackedAsin.projectId,
            trackedAsinId,
            apiName: "ASINRequestKeyword",
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Keyword collection failed",
            contextRef: trackedAsin.asin
          }
        });
      });
    }

    await db.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date()
      }
    });

    // The daily digest compares this durable snapshot with its predecessor and
    // reports every observed change. We deliberately do not classify changes
    // into alert levels or issue immediate notifications.
    return { snapshot: createdSnapshot };
  } catch (error) {
    const errorMessage = formatOperationalError(error, "Unknown sync error");
    if (captureId) await failDataCapture(captureId, error).catch(() => null);
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
