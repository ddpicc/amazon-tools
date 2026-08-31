import { TrackedAsinRole } from "@prisma/client";
import { db } from "@/server/db";

type TrendPoint = Record<string, string | number | null>;

const SERIES_COLORS = [
  "#f59e0b",
  "#38bdf8",
  "#ef4444",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#f97316",
  "#6366f1",
  "#10b981",
  "#06b6d4"
];

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

function ratio(values: Array<boolean | null>) {
  const filtered = values.filter((value): value is boolean => value !== null);
  if (!filtered.length) {
    return null;
  }

  const positives = filtered.filter(Boolean).length;
  return Number(((positives / filtered.length) * 100).toFixed(1));
}

function median(values: Array<number | null>) {
  const filtered = values
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => a - b);

  if (!filtered.length) {
    return null;
  }

  const middle = Math.floor(filtered.length / 2);
  if (filtered.length % 2 === 0) {
    return Number(((filtered[middle - 1] + filtered[middle]) / 2).toFixed(2));
  }

  return filtered[middle];
}

function max(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  return Math.max(...filtered);
}

function min(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  return Math.min(...filtered);
}

function getMonthlySales(asinSalesCount: number | null, listingSaleCount: number | null) {
  return asinSalesCount && asinSalesCount > 0 ? asinSalesCount : listingSaleCount;
}

function getDailySales(value: unknown) {
  if (Array.isArray(value) && value.length >= 2 && typeof value[1] === "number") {
    return value[1];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.value === "number") {
      return record.value;
    }
    if (typeof record.sales === "number") {
      return record.sales;
    }
    if (typeof record.count === "number") {
      return record.count;
    }
  }

  return null;
}

function startFromDays(days: number) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - Math.max(0, days - 1));
  return from;
}

function getSeriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function formatMetricChange(label: string, previous: number | null, current: number | null, options?: { currency?: boolean; reverseDirection?: boolean }) {
  if (previous === null || current === null || previous === current) {
    return null;
  }

  const difference = current - previous;
  const percent = previous === 0 ? null : (difference / previous) * 100;
  const formatValue = (value: number) => options?.currency ? `$${value.toFixed(2)}` : Number.isInteger(value) ? String(value) : value.toFixed(1);
  const direction = difference > 0 ? "上升" : "下降";
  const directionLabel = options?.reverseDirection
    ? direction === "上升" ? "变差" : "改善"
    : direction;

  return {
    label,
    value: `${formatValue(previous)} → ${formatValue(current)}`,
    detail: percent === null ? directionLabel : `${directionLabel} ${Math.abs(percent).toFixed(1)}%`,
    tone: options?.reverseDirection ? (difference > 0 ? "negative" : "positive") : (difference > 0 ? "positive" : "negative")
  } as const;
}

