import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getSorftimeSource } from "@/server/sorftime/adapter";
import { fetchProductRequest } from "@/server/sorftime/product";
import { completeDataCapture, failDataCapture, toDataSourceKind } from "@/server/services/data-captures";
import { fetchCanopyReviews } from "@/server/canopy/reviews";
import { fetchAsinRequestKeywords } from "@/server/sorftime/product";

export type ProductLookupInput = { asin: string; marketplace: string };
export type ReviewInsightsInput = { asin: string; marketplace: string; lowStarOnly: boolean; projectId?: string };
export type KeywordResearchInput = { asin: string; marketplace: string; projectId?: string; trackedAsinId?: string };
export type ListingDiagnosisInput = { projectId: string; trackedAsinId: string };

function normalizeAsin(value: string) {
  const asin = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(asin)) throw new Error("请输入 10 位 Amazon ASIN");
  return asin;
}

function inputFingerprint(input: object) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function productResult(snapshot: Awaited<ReturnType<typeof fetchProductRequest>>) {
  const data = snapshot.data;
  return {
    asin: data.asin,
    title: data.title,
    brand: data.brand,
    price: data.price,
    listPrice: data.listPrice,
    rating: data.rating,
    reviewCount: data.reviewCount,
    bsr: data.bsr,
    category: data.category,
    capturedAt: data.capturedAt.toISOString(),
    sourceKind: toDataSourceKind(snapshot.source),
    limitation: snapshot.source === "mock" ? "模拟数据仅用于演示，不代表 Amazon 实时事实。" : "公开 Provider 数据可能存在延迟或字段缺失。"
  };
}

async function executeProductLookup(runId: string) {
  const run = await db.analysisRun.findUniqueOrThrow({ where: { id: runId } });
  const input = run.inputJson as unknown as ProductLookupInput;
  const asin = normalizeAsin(input.asin);
  const capture = await db.dataCapture.create({
    data: {
      userId: run.userId,
      projectId: run.projectId,
      trackedAsinId: run.trackedAsinId,
      marketplace: input.marketplace,
      provider: "SORFTIME",
      apiName: "ProductRequest",
      sourceKind: toDataSourceKind(getSorftimeSource()),
      normalizerVersion: "sorftime-v1",
      schemaVersion: "2026-08-27"
    }
  });

  try {
    const response = await fetchProductRequest(asin, input.marketplace);
    await completeDataCapture(capture.id, response.rawPayload as Prisma.InputJsonValue, response.data.capturedAt);
    await db.analysisRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        provider: "SORFTIME",
        sourceAsOf: response.data.capturedAt,
        resultJson: productResult(response) as Prisma.InputJsonValue,
        completedAt: new Date(),
        errorCode: null,
        errorMessage: null
      }
    });
  } catch (error) {
    await failDataCapture(capture.id, error).catch(() => null);
    await db.analysisRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorCode: "PROVIDER_ERROR",
        errorMessage: error instanceof Error ? error.message : "产品查询失败"
      }
    });
  }

  return db.analysisRun.findUniqueOrThrow({ where: { id: run.id } });
}

function reviewInsights(reviews: Array<{ rating: number; title: string | null; body: string | null }>) {
  const terms = [{ key: "质量/耐用性", words: ["quality", "broke", "broken", "durable", "cheap"] }, { key: "尺寸/适配", words: ["size", "fit", "small", "large"] }, { key: "使用体验", words: ["easy", "difficult", "hard", "instructions"] }, { key: "包装/配送", words: ["package", "packaging", "shipping", "delivery"] }];
  const themes = terms.map((term) => ({ label: term.key, reviews: reviews.filter((review) => term.words.some((word) => `${review.title ?? ""} ${review.body ?? ""}`.toLowerCase().includes(word))) })).filter((theme) => theme.reviews.length);
  const excerpts = reviews.filter((review) => review.body).slice(0, 8).map((review) => ({ rating: review.rating, excerpt: `${review.title ? `${review.title} — ` : ""}${review.body}`.slice(0, 420) }));
  const lowStar = reviews.filter((review) => review.rating <= 3);
  return { totalReviews: reviews.length, lowStarCount: lowStar.length, lowStarPercent: reviews.length ? Math.round((lowStar.length / reviews.length) * 100) : 0, painPoints: themes.map((theme) => ({ label: theme.label, count: theme.reviews.length, recommendation: `优先核查与“${theme.label}”相关的产品、说明或 Listing 表述。` })), sellingPoints: [], variantIssues: { status: "未识别", note: "Canopy 评论响应未提供可验证的变体标识；本次不推断变体问题。" }, excerpts, limitation: "结论基于本次最多 3 页 Canopy 公开评论与规则主题匹配；未命中的主题不代表不存在。" };
}

