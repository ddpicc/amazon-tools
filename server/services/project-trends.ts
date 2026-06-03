import { TrackedAsinRole } from "@prisma/client";
import { db } from "@/server/db";

type TrendPoint = {
  label: string;
  own: number | null;
  competitor: number | null;
};

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

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  return Number((filtered.reduce((total, value) => total + value, 0) / filtered.length).toFixed(2));
}

function sum(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  return filtered.reduce((total, value) => total + value, 0);
}

function min(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  return Math.min(...filtered);
}

function startFromDays(days: number) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - Math.max(0, days - 1));
  return from;
}

export async function getProjectTrendOverview(projectId: string, days = 30) {
  const from = startFromDays(days);

  const snapshots = await db.productSnapshot.findMany({
    where: {
      trackedAsin: {
        projectId
      },
      capturedAt: {
        gte: from
      }
    },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      price: true,
      rating: true,
      reviewCount: true,
      bsr: true,
      trackedAsin: {
        select: {
          id: true,
          asin: true,
          role: true
        }
      }
    }
  });

  const groupedByDay = new Map<
    string,
    {
      label: string;
      ownPrice: Array<number | null>;
      competitorPrice: Array<number | null>;
      ownRating: Array<number | null>;
      competitorRating: Array<number | null>;
      ownReviews: Array<number | null>;
      competitorReviews: Array<number | null>;
      ownBsr: Array<number | null>;
      competitorBsr: Array<number | null>;
    }
  >();

  for (const snapshot of snapshots) {
    const dayKey = snapshot.capturedAt.toISOString().slice(0, 10);
    const bucket =
      groupedByDay.get(dayKey) ??
      {
        label: formatDayLabel(snapshot.capturedAt),
        ownPrice: [],
        competitorPrice: [],
        ownRating: [],
        competitorRating: [],
        ownReviews: [],
        competitorReviews: [],
        ownBsr: [],
        competitorBsr: []
      };

    const isOwn = snapshot.trackedAsin.role === TrackedAsinRole.OWN;

    if (isOwn) {
      bucket.ownPrice.push(decimalToNumber(snapshot.price));
      bucket.ownRating.push(decimalToNumber(snapshot.rating));
      bucket.ownReviews.push(snapshot.reviewCount);
      bucket.ownBsr.push(snapshot.bsr);
    } else {
      bucket.competitorPrice.push(decimalToNumber(snapshot.price));
      bucket.competitorRating.push(decimalToNumber(snapshot.rating));
      bucket.competitorReviews.push(snapshot.reviewCount);
      bucket.competitorBsr.push(snapshot.bsr);
    }

    groupedByDay.set(dayKey, bucket);
  }

  const priceTrend = [] as TrendPoint[];
  const ratingTrend = [] as TrendPoint[];
  const reviewTrend = [] as TrendPoint[];
  const bsrTrend = [] as TrendPoint[];

  for (const bucket of groupedByDay.values()) {
    priceTrend.push({
      label: bucket.label,
      own: average(bucket.ownPrice),
      competitor: average(bucket.competitorPrice)
    });
    ratingTrend.push({
      label: bucket.label,
      own: average(bucket.ownRating),
      competitor: average(bucket.competitorRating)
    });
    reviewTrend.push({
      label: bucket.label,
      own: sum(bucket.ownReviews),
      competitor: sum(bucket.competitorReviews)
    });
    bsrTrend.push({
      label: bucket.label,
      own: min(bucket.ownBsr),
      competitor: min(bucket.competitorBsr)
    });
  }

  const latestByTrackedAsin = new Map<
    string,
    {
      role: TrackedAsinRole;
      price: number | null;
      rating: number | null;
      reviewCount: number | null;
      bsr: number | null;
    }
  >();

  for (const snapshot of snapshots.slice().reverse()) {
    if (latestByTrackedAsin.has(snapshot.trackedAsin.id)) {
      continue;
    }

    latestByTrackedAsin.set(snapshot.trackedAsin.id, {
      role: snapshot.trackedAsin.role,
      price: decimalToNumber(snapshot.price),
      rating: decimalToNumber(snapshot.rating),
      reviewCount: snapshot.reviewCount,
      bsr: snapshot.bsr
    });
  }

  const latestOwn = Array.from(latestByTrackedAsin.values()).filter((item) => item.role === TrackedAsinRole.OWN);
  const latestCompetitor = Array.from(latestByTrackedAsin.values()).filter((item) => item.role === TrackedAsinRole.COMPETITOR);

  return {
    latestSummary: {
      ownAveragePrice: average(latestOwn.map((item) => item.price)),
      competitorAveragePrice: average(latestCompetitor.map((item) => item.price)),
      ownAverageRating: average(latestOwn.map((item) => item.rating)),
      competitorAverageRating: average(latestCompetitor.map((item) => item.rating)),
      ownTotalReviews: sum(latestOwn.map((item) => item.reviewCount)),
      competitorTotalReviews: sum(latestCompetitor.map((item) => item.reviewCount)),
      ownBestBsr: min(latestOwn.map((item) => item.bsr)),
      competitorBestBsr: min(latestCompetitor.map((item) => item.bsr))
    },
    priceTrend,
    ratingTrend,
    reviewTrend,
    bsrTrend
  };
}

export async function getTrackedAsinTrendOverview(trackedAsinId: string, days = 30) {
  const from = startFromDays(days);

  const trackedAsin = await db.trackedAsin.findUnique({
    where: { id: trackedAsinId },
    select: {
      id: true,
      projectId: true,
      asin: true,
      role: true,
      title: true,
      brand: true,
      category: true,
      snapshots: {
        where: {
          capturedAt: {
            gte: from
          }
        },
        orderBy: { capturedAt: "asc" },
        select: {
          capturedAt: true,
          price: true,
          rating: true,
          reviewCount: true,
          bsr: true
        }
      }
    }
  });

  if (!trackedAsin) {
    throw new Error("Tracked ASIN not found");
  }

  const latestSnapshot = trackedAsin.snapshots.at(-1) ?? null;
  const latestByDay = new Map<
    string,
    {
      label: string;
      price: number | null;
      rating: number | null;
      reviewCount: number | null;
      bsr: number | null;
    }
  >();

  for (const snapshot of trackedAsin.snapshots) {
    const dayKey = snapshot.capturedAt.toISOString().slice(0, 10);
    latestByDay.set(dayKey, {
      label: formatDayLabel(snapshot.capturedAt),
      price: decimalToNumber(snapshot.price),
      rating: decimalToNumber(snapshot.rating),
      reviewCount: snapshot.reviewCount,
      bsr: snapshot.bsr
    });
  }

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
    latestSummary: {
      currentPrice: latestSnapshot ? decimalToNumber(latestSnapshot.price) : null,
      currentRating: latestSnapshot ? decimalToNumber(latestSnapshot.rating) : null,
      currentReviewCount: latestSnapshot?.reviewCount ?? null,
      currentBsr: latestSnapshot?.bsr ?? null,
      capturedAt: latestSnapshot?.capturedAt ?? null,
      dayCount: latestByDay.size
    },
    priceTrend: Array.from(latestByDay.values()).map((item) => ({
      label: item.label,
      value: item.price
    })),
    ratingTrend: Array.from(latestByDay.values()).map((item) => ({
      label: item.label,
      value: item.rating
    })),
    reviewTrend: Array.from(latestByDay.values()).map((item) => ({
      label: item.label,
      value: item.reviewCount
    })),
    bsrTrend: Array.from(latestByDay.values()).map((item) => ({
      label: item.label,
      value: item.bsr
    }))
  };
}
