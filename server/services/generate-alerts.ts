import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createProjectAlert } from "@/server/services/alert-notifications";

function toNumber(value: Prisma.Decimal | null) {
  return value ? Number(value) : null;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

export async function generateAlertsForSnapshot(trackedAsinId: string) {
  const trackedAsin = await db.trackedAsin.findUnique({
    where: { id: trackedAsinId },
    include: {
      project: true,
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 2
      }
    }
  });

  if (!trackedAsin || trackedAsin.snapshots.length < 2) {
    return [];
  }

  const [current, previous] = trackedAsin.snapshots;
  const settings =
    (await db.projectSettings.findUnique({ where: { projectId: trackedAsin.projectId } })) ??
    (await db.projectSettings.create({ data: { projectId: trackedAsin.projectId } }));

  const alerts = [] as Array<{
    type: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    message: string;
    oldValue?: string;
    newValue?: string;
    changeValue?: string;
    payload?: Prisma.InputJsonValue;
  }>;

  const currentPrice = toNumber(current.price);
  const previousPrice = toNumber(previous.price);
  if (currentPrice !== null && previousPrice !== null) {
    const diff = currentPrice - previousPrice;
    const diffPct = previousPrice === 0 ? 0 : (Math.abs(diff) / previousPrice) * 100;
    const threshold = settings.priceChangeThresholdPercent ? Number(settings.priceChangeThresholdPercent) : 5;
    if (diffPct >= threshold) {
      alerts.push({
        type: "price_change",
        severity: Math.abs(diff) > 10 ? "CRITICAL" : "WARNING",
        title: `${trackedAsin.asin} 价格发生变化`,
        message: `价格从 ${previousPrice} 变为 ${currentPrice}`,
        oldValue: String(previousPrice),
        newValue: String(currentPrice),
        changeValue: `${diff.toFixed(2)} (${diffPct.toFixed(1)}%)`
      });
    }
  }

  const currentRating = toNumber(current.rating);
  const previousRating = toNumber(previous.rating);
  if (currentRating !== null && previousRating !== null) {
    const diff = previousRating - currentRating;
    if (diff >= Number(settings.ratingDropThreshold)) {
      alerts.push({
        type: "rating_drop",
        severity: diff >= 0.5 ? "CRITICAL" : "WARNING",
        title: `${trackedAsin.asin} 评分下降`,
        message: `评分从 ${previousRating} 降到 ${currentRating}`,
        oldValue: String(previousRating),
        newValue: String(currentRating),
        changeValue: diff.toFixed(2)
      });
    }
  }

  const reviewDiff = (current.reviewCount ?? 0) - (previous.reviewCount ?? 0);
  if (reviewDiff >= settings.reviewGrowthThreshold) {
    alerts.push({
      type: "review_growth",
      severity: reviewDiff >= settings.reviewGrowthThreshold * 2 ? "CRITICAL" : "INFO",
      title: `${trackedAsin.asin} 评论数增长`,
      message: `评论数新增 ${reviewDiff}`,
      oldValue: String(previous.reviewCount ?? 0),
      newValue: String(current.reviewCount ?? 0),
      changeValue: String(reviewDiff)
    });
  }

  const currentBsr = current.bsr ?? null;
  const previousBsr = previous.bsr ?? null;
  if (currentBsr !== null && previousBsr !== null && previousBsr > 0) {
    const bsrDiff = currentBsr - previousBsr;
    const bsrDiffPct = (Math.abs(bsrDiff) / previousBsr) * 100;
    const threshold = Number(settings.bsrChangeThresholdPercent ?? 20);

    if (bsrDiffPct >= threshold) {
      const severity = bsrDiffPct >= threshold * 2 ? "CRITICAL" : "WARNING";
      const direction = bsrDiff < 0 ? "上升" : "下降";
      alerts.push({
        type: "bsr_change",
        severity,
        title: `${trackedAsin.asin} BSR 发生明显变化`,
        message: `BSR 从 ${previousBsr} ${direction}到 ${currentBsr}`,
        oldValue: String(previousBsr),
        newValue: String(currentBsr),
        changeValue: `${bsrDiff} (${bsrDiffPct.toFixed(1)}%)`
      });
    }
  }

  const previousTitle = normalizeText(previous.title);
  const currentTitle = normalizeText(current.title);
  if (previousTitle && currentTitle && previousTitle !== currentTitle) {
    alerts.push({
      type: "listing_title_change",
      severity: "INFO",
      title: `${trackedAsin.asin} 标题发生变化`,
      message: "检测到 Listing 标题已更新",
      oldValue: previousTitle,
      newValue: currentTitle
    });
  }

  const previousBrand = normalizeText(previous.brand);
  const currentBrand = normalizeText(current.brand);
  if (previousBrand && currentBrand && previousBrand !== currentBrand) {
    alerts.push({
      type: "listing_brand_change",
      severity: "WARNING",
      title: `${trackedAsin.asin} 品牌信息发生变化`,
      message: "检测到 Listing 品牌字段已更新",
      oldValue: previousBrand,
      newValue: currentBrand
    });
  }

  const previousCategory = normalizeText(previous.category);
  const currentCategory = normalizeText(current.category);
  if (previousCategory && currentCategory && previousCategory !== currentCategory) {
    alerts.push({
      type: "listing_category_change",
      severity: "INFO",
      title: `${trackedAsin.asin} 类目信息发生变化`,
      message: "检测到 Listing 类目字段已更新",
      oldValue: previousCategory,
      newValue: currentCategory
    });
  }

  if ((current.variantCount ?? 0) !== (previous.variantCount ?? 0)) {
    alerts.push({
      type: "variant_change",
      severity: "INFO",
      title: `${trackedAsin.asin} 变体数量变化`,
      message: `变体数从 ${previous.variantCount ?? 0} 变为 ${current.variantCount ?? 0}`,
      oldValue: String(previous.variantCount ?? 0),
      newValue: String(current.variantCount ?? 0)
    });
  }

  return Promise.all(
    alerts.map((alert) =>
      createProjectAlert({
        projectId: trackedAsin.projectId,
        trackedAsinId,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        oldValue: alert.oldValue,
        newValue: alert.newValue,
        changeValue: alert.changeValue,
        payload: alert.payload && typeof alert.payload === "object" ? (alert.payload as object) : null
      })
    )
  );
}