async function executeReviewInsights(runId: string) {
  const run = await db.analysisRun.findUniqueOrThrow({ where: { id: runId } }); const input = run.inputJson as unknown as ReviewInsightsInput; const asin = normalizeAsin(input.asin);
  const capture = await db.dataCapture.create({ data: { userId: run.userId, projectId: run.projectId, marketplace: input.marketplace, provider: "CANOPY", apiName: "AmazonProductReviews", sourceKind: "LIVE_PROVIDER", normalizerVersion: "canopy-rest-v1", schemaVersion: "2026-08-28" } });
  try {
    const response = await fetchCanopyReviews({ asin, marketplace: input.marketplace, lowStarOnly: input.lowStarOnly }); const capturedAt = new Date();
    await completeDataCapture(capture.id, response.rawPayload as Prisma.InputJsonValue, capturedAt);
    const result = reviewInsights(response.reviews);
    await db.$transaction(async (tx) => { await tx.analysisEvidence.deleteMany({ where: { analysisRunId: run.id } }); await tx.analysisEvidence.createMany({ data: result.excerpts.map((item, index) => ({ analysisRunId: run.id, label: `评论原话 ${index + 1}（${item.rating} 星）`, excerpt: item.excerpt, fieldPath: "canopy.reviews", observedAt: capturedAt })) }); await tx.analysisRun.update({ where: { id: run.id }, data: { status: "SUCCESS", provider: "CANOPY", sourceAsOf: capturedAt, resultJson: { asin, ...result, sourceKind: "LIVE_PROVIDER" } as Prisma.InputJsonValue, completedAt: capturedAt, errorCode: null, errorMessage: null } }); });
  } catch (error) { await failDataCapture(capture.id, error).catch(() => null); await db.analysisRun.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date(), errorCode: "CANOPY_ERROR", errorMessage: error instanceof Error ? error.message : "评论分析失败" } }); }
  return db.analysisRun.findUniqueOrThrow({ where: { id: run.id } });
}

export async function createReviewInsightsRun(userId: string, rawInput: ReviewInsightsInput) {
  const input = { asin: normalizeAsin(rawInput.asin), marketplace: rawInput.marketplace.trim(), lowStarOnly: rawInput.lowStarOnly, projectId: rawInput.projectId };
  if (!input.marketplace) throw new Error("请选择站点"); if (input.projectId) { const project = await db.project.findFirst({ where: { id: input.projectId, userId }, select: { marketplace: true } }); if (!project || project.marketplace !== input.marketplace) throw new Error("项目不存在或站点不一致"); }
  const run = await db.analysisRun.create({ data: { userId, projectId: input.projectId, toolKey: "review-insights", analysisType: "REVIEW_INSIGHTS", marketplace: input.marketplace, status: "RUNNING", inputJson: input, inputFingerprint: inputFingerprint(input), startedAt: new Date(), attemptCount: 1 } }); return executeReviewInsights(run.id);
}

