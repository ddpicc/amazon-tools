import { NotificationChannelType, NotificationDeliveryStatus, TrackedAsinRole } from "@prisma/client";
import { formatClockTime } from "@/lib/shanghai-time";
import {
  getShanghaiEndOfDay,
  getShanghaiStartOfDay,
  formatShanghaiDate,
  isAfterShanghaiTime
} from "@/lib/shanghai-time";
import { db } from "@/server/db";
import {
  formatDigestText,
  generateAiDigestSections,
  type DigestContextItem,
  type ProjectDigestAiContext
} from "@/server/services/ai-digest-summary";
import { sendEmailMessage } from "@/server/services/email-delivery";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";
import { getCurrencyDivisor } from "@/server/sorftime/marketplaces";

type SnapshotRecord = {
  capturedAt: Date;
  price: unknown;
  rating: unknown;
  reviewCount: number | null;
  bsr: number | null;
  bsrCategory: unknown;
  sellerCount: number | null;
  variantCount: number | null;
  buyboxSeller: string | null;
  fbaFee: number | null;
  coupon: number | null;
  dealType: string | null;
  photoUrls: unknown;
  ebcPhotoUrls: unknown;
  asinSalesCount: number | null;
  listingSaleCount: number | null;
  listingSaleCountOfDaily: unknown;
  hasVideo: boolean | null;
  aPlus: boolean | null;
  hasBrandStore: boolean | null;
  isFBA: boolean | null;
  shipCost: number | null;
  title: string | null;
  brand: string | null;
  category: string | null;
  stockStatus: string | null;
};

type KeywordSnapshotRecord = {
  keyword: string;
  naturalRank: number | null;
  capturedAt: Date;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber() as number;
  }

  return null;
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

function getMonthlySales(snapshot: SnapshotRecord) {
  return snapshot.asinSalesCount && snapshot.asinSalesCount > 0
    ? snapshot.asinSalesCount
    : snapshot.listingSaleCount;
}

function formatMetricValue(value: number | null, options?: { money?: boolean; signed?: boolean }) {
  if (value === null) {
    return "-";
  }

  if (options?.money) {
    const prefix = options.signed && value > 0 ? "+" : "";
    return `${prefix}$${value.toFixed(2)}`;
  }

  if (options?.signed) {
    return `${value > 0 ? "+" : ""}${value}`;
  }

  return `${value}`;
}

function formatPercentChange(current: number, previous: number) {
  if (!previous) {
    return null;
  }

  const diff = ((current - previous) / previous) * 100;
  if (!Number.isFinite(diff)) {
    return null;
  }

  return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
}

function getCategoryRankLabel(value: unknown) {
  if (!Array.isArray(value) || !value.length) {
    return null;
  }

  const primary = value[0];
  if (!Array.isArray(primary) || primary.length < 3) {
    return null;
  }

  const categoryName = typeof primary[0] === "string" ? primary[0] : null;
  const rank = typeof primary[2] === "number" || typeof primary[2] === "string" ? `#${primary[2]}` : null;

  if (!categoryName && !rank) {
    return null;
  }

  return [categoryName, rank].filter(Boolean).join(" ");
}

function boolLabel(value: boolean | null) {
  if (value === null) {
    return null;
  }

  return value ? "有" : "无";
}

function stockStatusLabel(value: string | null) {
  if (!value) return "未知";
  const normalized = value.trim().toLowerCase();
  if (["in_stock", "available", "active"].includes(normalized)) return "在售";
  if (["out_of_stock", "unavailable", "inactive", "removed", "off_shelf"].includes(normalized)) return "不可售/可能下架";
  return normalized === "unknown" ? "状态未知" : value;
}

function sellerLabel(value: number | null) {
  if (value === null) return "未知";
  if (value <= 1) return "无跟卖";
  return `有 ${value - 1} 个跟卖`;
}

function buyboxLabel(value: string | null) {
  return value?.trim() ? "有" : "无";
}

function feeLabel(value: number | null, marketplace: string) {
  return value === null ? "未知" : `$${(value / getCurrencyDivisor(marketplace)).toFixed(2)}`;
}

