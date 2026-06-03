import "server-only";
import { db } from "@/server/db";

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "toString" in (value as Record<string, unknown>)) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getTrackedAsinDailySnapshot(trackedAsinId: string) {
  const todayStart = startOfToday();

  const trackedAsin = await db.trackedAsin.findUnique({
    where: { id: trackedAsinId },
    select: {
      id: true,
      projectId: true,
      asin: true,
      role: true,
      title: true,
      brand: true,
      category: true
    }
  });

  if (!trackedAsin) {
    throw new Error("Tracked ASIN not found");
  }

  const [latestSnapshot, todaySnapshot] = await Promise.all([
    db.productSnapshot.findFirst({
      where: { trackedAsinId },
      orderBy: { capturedAt: "desc" },
      select: {
        capturedAt: true,
        price: true,
        listPrice: true,
        listingSaleCountOfDaily: true,
        rating: true,
        reviewCount: true,
        bsr: true,
        bsrCategory: true,
        variantCount: true,
        title: true,
        photoUrls: true,
        ebcPhotoUrls: true,
        brand: true,
        description: true,
        buyboxSeller: true,
        buyboxSellerId: true,
        isFBA: true,
        parentAsin: true,
        asinSalesCount: true,
        listingSaleCount: true,
        shipCost: true,
        coupon: true,
        onlineDate: true,
        onlineDays: true,
        storeName: true,
        category: true,
        categoryNodeId: true,
        hasVideo: true,
        aPlus: true,
        hasBrandStore: true,
        packageSize: true,
        weightGrams: true,
        extraSavings: true,
        properties: true
      }
    }),
    db.productSnapshot.findFirst({
      where: {
        trackedAsinId,
        capturedAt: {
          gte: todayStart
        }
      },
      orderBy: { capturedAt: "desc" },
      select: {
        capturedAt: true,
        price: true,
        listPrice: true,
        listingSaleCountOfDaily: true,
        rating: true,
        reviewCount: true,
        bsr: true,
        bsrCategory: true,
        variantCount: true,
        title: true,
        photoUrls: true,
        ebcPhotoUrls: true,
        brand: true,
        description: true,
        buyboxSeller: true,
        buyboxSellerId: true,
        isFBA: true,
        parentAsin: true,
        asinSalesCount: true,
        listingSaleCount: true,
        shipCost: true,
        coupon: true,
        onlineDate: true,
        onlineDays: true,
        storeName: true,
        category: true,
        categoryNodeId: true,
        hasVideo: true,
        aPlus: true,
        hasBrandStore: true,
        packageSize: true,
        weightGrams: true,
        extraSavings: true,
        properties: true
      }
    })
  ]);

  const snapshot = todaySnapshot ?? latestSnapshot;

  return {
    trackedAsin: {
      id: trackedAsin.id,
      projectId: trackedAsin.projectId,
      asin: trackedAsin.asin,
      role: trackedAsin.role,
      title: trackedAsin.title,
      brand: trackedAsin.brand,
      category: trackedAsin.category
    },
    hasTodaySnapshot: Boolean(todaySnapshot),
    snapshot: snapshot
      ? {
          capturedAt: snapshot.capturedAt,
          price: decimalToNumber(snapshot.price),
          listPrice: decimalToNumber(snapshot.listPrice),
          listingSaleCountOfDaily: snapshot.listingSaleCountOfDaily,
          rating: decimalToNumber(snapshot.rating),
          reviewCount: snapshot.reviewCount,
          bsr: snapshot.bsr,
          bsrCategory: snapshot.bsrCategory,
          variantCount: snapshot.variantCount,
          title: snapshot.title,
          photoUrls: snapshot.photoUrls,
          ebcPhotoUrls: snapshot.ebcPhotoUrls,
          brand: snapshot.brand,
          description: snapshot.description,
          buyboxSeller: snapshot.buyboxSeller,
          buyboxSellerId: snapshot.buyboxSellerId,
          isFBA: snapshot.isFBA,
          parentAsin: snapshot.parentAsin,
          asinSalesCount: snapshot.asinSalesCount,
          listingSaleCount: snapshot.listingSaleCount,
          shipCost: snapshot.shipCost,
          coupon: snapshot.coupon,
          onlineDate: snapshot.onlineDate,
          onlineDays: snapshot.onlineDays,
          categoryNodeId: snapshot.categoryNodeId,
          hasVideo: snapshot.hasVideo,
          aPlus: snapshot.aPlus,
          hasBrandStore: snapshot.hasBrandStore,
          storeName: snapshot.storeName,
          category: snapshot.category,
          packageSize: snapshot.packageSize,
          weightGrams: snapshot.weightGrams,
          extraSavings: snapshot.extraSavings,
          properties: snapshot.properties
        }
      : null,
    latestCapturedAt: latestSnapshot?.capturedAt ?? null
  };
}