async function executeKeywordResearch(runId: string) {
  const run = await db.analysisRun.findUniqueOrThrow({ where: { id: runId } }); const input = run.inputJson as unknown as KeywordResearchInput; const asin = normalizeAsin(input.asin);
  const capture = await db.dataCapture.create({ data: { userId: run.userId, projectId: run.projectId, trackedAsinId: run.trackedAsinId, marketplace: input.marketplace, provider: "SORFTIME", apiName: "ASINRequestKeyword", sourceKind: toDataSourceKind(getSorftimeSource()), normalizerVersion: "sorftime-v1", schemaVersion: "2026-08-28" } });
  try {
    const response = await fetchAsinRequestKeywords(asin, input.marketplace);
    const capturedAt = new Date();
    await completeDataCapture(capture.id, response.rawPayload as Prisma.InputJsonValue, capturedAt);

    const latestSnapshots = run.trackedAsinId ? await db.productKeywordSnapshot.findMany({
      where: { trackedAsinId: run.trackedAsinId },
      orderBy: { capturedAt: "desc" },
      take: 100,
      select: { keyword: true, naturalRank: true, capturedAt: true }
    }) : [];
    const previousCapturedAt = latestSnapshots[0]?.capturedAt ?? null;
    const previousByKeyword = new Map(latestSnapshots
      .filter((item) => previousCapturedAt && item.capturedAt.getTime() === previousCapturedAt.getTime())
      .map((item) => [item.keyword.trim().toLowerCase(), item.naturalRank]));
    const keywords = response.data.slice(0, 50).map((item) => {
      const previousNaturalRank = previousByKeyword.get(item.keyword.trim().toLowerCase()) ?? null;
      const naturalRankChange = previousNaturalRank !== null && item.naturalRank !== null ? previousNaturalRank - item.naturalRank : null;
      return { keyword: item.keyword, naturalRank: item.naturalRank, previousNaturalRank, naturalRankChange, sponsoredRank: item.sponsoredRank, searchVolume: item.searchVolume, cpc: item.cpc };
    });
    const compared = keywords.filter((item) => item.naturalRankChange !== null);
    const summary = {
      observedKeywordCount: keywords.length,
      comparedKeywordCount: compared.length,
      newlyObservedKeywordCount: keywords.filter((item) => item.previousNaturalRank === null).length,
      improvedKeywordCount: compared.filter((item) => (item.naturalRankChange ?? 0) > 0).length,
      declinedKeywordCount: compared.filter((item) => (item.naturalRankChange ?? 0) < 0).length,
      previousCapturedAt: previousCapturedAt?.toISOString() ?? null
    };
    await db.analysisRun.update({ where: { id: run.id }, data: { status: "SUCCESS", provider: "SORFTIME", sourceAsOf: capturedAt, resultJson: { asin, keywords, summary, sourceKind: toDataSourceKind(response.source), limitation: response.source === "mock" ? "模拟关键词数据仅用于演示。" : "ASINRequestKeyword 提供关键词覆盖、排名与搜索量/CPC 估算；不提供 Amazon 会话、转化或自然/广告流量归因。" } as Prisma.InputJsonValue, completedAt: capturedAt, errorCode: null, errorMessage: null } });
  } catch (error) { await failDataCapture(capture.id, error).catch(() => null); await db.analysisRun.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date(), errorCode: "KEYWORD_PROVIDER_ERROR", errorMessage: error instanceof Error ? error.message : "关键词研究失败" } }); }
  return db.analysisRun.findUniqueOrThrow({ where: { id: run.id } });
}

export async function createKeywordResearchRun(userId: string, rawInput: KeywordResearchInput) {
  const input = { asin: normalizeAsin(rawInput.asin), marketplace: rawInput.marketplace.trim(), projectId: rawInput.projectId, trackedAsinId: rawInput.trackedAsinId };
  if (!input.marketplace) throw new Error("请选择站点");
  if (input.projectId) {
    const project = await db.project.findFirst({ where: { id: input.projectId, userId }, select: { marketplace: true } });
    if (!project || project.marketplace !== input.marketplace) throw new Error("项目不存在或站点不一致");
    if (input.trackedAsinId) {
      const tracked = await db.trackedAsin.findFirst({ where: { id: input.trackedAsinId, projectId: input.projectId, asin: input.asin }, select: { id: true } });
      if (!tracked) throw new Error("项目商品不存在或 ASIN 不一致");
    }
  } else if (input.trackedAsinId) {
    throw new Error("项目商品必须关联项目");
  }
  const run = await db.analysisRun.create({ data: { userId, projectId: input.projectId, trackedAsinId: input.trackedAsinId, toolKey: "keyword-research", analysisType: "KEYWORD_RESEARCH", marketplace: input.marketplace, status: "RUNNING", inputJson: input, inputFingerprint: inputFingerprint(input), startedAt: new Date(), attemptCount: 1 } });
  return executeKeywordResearch(run.id);
}