function buildKeywordChangeLines(snapshots: KeywordSnapshotRecord[]) {
  const captureDates = Array.from(new Set(snapshots.map((item) => item.capturedAt.getTime())))
    .sort((a, b) => b - a)
    .slice(0, 2);
  const latestCapturedAt = captureDates[0];
  const previousCapturedAt = captureDates[1];
  if (latestCapturedAt === undefined || previousCapturedAt === undefined) return [];

  const latest = new Map(
    snapshots
      .filter((item) => item.capturedAt.getTime() === latestCapturedAt)
      .map((item) => [item.keyword.trim().toLowerCase(), item])
  );
  const previous = new Map(
    snapshots
      .filter((item) => item.capturedAt.getTime() === previousCapturedAt)
      .map((item) => [item.keyword.trim().toLowerCase(), item])
  );
  const changes: string[] = [];

  for (const key of new Set([...latest.keys(), ...previous.keys()])) {
    const latestRank = latest.get(key)?.naturalRank ?? null;
    const previousRank = previous.get(key)?.naturalRank ?? null;
    if (latestRank === previousRank) continue;
    const keyword = latest.get(key)?.keyword ?? previous.get(key)?.keyword ?? key;
    const previousLabel = previousRank === null ? "未上榜" : `#${previousRank}`;
    const latestLabel = latestRank === null ? "未上榜" : `#${latestRank}`;
    const direction = previousRank === null ? "新上榜" : latestRank === null ? "跌出排名" : latestRank < previousRank ? "上升" : "下降";
    changes.push(`关键词“${keyword}”自然排名${direction}：${previousLabel} → ${latestLabel}`);
  }

  return changes.slice(0, 8);
}

function pushIfChanged(lines: string[], next: string | null) {
  if (next) {
    lines.push(next);
  }
}