function buildCompetitorChanges(input: {
  latest: {
    price: unknown;
    rating: unknown;
    asinSalesCount: number | null;
    listingSaleCount: number | null;
    bsr: number | null;
    variantCount: number | null;
    isFBA: boolean | null;
  };
  previous: {
    price: unknown;
    rating: unknown;
    asinSalesCount: number | null;
    listingSaleCount: number | null;
    bsr: number | null;
    variantCount: number | null;
    isFBA: boolean | null;
  } | null;
}) {
  if (!input.previous) {
    return [];
  }

  const changes = [
    formatMetricChange("价格", decimalToNumber(input.previous.price), decimalToNumber(input.latest.price), { currency: true }),
    formatMetricChange(
      "月销量",
      getMonthlySales(input.previous.asinSalesCount, input.previous.listingSaleCount),
      getMonthlySales(input.latest.asinSalesCount, input.latest.listingSaleCount)
    ),
    formatMetricChange("BSR", input.previous.bsr, input.latest.bsr, { reverseDirection: true }),
    formatMetricChange("评分", decimalToNumber(input.previous.rating), decimalToNumber(input.latest.rating)),
    formatMetricChange("变体数", input.previous.variantCount, input.latest.variantCount)
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (input.previous.isFBA !== null && input.latest.isFBA !== null && input.previous.isFBA !== input.latest.isFBA) {
    changes.push({
      label: "配送方式",
      value: `${input.previous.isFBA ? "FBA" : "FBM"} → ${input.latest.isFBA ? "FBA" : "FBM"}`,
      detail: "发生变化",
      tone: "negative" as const
    });
  }

  return changes;
}

function buildTrendRows(
  snapshots: Array<{
    capturedAt: Date;
    trackedAsin: {
      id: string;
    };
    value: number | null;
  }>
) {
  const rowsByDay = new Map<string, TrendPoint>();

  for (const snapshot of snapshots) {
    const dayKey = snapshot.capturedAt.toISOString().slice(0, 10);
    const row =
      rowsByDay.get(dayKey) ??
      {
        label: formatDayLabel(snapshot.capturedAt)
      };

    row[snapshot.trackedAsin.id] = snapshot.value;
    rowsByDay.set(dayKey, row);
  }

  return Array.from(rowsByDay.values());
}

export async function getProjectTrendOverview(projectId: string, days = 30) {
  const from = startFromDays(days);

  const [snapshots, trackedAsins] = await Promise.all([
    db.productSnapshot.findMany({
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
    }),
    db.trackedAsin.findMany({
      where: { projectId },
      orderBy: [{ role: "asc" }, { asin: "asc" }],
      select: {
        id: true,
        asin: true,
        role: true,
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 2,
          select: {
            capturedAt: true,
            price: true,
            rating: true,
            reviewCount: true,
            bsr: true,
            asinSalesCount: true,
            listingSaleCount: true,
            listingSaleCountOfDaily: true,
            isFBA: true,
            aPlus: true,
            hasVideo: true,
            hasBrandStore: true,
            onlineDays: true,
            variantCount: true
          }
        }
      }
    })
  ]);

  const series = trackedAsins.map((item, index) => ({
    key: item.id,
    label: item.asin,
    role: item.role,
    color: getSeriesColor(index)
  }));

  const priceTrend = buildTrendRows(
    snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt,
      trackedAsin: { id: snapshot.trackedAsin.id },
      value: decimalToNumber(snapshot.price)
    }))
  );
  const ratingTrend = buildTrendRows(
    snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt,
      trackedAsin: { id: snapshot.trackedAsin.id },
      value: decimalToNumber(snapshot.rating)
    }))
  );
  const reviewTrend = buildTrendRows(
    snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt,
      trackedAsin: { id: snapshot.trackedAsin.id },
      value: snapshot.reviewCount
    }))
  );
  const bsrTrend = buildTrendRows(
    snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt,
      trackedAsin: { id: snapshot.trackedAsin.id },
      value: snapshot.bsr
    }))
  );

  const latestSnapshots = trackedAsins
    .map((item) => {
      const snapshot = item.snapshots[0] ?? null;
      if (!snapshot) {
        return null;
      }

      return {
        role: item.role,
        price: decimalToNumber(snapshot.price),
        rating: decimalToNumber(snapshot.rating),
        reviewCount: snapshot.reviewCount,
        bsr: snapshot.bsr,
        monthlySales: getMonthlySales(snapshot.asinSalesCount, snapshot.listingSaleCount),
        dailySales: getDailySales(snapshot.listingSaleCountOfDaily),
        isFBA: snapshot.isFBA,
        aPlus: snapshot.aPlus,
        hasVideo: snapshot.hasVideo,
        hasBrandStore: snapshot.hasBrandStore,
        onlineDays: snapshot.onlineDays
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const latestOwn = latestSnapshots.filter((item) => item.role === TrackedAsinRole.OWN);
  const latestCompetitor = latestSnapshots.filter((item) => item.role === TrackedAsinRole.COMPETITOR);

  const competitorIntelligence = trackedAsins
    .filter((item) => item.role === TrackedAsinRole.COMPETITOR)
    .map((item) => {
      const latest = item.snapshots[0] ?? null;
      const previous = item.snapshots[1] ?? null;

      return {
        id: item.id,
        asin: item.asin,
        latest: latest
          ? {
              capturedAt: latest.capturedAt,
              price: decimalToNumber(latest.price),
              rating: decimalToNumber(latest.rating),
              monthlySales: getMonthlySales(latest.asinSalesCount, latest.listingSaleCount),
              bsr: latest.bsr,
              variantCount: latest.variantCount,
              isFBA: latest.isFBA
            }
          : null,
        changes: latest ? buildCompetitorChanges({ latest, previous }) : []
      };
    });

  return {
    latestSummary: {
      ownAveragePrice: average(latestOwn.map((item) => item.price)),
      competitorAveragePrice: average(latestCompetitor.map((item) => item.price)),
      ownAverageRating: average(latestOwn.map((item) => item.rating)),
      competitorAverageRating: average(latestCompetitor.map((item) => item.rating)),
      ownAverageReviews: average(latestOwn.map((item) => item.reviewCount)),
      competitorAverageReviews: average(latestCompetitor.map((item) => item.reviewCount)),
      ownAverageBsr: average(latestOwn.map((item) => item.bsr)),
      competitorAverageBsr: average(latestCompetitor.map((item) => item.bsr)),
      ownAverageMonthlySales: average(latestOwn.map((item) => item.monthlySales)),
      competitorAverageMonthlySales: average(latestCompetitor.map((item) => item.monthlySales)),
      ownAverageDailySales: average(latestOwn.map((item) => item.dailySales)),
      competitorAverageDailySales: average(latestCompetitor.map((item) => item.dailySales)),
      ownFbaRatio: ratio(latestOwn.map((item) => item.isFBA)),
      competitorFbaRatio: ratio(latestCompetitor.map((item) => item.isFBA)),
      ownAPlusCoverage: ratio(latestOwn.map((item) => item.aPlus)),
      competitorAPlusCoverage: ratio(latestCompetitor.map((item) => item.aPlus)),
      ownVideoCoverage: ratio(latestOwn.map((item) => item.hasVideo)),
      competitorVideoCoverage: ratio(latestCompetitor.map((item) => item.hasVideo)),
      ownBrandStoreCoverage: ratio(latestOwn.map((item) => item.hasBrandStore)),
      competitorBrandStoreCoverage: ratio(latestCompetitor.map((item) => item.hasBrandStore)),
      ownAverageOnlineDays: average(latestOwn.map((item) => item.onlineDays)),
      competitorAverageOnlineDays: average(latestCompetitor.map((item) => item.onlineDays)),
      ownMedianOnlineDays: median(latestOwn.map((item) => item.onlineDays)),
      competitorMedianOnlineDays: median(latestCompetitor.map((item) => item.onlineDays)),
      ownOldestOnlineDays: max(latestOwn.map((item) => item.onlineDays)),
      competitorOldestOnlineDays: max(latestCompetitor.map((item) => item.onlineDays)),
      ownNewestOnlineDays: min(latestOwn.map((item) => item.onlineDays)),
      competitorNewestOnlineDays: min(latestCompetitor.map((item) => item.onlineDays))
    },
    series,
    priceTrend,
    ratingTrend,
    reviewTrend,
    bsrTrend,
    competitorIntelligence
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