async function executeListingDiagnosis(runId: string) {
  const run = await db.analysisRun.findUniqueOrThrow({ where: { id: runId } }); const input = run.inputJson as unknown as ListingDiagnosisInput;
  try {
    const tracked = await db.trackedAsin.findFirst({ where: { id: input.trackedAsinId, projectId: input.projectId, project: { userId: run.userId } }, include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 2 }, keywordSnapshots: { orderBy: { capturedAt: "desc" }, take: 50 } } });
    if (!tracked) throw new Error("项目商品不存在");
    const snapshot = tracked.snapshots[0]; const previous = tracked.snapshots[1];
    if (!snapshot) throw new Error("尚无商品快照，无法诊断");
    const hasImages = Array.isArray(snapshot.photoUrls) && snapshot.photoUrls.length > 0;
    const hasAPlusImages = Array.isArray(snapshot.ebcPhotoUrls) && snapshot.ebcPhotoUrls.length > 0;
    const imageCount = Array.isArray(snapshot.photoUrls) ? snapshot.photoUrls.length : 0;
    const aPlusImageCount = Array.isArray(snapshot.ebcPhotoUrls) ? snapshot.ebcPhotoUrls.length : 0;
    const findings = [
      { label: "数据新鲜度", status: "PASS", advice: `本次诊断基于 ${snapshot.capturedAt.toLocaleString("zh-CN")} 的最新 Listing 快照。` },
      { label: "标题与品牌", status: snapshot.title && snapshot.brand ? "PASS" : "ACTION", advice: snapshot.title && snapshot.brand ? "标题和品牌字段均已采集，可结合目标关键词人工检查表达。" : "标题或品牌字段缺失，建议重新采集并核对商品详情页。" },
      { label: "价格与促销", status: snapshot.price !== null ? "PASS" : "ACTION", advice: snapshot.price !== null ? `当前价格 ${snapshot.price.toString()}${snapshot.coupon !== null || snapshot.dealType ? `；${[snapshot.coupon !== null ? "已识别 Coupon" : "", snapshot.dealType ? `促销类型 ${snapshot.dealType}` : ""].filter(Boolean).join("，")}` : ""}。` : "未采集到价格，需核对 Buy Box 或站点可售状态。" },
      { label: "评分与评论", status: snapshot.rating !== null && snapshot.reviewCount !== null ? "PASS" : "ACTION", advice: snapshot.rating !== null ? `评分 ${snapshot.rating.toString()}，评论数 ${snapshot.reviewCount ?? "未知"}。` : "未采集到评分，建议核对 Listing 页面与采集状态。" },
      { label: "大类排名（BSR）", status: snapshot.bsr !== null ? "PASS" : "ACTION", advice: snapshot.bsr !== null ? `当前 BSR 为 #${snapshot.bsr}${previous?.bsr !== null && previous?.bsr !== undefined ? `，相对上一快照 ${previous.bsr - snapshot.bsr > 0 ? "上升" : previous.bsr - snapshot.bsr < 0 ? "下降" : "持平"}。` : "。"}` : "未采集到 BSR，可能是类目字段缺失或页面不可用。" },
      { label: "变体与履约", status: snapshot.variantCount !== null || snapshot.isFBA !== null ? "PASS" : "ACTION", advice: `变体数 ${snapshot.variantCount ?? "未知"}；${snapshot.isFBA === null ? "FBA 状态未知" : snapshot.isFBA ? "FBA" : "非 FBA"}${snapshot.buyboxSeller ? `；Buy Box 卖家 ${snapshot.buyboxSeller}` : ""}。` },
      { label: "主图与 A+", status: hasImages ? "PASS" : "ACTION", advice: hasImages ? `已采集 ${imageCount} 张商品图${hasAPlusImages ? `，${aPlusImageCount} 张 A+ 图片` : "；未采集到 A+ 图片"}。` : "未采集到商品图，建议核对 Listing 素材或采集响应。" },
      { label: "关键词覆盖", status: tracked.keywordSnapshots.length ? "PASS" : "ACTION", advice: tracked.keywordSnapshots.length ? `已有 ${tracked.keywordSnapshots.length} 条已保存关键词观察；可在“关键词分析”查看排名变化与需求信号。` : "尚无关键词观察，请先运行关键词分析。" }
    ];
    await db.analysisRun.update({ where: { id: run.id }, data: { status: "SUCCESS", provider: "LOCAL_FACTS", sourceAsOf: snapshot.capturedAt, resultJson: { asin: tracked.asin, findings, limitation: "诊断只读取已保存的 Listing 快照与关键词观察，不请求外部 Provider，也不推断未采集字段。" } as Prisma.InputJsonValue, completedAt: new Date(), errorCode: null, errorMessage: null } });
  } catch (error) { await db.analysisRun.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date(), errorCode: "DIAGNOSIS_INPUT_ERROR", errorMessage: error instanceof Error ? error.message : "Listing 诊断失败" } }); }
  return db.analysisRun.findUniqueOrThrow({ where: { id: run.id } });
}