function buildChangeLines(latest: SnapshotRecord | null, previous: SnapshotRecord | null, marketplace: string) {
  if (!latest) {
    return [];
  }

  if (!previous) {
    return ["今天完成首批快照采集，后续日报会从下一次开始比较变化。"];
  }

  const lines: string[] = [];
  const latestPrice = toNumber(latest.price);
  const previousPrice = toNumber(previous.price);
  if (latestPrice !== null && previousPrice !== null && latestPrice !== previousPrice) {
    pushIfChanged(
      lines,
      `价格从 ${formatMetricValue(previousPrice, { money: true })} 调整到 ${formatMetricValue(latestPrice, { money: true })}${formatPercentChange(latestPrice, previousPrice) ? `（${formatPercentChange(latestPrice, previousPrice)}）` : ""}`
    );
  }

  const latestRating = toNumber(latest.rating);
  const previousRating = toNumber(previous.rating);
  if (latestRating !== null && previousRating !== null && latestRating !== previousRating) {
    pushIfChanged(lines, `评分从 ${previousRating.toFixed(1)} 变为 ${latestRating.toFixed(1)}`);
  }

  if (
    latest.reviewCount !== null &&
    previous.reviewCount !== null &&
    latest.reviewCount !== previous.reviewCount
  ) {
    pushIfChanged(lines, `评论数变化 ${formatMetricValue(latest.reviewCount - previous.reviewCount, { signed: true })}，当前 ${latest.reviewCount}`);
  }

  if (latest.bsr !== null && previous.bsr !== null && latest.bsr !== previous.bsr) {
    pushIfChanged(
      lines,
      `BSR 从 #${previous.bsr} 变为 #${latest.bsr}${latest.bsr < previous.bsr ? "，排名改善" : "，排名下滑"}`
    );
  }

  if (stockStatusLabel(latest.stockStatus) !== stockStatusLabel(previous.stockStatus)) {
    pushIfChanged(lines, `Listing 状态从 ${stockStatusLabel(previous.stockStatus)} 变为 ${stockStatusLabel(latest.stockStatus)}`);
  }

  const latestMonthlySales = getMonthlySales(latest);
  const previousMonthlySales = getMonthlySales(previous);
  if (
    latestMonthlySales !== null &&
    previousMonthlySales !== null &&
    latestMonthlySales !== previousMonthlySales
  ) {
    pushIfChanged(
      lines,
      `月销量估算从 ${previousMonthlySales} 变为 ${latestMonthlySales}`
    );
  }

  const latestDailySales = getDailySales(latest.listingSaleCountOfDaily);
  const previousDailySales = getDailySales(previous.listingSaleCountOfDaily);
  if (latestDailySales !== null && previousDailySales !== null && latestDailySales !== previousDailySales) {
    pushIfChanged(lines, `日销量从 ${previousDailySales} 变为 ${latestDailySales}`);
  }

  if (latest.sellerCount !== previous.sellerCount) {
    pushIfChanged(lines, `跟卖状态从 ${sellerLabel(previous.sellerCount)} 变为 ${sellerLabel(latest.sellerCount)}`);
  }

  if (latest.variantCount !== null && previous.variantCount !== null && latest.variantCount !== previous.variantCount) {
    pushIfChanged(lines, `变体数从 ${previous.variantCount} 变为 ${latest.variantCount}`);
  }

  if (latest.isFBA !== null && previous.isFBA !== null && latest.isFBA !== previous.isFBA) {
    pushIfChanged(lines, `配送方式从 ${previous.isFBA ? "FBA" : "FBM"} 变为 ${latest.isFBA ? "FBA" : "FBM"}`);
  }

  if (latest.fbaFee !== previous.fbaFee) {
    pushIfChanged(lines, `FBA 配送费从 ${feeLabel(previous.fbaFee, marketplace)} 变为 ${feeLabel(latest.fbaFee, marketplace)}`);
  }

  if (latest.shipCost !== null && previous.shipCost !== null && latest.shipCost !== previous.shipCost) {
    pushIfChanged(lines, `配送费从 ${previous.shipCost} 变为 ${latest.shipCost}`);
  }

  if (latest.title && previous.title && latest.title !== previous.title) {
    pushIfChanged(lines, "Listing 标题已更新");
  }

  if (latest.brand && previous.brand && latest.brand !== previous.brand) {
    pushIfChanged(lines, `品牌从 ${previous.brand} 变为 ${latest.brand}`);
  }

  if (latest.category && previous.category && latest.category !== previous.category) {
    pushIfChanged(lines, `类目从 ${previous.category} 变为 ${latest.category}`);
  }

  if (latest.buyboxSeller !== previous.buyboxSeller) {
    pushIfChanged(
      lines,
      buyboxLabel(latest.buyboxSeller) === buyboxLabel(previous.buyboxSeller)
        ? "Buy Box 仍在，但卖家已更换"
        : `Buy Box 从${buyboxLabel(previous.buyboxSeller)}变为${buyboxLabel(latest.buyboxSeller)}`
    );
  }

  if (latest.coupon !== previous.coupon) {
    pushIfChanged(lines, `Coupon 从 ${previous.coupon ?? 0} 变为 ${latest.coupon ?? 0}`);
  }

  if (latest.dealType !== previous.dealType) {
    pushIfChanged(lines, `Deal / 秒杀从 ${previous.dealType ?? "无"} 变为 ${latest.dealType ?? "无"}`);
  }

  if (JSON.stringify(latest.photoUrls) !== JSON.stringify(previous.photoUrls)) {
    pushIfChanged(lines, "主图已更换");
  }

  if (JSON.stringify(latest.ebcPhotoUrls) !== JSON.stringify(previous.ebcPhotoUrls)) {
    pushIfChanged(lines, "A+ 图片已更换");
  }

  if (boolLabel(latest.hasVideo) !== boolLabel(previous.hasVideo)) {
    pushIfChanged(lines, `主图视频从 ${boolLabel(previous.hasVideo) ?? "-"} 变为 ${boolLabel(latest.hasVideo) ?? "-"}`);
  }

  if (boolLabel(latest.aPlus) !== boolLabel(previous.aPlus)) {
    pushIfChanged(lines, `A+ 页面从 ${boolLabel(previous.aPlus) ?? "-"} 变为 ${boolLabel(latest.aPlus) ?? "-"}`);
  }

  if (boolLabel(latest.hasBrandStore) !== boolLabel(previous.hasBrandStore)) {
    pushIfChanged(
      lines,
      `品牌旗舰店从 ${boolLabel(previous.hasBrandStore) ?? "-"} 变为 ${boolLabel(latest.hasBrandStore) ?? "-"}`
    );
  }

  const latestCategoryRank = getCategoryRankLabel(latest.bsrCategory);
  const previousCategoryRank = getCategoryRankLabel(previous.bsrCategory);
  if (latestCategoryRank && previousCategoryRank && latestCategoryRank !== previousCategoryRank) {
    pushIfChanged(lines, `细分类目排名从 ${previousCategoryRank} 变为 ${latestCategoryRank}`);
  }

  return lines;
}

function significantListingChanges(lines: string[]) {
  return lines.filter((line) => /价格|Coupon|Deal|秒杀|变体数|评分|评论|BSR|主图|A\+ 图片|Listing 状态|Buy Box|跟卖|FBA 配送费|销量|关键词/.test(line));
}

