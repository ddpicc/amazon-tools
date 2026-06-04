import { MonitoringSubscriptionType, Prisma, TrackedAsinRole } from "@prisma/client";
import { db } from "@/server/db";
import { fetchAsinSubscriptionCollection } from "@/server/sorftime/subscriptions";
import {
  batchEnsureAsinMonitoringSubscriptions,
  batchRemoveAsinMonitoringSubscriptions
} from "@/server/services/monitoring-subscriptions";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";

function toNullableJsonValue(value: Prisma.InputJsonValue | null | undefined) {
  return value === null || value === undefined ? Prisma.JsonNull : value;
}

function normalizeDescriptionWithFallback(current: string, previous: string | null | undefined) {
  const normalizedCurrent = current.trim();
  if (normalizedCurrent) {
    return current;
  }

  const normalizedPrevious = previous?.trim();
  return normalizedPrevious ? previous! : current;
}

type InitializeProjectInput = {
  userId: string;
  name: string;
  marketplace: string;
  ownAsins: string[];
  competitorAsins: string[];
};

export async function initializeProjectWithSubscriptions(input: InitializeProjectInput) {
  const project = await db.project.create({
    data: {
      userId: input.userId,
      name: input.name,
      marketplace: input.marketplace,
      settings: {
        create: {}
      },
      trackedAsins: {
        create: [
          ...input.ownAsins.map((asin) => ({
            asin,
            marketplace: input.marketplace,
            role: TrackedAsinRole.OWN
          })),
          ...input.competitorAsins.map((asin) => ({
            asin,
            marketplace: input.marketplace,
            role: TrackedAsinRole.COMPETITOR
          }))
        ]
      }
    },
    include: {
      trackedAsins: true,
      settings: true,
      notificationChannels: true
    }
  });

  try {
    const trackedAsinByAsin = new Map(project.trackedAsins.map((trackedAsin) => [trackedAsin.asin, trackedAsin]));
    const orderedTrackedAsins = [
      ...input.ownAsins.map((asin) => trackedAsinByAsin.get(asin)).filter(Boolean),
      ...input.competitorAsins.map((asin) => trackedAsinByAsin.get(asin)).filter(Boolean)
    ];

    await batchEnsureAsinMonitoringSubscriptions(
      project.id,
      orderedTrackedAsins.map((trackedAsin) => ({
        id: trackedAsin!.id,
        asin: trackedAsin!.asin,
        marketplace: trackedAsin!.marketplace
      }))
    );

    for (const trackedAsin of orderedTrackedAsins) {
      if (!trackedAsin) {
        continue;
      }

      const snapshot = await fetchAsinSubscriptionCollection(trackedAsin.asin, trackedAsin.marketplace);
      const previousSnapshot = await db.productSnapshot.findFirst({
        where: { trackedAsinId: trackedAsin.id },
        orderBy: { capturedAt: "desc" },
        select: { description: true }
      });
      const description = normalizeDescriptionWithFallback(snapshot.data.description, previousSnapshot?.description);

      await db.productSnapshot.create({
        data: {
          trackedAsinId: trackedAsin.id,
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
          projectId: project.id,
          trackedAsinId: trackedAsin.id,
          apiName: snapshot.apiName,
          requestConsumed: snapshot.requestConsumed,
          requestLeft: snapshot.requestLeft,
          status: "SUCCESS",
          contextRef: `${trackedAsin.asin}:${snapshot.source}:initial`
        }
      });

      await db.trackedAsin.update({
        where: { id: trackedAsin.id },
        data: {
          title: snapshot.data.title,
          brand: snapshot.data.brand,
          category: snapshot.data.category,
          consecutiveFailures: 0,
          lastSyncedAt: snapshot.data.capturedAt,
          lastSuccessAt: snapshot.data.capturedAt
        }
      });
    }

    const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);

    return {
      ...project,
      notificationChannels: channels
    };
  } catch (error) {
    await batchRemoveAsinMonitoringSubscriptions(
      project.id,
      input.marketplace,
      [...input.ownAsins, ...input.competitorAsins]
    ).catch(() => null);
    await db.project.delete({
      where: { id: project.id }
    }).catch(() => null);
    throw error;
  }
}

export async function deleteProjectWithSubscriptions(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId
    },
    include: {
      trackedAsins: {
        where: { status: "ACTIVE" },
        orderBy: [{ role: "asc" }, { asin: "asc" }]
      },
      monitoringSubscriptions: {
        where: {
          type: MonitoringSubscriptionType.ASIN,
          enabled: true
        }
      }
    }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const asins = project.trackedAsins
    .filter((trackedAsin) =>
      project.monitoringSubscriptions.some((subscription) => subscription.trackedAsinId === trackedAsin.id)
    )
    .map((trackedAsin) => trackedAsin.asin);

  await batchRemoveAsinMonitoringSubscriptions(project.id, project.marketplace, asins);

  await db.project.delete({
    where: { id: project.id }
  });

  return { ok: true };
}