export async function createListingDiagnosisRun(userId: string, input: ListingDiagnosisInput) { const tracked = await db.trackedAsin.findFirst({ where: { id: input.trackedAsinId, projectId: input.projectId, project: { userId } }, select: { marketplace: true } }); if (!tracked) throw new Error("项目商品不存在"); const run = await db.analysisRun.create({ data: { userId, projectId: input.projectId, trackedAsinId: input.trackedAsinId, toolKey: "listing-diagnosis", analysisType: "LISTING_DIAGNOSIS", marketplace: tracked.marketplace, status: "RUNNING", inputJson: input, inputFingerprint: inputFingerprint(input), startedAt: new Date(), attemptCount: 1 } }); return executeListingDiagnosis(run.id); }

export async function createProductLookupRun(userId: string, rawInput: ProductLookupInput) {
  const input = { asin: normalizeAsin(rawInput.asin), marketplace: rawInput.marketplace.trim() };
  if (!input.marketplace) throw new Error("请选择站点");
  const run = await db.analysisRun.create({
    data: {
      userId,
      toolKey: "product-lookup",
      analysisType: "PRODUCT_LOOKUP",
      marketplace: input.marketplace,
      status: "RUNNING",
      inputJson: input,
      inputFingerprint: inputFingerprint(input),
      startedAt: new Date(),
      attemptCount: 1
    }
  });
  return executeProductLookup(run.id);
}

export async function retryAnalysisRun(userId: string, runId: string) {
  const run = await db.analysisRun.findFirst({ where: { id: runId, userId } });
  if (!run) throw new Error("分析任务不存在");
  if (!["PRODUCT_LOOKUP", "REVIEW_INSIGHTS", "KEYWORD_RESEARCH", "LISTING_DIAGNOSIS"].includes(run.analysisType)) throw new Error("该工具暂不支持重试");
  await db.analysisRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", startedAt: new Date(), completedAt: null, resultJson: Prisma.JsonNull, errorCode: null, errorMessage: null, attemptCount: { increment: 1 } }
  });
  if (run.analysisType === "PRODUCT_LOOKUP") return executeProductLookup(run.id); if (run.analysisType === "REVIEW_INSIGHTS") return executeReviewInsights(run.id); return run.analysisType === "KEYWORD_RESEARCH" ? executeKeywordResearch(run.id) : executeListingDiagnosis(run.id);
}

export async function attachAnalysisRunToProject(userId: string, runId: string, projectId: string) {
  const project = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true, marketplace: true } });
  if (!project) throw new Error("项目不存在或无权访问");
  const run = await db.analysisRun.findFirst({ where: { id: runId, userId } });
  if (!run) throw new Error("分析任务不存在");
  if (run.marketplace !== project.marketplace) throw new Error("只能关联相同站点的项目");
  return db.analysisRun.update({ where: { id: runId }, data: { projectId: project.id } });
}