function buildLatestMetrics(snapshot: SnapshotRecord | null, marketplace: string) {
  if (!snapshot) {
    return {
      price: null,
      rating: null,
      reviewCount: null,
      bsr: null,
      bsrCategory: null,
      monthlySales: null,
      dailySales: null,
      sellerCount: null,
      sellerStatus: null,
      variantCount: null,
      buyboxSeller: null,
      buyboxPresent: null,
      stockStatus: null,
      isFBA: null,
      fbaFee: null,
      coupon: null,
      dealType: null,
      hasVideo: null,
      aPlus: null,
      brandStore: null
    };
  }

  return {
    price: toNumber(snapshot.price),
    rating: toNumber(snapshot.rating),
    reviewCount: snapshot.reviewCount,
    bsr: snapshot.bsr,
    bsrCategory: getCategoryRankLabel(snapshot.bsrCategory),
    monthlySales: getMonthlySales(snapshot),
    dailySales: getDailySales(snapshot.listingSaleCountOfDaily),
    sellerCount: snapshot.sellerCount,
    sellerStatus: sellerLabel(snapshot.sellerCount),
    variantCount: snapshot.variantCount,
    buyboxSeller: snapshot.buyboxSeller,
    buyboxPresent: buyboxLabel(snapshot.buyboxSeller),
    stockStatus: stockStatusLabel(snapshot.stockStatus),
    isFBA: boolLabel(snapshot.isFBA),
    fbaFee: snapshot.fbaFee === null ? null : snapshot.fbaFee / getCurrencyDivisor(marketplace),
    coupon: snapshot.coupon,
    dealType: snapshot.dealType,
    hasVideo: boolLabel(snapshot.hasVideo),
    aPlus: boolLabel(snapshot.aPlus),
    brandStore: boolLabel(snapshot.hasBrandStore)
  };
}

function buildRecentSnapshots(snapshots: SnapshotRecord[]) {
  return snapshots.map((snapshot) => ({
    capturedAt: snapshot.capturedAt.toISOString(),
    price: toNumber(snapshot.price),
    rating: toNumber(snapshot.rating),
    reviewCount: snapshot.reviewCount,
    bsr: snapshot.bsr,
    monthlySales: getMonthlySales(snapshot),
    dailySales: getDailySales(snapshot.listingSaleCountOfDaily),
    sellerCount: snapshot.sellerCount,
    buyboxSeller: snapshot.buyboxSeller
  }));
}

function buildCrossComparisons(ownItems: DigestContextItem[], competitorItems: DigestContextItem[]) {
  const comparisons: string[] = [];

  for (const ownItem of ownItems) {
    const ownPrice = typeof ownItem.latestMetrics.price === "number" ? ownItem.latestMetrics.price : null;
    const ownRating = typeof ownItem.latestMetrics.rating === "number" ? ownItem.latestMetrics.rating : null;
    const ownBsr = typeof ownItem.latestMetrics.bsr === "number" ? ownItem.latestMetrics.bsr : null;
    const ownMonthlySales =
      typeof ownItem.latestMetrics.monthlySales === "number" ? ownItem.latestMetrics.monthlySales : null;

    for (const competitorItem of competitorItems) {
      const competitorPrice =
        typeof competitorItem.latestMetrics.price === "number" ? competitorItem.latestMetrics.price : null;
      const competitorRating =
        typeof competitorItem.latestMetrics.rating === "number" ? competitorItem.latestMetrics.rating : null;
      const competitorBsr =
        typeof competitorItem.latestMetrics.bsr === "number" ? competitorItem.latestMetrics.bsr : null;
      const competitorMonthlySales =
        typeof competitorItem.latestMetrics.monthlySales === "number"
          ? competitorItem.latestMetrics.monthlySales
          : null;

      if (ownPrice !== null && competitorPrice !== null && Math.abs(ownPrice - competitorPrice) >= 1) {
        comparisons.push(
          `${ownItem.asin} 相比 ${competitorItem.asin}${ownPrice < competitorPrice ? " 价格更低" : " 价格更高"}，价差 ${Math.abs(ownPrice - competitorPrice).toFixed(2)} 美元`
        );
      }

      if (ownRating !== null && competitorRating !== null && Math.abs(ownRating - competitorRating) >= 0.2) {
        comparisons.push(
          `${ownItem.asin} 相比 ${competitorItem.asin}${ownRating > competitorRating ? " 评分更高" : " 评分更低"}，差值 ${Math.abs(ownRating - competitorRating).toFixed(1)}`
        );
      }

      if (ownBsr !== null && competitorBsr !== null && ownBsr !== competitorBsr) {
        comparisons.push(
          `${ownItem.asin} 相比 ${competitorItem.asin}${ownBsr < competitorBsr ? " BSR 更靠前" : " BSR 更靠后"}`
        );
      }

      if (
        ownMonthlySales !== null &&
        competitorMonthlySales !== null &&
        ownMonthlySales !== competitorMonthlySales
      ) {
        comparisons.push(
          `${ownItem.asin} 相比 ${competitorItem.asin}${ownMonthlySales > competitorMonthlySales ? " 月销量更高" : " 月销量更低"}`
        );
      }
    }
  }

  return Array.from(new Set(comparisons)).slice(0, 8);
}

function buildWebhookPayload(text: string, channelType: NotificationChannelType) {
  if (channelType === NotificationChannelType.FEISHU) {
    return {
      msg_type: "text",
      content: { text }
    };
  }

  if (channelType === NotificationChannelType.WECOM) {
    return {
      msgtype: "text",
      text: { content: text }
    };
  }

  return { text };
}

async function sendDigestToWebhook(channel: { webhookUrl: string; type: NotificationChannelType }, text: string) {
  const response = await fetch(channel.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildWebhookPayload(text, channel.type))
  });

  const responseBody = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`Webhook responded with status ${response.status}${responseBody ? ` | ${responseBody}` : ""}`);
  }
}

function buildDigestHtml(input: {
  projectName: string;
  marketplace: string;
  digestDateLabel: string;
  ownCount: number;
  competitorCount: number;
  latestPollLabel: string;
  sections: {
    ownProduct: string;
    competitors: string;
  };
}) {
  const sectionRows = [
    ["你的产品变化", input.sections.ownProduct],
    ["竞品变化", input.sections.competitors]
  ]
    .map(
      ([title, body]) => `
        <tr>
          <td style="padding: 0 0 14px 0;">
            <div style="border: 1px solid #27272a; border-radius: 16px; background: #111113; padding: 18px;">
              <div style="font-size: 15px; line-height: 22px; font-weight: 600; color: #fafafa;">${escapeHtml(title)}</div>
              <div style="margin-top: 8px; font-size: 14px; line-height: 24px; color: #d4d4d8;">${escapeHtml(body).replaceAll("\n", "<br />")}</div>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="zh-CN">
      <body style="margin: 0; padding: 0; background: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #09090b; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; background: #18181b; border: 1px solid #27272a; border-radius: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 28px 20px; background: linear-gradient(135deg, rgba(245,158,11,0.16), rgba(24,24,27,1));">
                    <div style="font-size: 12px; line-height: 18px; letter-spacing: 0.14em; text-transform: uppercase; color: #fbbf24;">Sellumio Daily Digest</div>
                    <div style="margin-top: 10px; font-size: 28px; line-height: 34px; font-weight: 700; color: #fafafa;">${escapeHtml(input.projectName)}</div>
                    <div style="margin-top: 6px; font-size: 14px; line-height: 22px; color: #d4d4d8;">${escapeHtml(input.marketplace)} · ${escapeHtml(input.digestDateLabel)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 28px 10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding: 0 8px 16px 0;">
                          <div style="border-radius: 18px; background: #111113; border: 1px solid #27272a; padding: 18px;">
                            <div style="font-size: 12px; line-height: 18px; color: #a1a1aa;">Own ASIN</div>
                            <div style="margin-top: 8px; font-size: 28px; line-height: 32px; font-weight: 700; color: #fbbf24;">${input.ownCount}</div>
                          </div>
                        </td>
                        <td width="50%" style="padding: 0 0 16px 8px;">
                          <div style="border-radius: 18px; background: #111113; border: 1px solid #27272a; padding: 18px;">
                            <div style="font-size: 12px; line-height: 18px; color: #a1a1aa;">竞品 ASIN</div>
                            <div style="margin-top: 8px; font-size: 28px; line-height: 32px; font-weight: 700; color: #fafafa;">${input.competitorCount}</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0 0 16px;">
                          <div style="border-radius: 18px; background: #111113; border: 1px solid #27272a; padding: 18px;">
                            <div style="font-size: 12px; line-height: 18px; color: #a1a1aa;">最近拉取</div>
                            <div style="margin-top: 10px; font-size: 14px; line-height: 22px; color: #e4e4e7;">
                              ${escapeHtml(input.latestPollLabel)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 28px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${sectionRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function buildProjectDigest(projectId: string, digestDate: Date) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      marketplace: true,
      notificationEmail: true,
      trackedAsins: {
        where: { status: "ACTIVE" },
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
        select: {
          asin: true,
          title: true,
          role: true,
          keywordSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 100,
            select: { keyword: true, naturalRank: true, capturedAt: true }
          },
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 3,
            select: {
              capturedAt: true,
              price: true,
              rating: true,
              reviewCount: true,
              bsr: true,
              bsrCategory: true,
              sellerCount: true,
              variantCount: true,
              buyboxSeller: true,
              coupon: true,
              dealType: true,
              photoUrls: true,
              ebcPhotoUrls: true,
              asinSalesCount: true,
              listingSaleCount: true,
              listingSaleCountOfDaily: true,
              hasVideo: true,
              aPlus: true,
              hasBrandStore: true,
              isFBA: true,
              fbaFee: true,
              shipCost: true,
              title: true,
              brand: true,
              category: true,
              stockStatus: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const newLowStarReviews = await db.productReview.findMany({
    where: {
      trackedAsin: { projectId },
      firstSeenAt: {
        gte: digestDate,
        lte: getShanghaiEndOfDay(digestDate)
      }
    },
    select: {
      rating: true,
      title: true,
      trackedAsin: { select: { asin: true } }
    }
  });

  const latestPollJob = await db.syncJob.findFirst({
    where: {
      projectId,
      jobType: "monitoring_poll_project"
    },
    orderBy: { createdAt: "desc" }
  });

  const digestDateLabel = formatShanghaiDate(digestDate);
  const title = `[日报] ${project.marketplace} · ${project.name} · ${digestDateLabel}`;

  const items = project.trackedAsins.map((trackedAsin) => {
    const latest = (trackedAsin.snapshots[0] ?? null) as SnapshotRecord | null;
    const previous = (trackedAsin.snapshots[1] ?? null) as SnapshotRecord | null;
    const changeLines = buildChangeLines(latest, previous, project.marketplace);
    const keywordChanges = buildKeywordChangeLines(trackedAsin.keywordSnapshots as KeywordSnapshotRecord[]);
    const recentSnapshots = trackedAsin.snapshots as SnapshotRecord[];

    return {
      asin: trackedAsin.asin,
      title: trackedAsin.title,
      role: trackedAsin.role === TrackedAsinRole.OWN ? "OWN" : "COMPETITOR",
      latestCapturedAt: latest?.capturedAt.toISOString() ?? null,
      summaryLines: [...changeLines, ...keywordChanges],
      recentSnapshots: buildRecentSnapshots(recentSnapshots),
      latestMetrics: buildLatestMetrics(latest, project.marketplace),
      keywordChanges
    } satisfies DigestContextItem;
  });

  const ownAsins = items.filter((item) => item.role === TrackedAsinRole.OWN);
  const competitorAsins = items.filter((item) => item.role === TrackedAsinRole.COMPETITOR);

  for (const review of newLowStarReviews) {
    const item = ownAsins.find((asin) => asin.asin === review.trackedAsin.asin);
    if (item) {
      item.summaryLines.push(`新增 ${review.rating} 星评论`);
    }
  }

  const context: ProjectDigestAiContext = {
    project: project.name,
    marketplace: project.marketplace,
    digestDate: digestDateLabel,
    ownAsins,
    competitorAsins,
    ownChanges: ownAsins.map((item) => ({ asin: item.asin, lines: significantListingChanges(item.summaryLines) })).filter((item) => item.lines.length > 0),
    competitorChanges: competitorAsins
      .map((item) => ({ ...item, summaryLines: significantListingChanges(item.summaryLines) }))
      .filter((item) => item.summaryLines.length > 0)
      .map((item) => ({
        asin: item.asin,
        lines: item.summaryLines
      }))
  };

  let aiResult: Awaited<ReturnType<typeof generateAiDigestSections>>;
  try {
    aiResult = await generateAiDigestSections(context);
  } catch {
    aiResult = {
      sections: {
        ownProduct:
          context.ownChanges
            .map((item) => `${item.asin}：${item.lines.slice(0, 8).join("；")}`)
            .join("\n\n") || "你的产品今天没有明显变化，核心指标整体稳定。",
        competitors:
          context.competitorChanges
            .map((item) => `${item.asin}：${item.lines.slice(0, 8).join("；")}`)
            .join("\n\n") || "竞品今天没有明显变化。"
      },
      usedAi: false
    };
  }

  const latestPollLabel = latestPollJob?.startedAt
    ? `${latestPollJob.status} · ${latestPollJob.startedAt.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false
      })}`
    : "暂无记录";

  return {
    project,
    title,
    summary: formatDigestText(title, aiResult.sections),
    html: buildDigestHtml({
      projectName: project.name,
      marketplace: project.marketplace,
      digestDateLabel,
      ownCount: ownAsins.length,
      competitorCount: competitorAsins.length,
      latestPollLabel,
      sections: aiResult.sections
    })
  };
}

export async function sendProjectDailyDigest(projectId: string, digestDate = new Date()) {
  const normalizedDate = getShanghaiStartOfDay(digestDate);
  const existing = await db.dailyDigestRun.findUnique({
    where: {
      projectId_digestDate: {
        projectId,
        digestDate: normalizedDate
      }
    }
  });

  if (existing?.status === "SUCCESS") {
    return {
      skipped: true,
      reason: "already_sent",
      run: existing
    };
  }

  const { project, title, summary, html } = await buildProjectDigest(projectId, normalizedDate);
  const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);
  const externalChannels = channels.filter(
    (channel) =>
      channel.enabled &&
      ((channel.type === NotificationChannelType.FEISHU && Boolean(channel.webhookUrl)) ||
        (channel.type === NotificationChannelType.WECOM && Boolean(channel.webhookUrl)) ||
        (channel.type === NotificationChannelType.EMAIL && Boolean(channel.email)))
  );
  const previousChannelResults = Array.isArray(existing?.channelResults)
    ? (existing?.channelResults as Array<{
        type: NotificationChannelType;
        status: NotificationDeliveryStatus;
        errorMessage?: string;
      }>)
    : [];
  const successfulChannelTypes = new Set(
    previousChannelResults
      .filter((item) => item.status === NotificationDeliveryStatus.SUCCESS)
      .map((item) => item.type)
  );

  if (!externalChannels.length) {
    const run = await db.dailyDigestRun.upsert({
      where: {
        projectId_digestDate: {
          projectId,
          digestDate: normalizedDate
        }
      },
      create: {
        projectId,
        digestDate: normalizedDate,
        status: "SKIPPED",
        summary,
        channelResults: [],
        errorMessage: "No enabled delivery channels",
        sentAt: null
      },
      update: {
        status: "SKIPPED",
        summary,
        channelResults: [],
        errorMessage: "No enabled delivery channels",
        sentAt: null
      }
    });

    return {
      skipped: true,
      reason: "no_delivery_channels",
      run
    };
  }

  const channelsToSend = externalChannels.filter((channel) => !successfulChannelTypes.has(channel.type));
  const channelResults = [] as Array<{
    type: NotificationChannelType;
    status: NotificationDeliveryStatus;
    errorMessage?: string;
  }>;

  for (const channel of channelsToSend) {
    try {
      if (channel.type === NotificationChannelType.EMAIL) {
        if (!channel.email) {
          channelResults.push({
            type: channel.type,
            status: NotificationDeliveryStatus.SKIPPED,
            errorMessage: "Email address is not configured"
          });
          continue;
        }

        await sendEmailMessage({
          to: channel.email,
          subject: title,
          text: summary,
          html,
          senderType: "digest"
        });
        channelResults.push({
          type: channel.type,
          status: NotificationDeliveryStatus.SUCCESS
        });
        continue;
      }

      if (!channel.webhookUrl) {
        channelResults.push({
          type: channel.type,
          status: NotificationDeliveryStatus.SKIPPED,
          errorMessage: "Webhook URL is not configured"
        });
        continue;
      }

      await sendDigestToWebhook(
        {
          webhookUrl: channel.webhookUrl,
          type: channel.type
        },
        summary
      );

      channelResults.push({
        type: channel.type,
        status: NotificationDeliveryStatus.SUCCESS
      });
    } catch (error) {
      channelResults.push({
        type: channel.type,
        status: NotificationDeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown digest delivery error"
      });
    }
  }

  const mergedChannelResults = new Map<
    NotificationChannelType,
    {
      type: NotificationChannelType;
      status: NotificationDeliveryStatus;
      errorMessage?: string;
    }
  >();

  for (const result of previousChannelResults) {
    mergedChannelResults.set(result.type, result);
  }

  for (const result of channelResults) {
    mergedChannelResults.set(result.type, result);
  }

  const finalChannelResults = externalChannels
    .map((channel) => mergedChannelResults.get(channel.type))
    .filter(
      (
        item
      ): item is {
        type: NotificationChannelType;
        status: NotificationDeliveryStatus;
        errorMessage?: string;
      } => Boolean(item)
    );

  const successCount = finalChannelResults.filter((item) => item.status === NotificationDeliveryStatus.SUCCESS).length;
  const failedCount = finalChannelResults.filter((item) => item.status === NotificationDeliveryStatus.FAILED).length;
  const pendingCount = externalChannels.length - successCount;
  const status =
    successCount === externalChannels.length
      ? "SUCCESS"
      : successCount > 0
        ? "PARTIAL"
        : failedCount > 0
          ? "FAILED"
          : "SKIPPED";

  const run = await db.dailyDigestRun.upsert({
    where: {
      projectId_digestDate: {
        projectId,
        digestDate: normalizedDate
      }
    },
      create: {
        projectId,
        digestDate: normalizedDate,
        status,
        summary,
        channelResults: finalChannelResults,
        errorMessage: failedCount || pendingCount ? `${failedCount || pendingCount} channels pending retry` : null,
        sentAt: successCount > 0 ? new Date() : null
      },
      update: {
        status,
        summary,
        channelResults: finalChannelResults,
        errorMessage: failedCount || pendingCount ? `${failedCount || pendingCount} channels pending retry` : null,
        sentAt: successCount > 0 ? new Date() : null
      }
  });

  return {
    skipped: false,
    run,
    successCount,
    failedCount,
    channelResults
  };
}

export async function runDueDailyDigests(options?: { limit?: number; digestDate?: Date }) {
  const limit = options?.limit ?? 20;
  const now = options?.digestDate ?? new Date();
  const digestDate = getShanghaiStartOfDay(now);
  const dayEnd = getShanghaiEndOfDay(now);

  const projects = await db.project.findMany({
    where: {
      trackedAsins: {
        some: {
          status: "ACTIVE"
        }
      }
    },
    select: {
      id: true,
      name: true,
      settings: {
        select: {
          dailyDigestSendHour: true,
          dailyDigestSendMinute: true
        }
      },
      dailyDigestRuns: {
        where: {
          digestDate: {
            gte: digestDate,
            lt: dayEnd
          }
        },
        select: {
          status: true
        },
        take: 1
      }
    },
    orderBy: { updatedAt: "asc" }
  });

  const results = [] as Array<{
    projectId: string;
    projectName: string;
    status: string;
    reason?: string;
  }>;
  let attempted = 0;

  for (const project of projects) {
    const digestHour = project.settings?.dailyDigestSendHour ?? 9;
    const digestMinute = project.settings?.dailyDigestSendMinute ?? 0;

    if (!isAfterShanghaiTime(now, digestHour, digestMinute)) {
      results.push({
        projectId: project.id,
        projectName: project.name,
        status: "SKIPPED",
        reason: `not_due:${formatClockTime(digestHour, digestMinute)}`
      });
      continue;
    }

    if (project.dailyDigestRuns[0]?.status === "SUCCESS") {
      results.push({
        projectId: project.id,
        projectName: project.name,
        status: "SKIPPED",
        reason: "already_sent"
      });
      continue;
    }

    if (attempted >= limit) {
      results.push({
        projectId: project.id,
        projectName: project.name,
        status: "SKIPPED",
        reason: "limit_reached"
      });
      continue;
    }

    try {
      const result = await sendProjectDailyDigest(project.id, digestDate);
      attempted += 1;
      results.push({
        projectId: project.id,
        projectName: project.name,
        status: result.skipped ? "SKIPPED" : result.run?.status ?? "FAILED",
        reason: result.skipped ? result.reason : undefined
      });
    } catch (error) {
      attempted += 1;
      results.push({
        projectId: project.id,
        projectName: project.name,
        status: "FAILED",
        reason: error instanceof Error ? error.message : "digest_failed"
      });
    }
  }

  return {
    digestDate,
    attempted,
    results
  };
}
