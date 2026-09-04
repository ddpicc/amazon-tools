import crypto from "node:crypto";
import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { syncTrackedAsin } from "@/server/services/sync-tracked-asin";

export type ListingDeepAnalysisInput = { projectId: string; ownTrackedAsinId: string; competitorTrackedAsinIds: string[] };
export type ListingDeepAnalysisProgress = { phase: "REFRESHING" | "GENERATING_AI" | "SAVING"; completed: number; total: number; asin?: string };

type KeywordFact = { keyword: string; naturalRank: number | null; sponsoredRank: number | null; searchVolume: number | null; cpc: number | null; searchPosition: string | null; showShare: number | null; productCount: number | null; positionType: string[]; top3Asins: string[]; top3Brands: string[] };
type ListingFact = { trackedAsinId: string; asin: string; role: "OWN" | "COMPETITOR"; title: string | null; brand: string | null; description: string | null; properties: unknown; price: string | null; rating: string | null; reviewCount: number | null; bsr: number | null; category: string | null; variantCount: number | null; photoUrls: string[]; ebcPhotoUrls: string[]; keywords: KeywordFact[]; snapshotId: string; capturedAt: Date };

function fingerprint(input: object) { return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 5) : []; }
function text(value: unknown, limit = 3000) { if (typeof value === "string") return value.slice(0, limit); if (value && typeof value === "object") return JSON.stringify(value).slice(0, limit); return null; }
function normalizeOpenAiBaseUrl(value: string) { return value.replace(/([^:]\/)\/{2,}/g, "$1").replace(/\/+$/, ""); }
function latestKeywords(items: Array<{ keyword: string; naturalRank: number | null; sponsoredRank: number | null; searchVolume: number | null; cpc: { toString(): string } | null; capturedAt: Date; rawPayload: unknown }>): KeywordFact[] {
  const capturedAt = items[0]?.capturedAt;
  if (!capturedAt) return [];
  return items.filter((item) => item.capturedAt.getTime() === capturedAt.getTime()).slice(0, 20).map((item) => { const raw = item.rawPayload && typeof item.rawPayload === "object" ? item.rawPayload as Record<string, unknown> : {}; const details = raw.Keyword && typeof raw.Keyword === "object" ? raw.Keyword as Record<string, unknown> : raw; return { keyword: item.keyword, naturalRank: item.naturalRank, sponsoredRank: item.sponsoredRank, searchVolume: item.searchVolume, cpc: item.cpc ? Number(item.cpc.toString()) : null, searchPosition: typeof raw.SearchPosition === "string" ? raw.SearchPosition : null, showShare: typeof raw.ShowShare === "number" && raw.ShowShare >= 0 ? raw.ShowShare : null, productCount: typeof details.ProductCount === "number" ? details.ProductCount : null, positionType: Array.isArray(raw.PositionType) ? raw.PositionType.filter((value): value is string => typeof value === "string") : [], top3Asins: Array.isArray(details.Top3asin) ? details.Top3asin.filter((value): value is string => typeof value === "string") : [], top3Brands: Array.isArray(details.Top3Brand) ? details.Top3Brand.filter((value): value is string => typeof value === "string") : [] }; });
}

function fallback(own: ListingFact, competitors: ListingFact[], refresh: Array<{ asin: string; status: string; error?: string }>) {
  const competitorKeywords = competitors.flatMap((item) => item.keywords.map((keyword) => keyword.keyword));
  const ownKeywords = new Set(own.keywords.map((keyword) => keyword.keyword.toLowerCase()));
  const gaps = [...new Set(competitorKeywords.filter((keyword) => !ownKeywords.has(keyword.toLowerCase())))].slice(0, 12);
  return {
    generatedBy: "LOCAL_FACTS",
    overview: `已基于 ${own.asin} 与 ${competitors.length} 个竞品的最新公开快照完成事实对比。${gaps.length ? `发现 ${gaps.length} 个竞品覆盖、但自有 Listing 未观察到的关键词。` : "当前关键词快照未识别到明确的竞品覆盖缺口。"}`,
    refresh,
    imageSuggestions: [{ observation: `自有 Listing 已采集 ${own.photoUrls.length} 张商品图和 ${own.ebcPhotoUrls.length} 张 A+ 图片；竞品图片数量为 ${competitors.map((item) => `${item.asin}: ${item.photoUrls.length}`).join("，") || "无"}。`, competitorStrength: "未使用 AI 图像理解，因此不对图片中的具体元素作推断。", recommendedChange: "请在配置 AI 模型后重新运行，以获得基于实际图片内容的逐图建议。" }],
    copySuggestions: [{ area: "标题、五点与描述", observation: `当前仅保存了标题、描述与属性事实；自有标题长度 ${own.title?.length ?? 0}，描述长度 ${own.description?.length ?? 0}。`, recommendation: "先补齐产品卖点、使用场景、规格和差异化证据，再结合关键词覆盖重写。", suggestedRewrite: null }],
    keywordAndAdvertising: { keywordGaps: gaps, recommendedKeywords: gaps, suggestedSearchTerms: gaps.join(" "), advertisingPlan: "先从竞品覆盖且自有快照未出现的关键词中人工筛选相关词，按精准、词组、广泛匹配分组测试；本结果不是广告效果或流量归因数据。" },
    limitations: ["本次未使用 AI 模型，图片和文案建议仅为事实驱动的待办。", "关键词、搜索量和 CPC 来自公开数据服务估算，不代表实际广告流量、转化或 Amazon Search Term 的合规结论。"]
  };
}

function normalizeResult(value: unknown, fallbackResult: ReturnType<typeof fallback>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallbackResult;
  const result = value as Record<string, unknown>;
  return {
    ...fallbackResult,
    generatedBy: "AI",
    overview: typeof result.overview === "string" ? result.overview : fallbackResult.overview,
    imageSuggestions: Array.isArray(result.imageSuggestions) ? result.imageSuggestions : fallbackResult.imageSuggestions,
    copySuggestions: Array.isArray(result.copySuggestions) ? result.copySuggestions : fallbackResult.copySuggestions,
    keywordAndAdvertising: result.keywordAndAdvertising && typeof result.keywordAndAdvertising === "object" ? result.keywordAndAdvertising : fallbackResult.keywordAndAdvertising,
    limitations: Array.isArray(result.limitations) ? result.limitations : fallbackResult.limitations
  };
}

async function generateAiResult(own: ListingFact, competitors: ListingFact[], refresh: Array<{ asin: string; status: string; error?: string }>) {
  const fallbackResult = fallback(own, competitors, refresh);
  const apiKey = process.env.OPENAI_KEY; const baseURL = process.env.OPENAI_URL;
  if (!apiKey || !baseURL) return fallbackResult;
  const facts = { own, competitors };
  const imageParts = [own, ...competitors].flatMap((item) => item.photoUrls.slice(0, 3).flatMap((url, index) => [{ type: "text" as const, text: `${item.role === "OWN" ? "自有" : "竞品"} ${item.asin} 图片 ${index + 1}` }, { type: "image_url" as const, image_url: { url, detail: "low" as const } }]));
  try {
    const client = new OpenAI({ apiKey, baseURL: normalizeOpenAiBaseUrl(baseURL) });
    const response = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.25, response_format: { type: "json_object" }, messages: [{ role: "system", content: "你是亚马逊 Listing 优化顾问。严格依据公开 Listing、图片与关键词证据，不得编造广告效果或销量。输出中文 JSON：overview、imageSuggestions、copySuggestions、keywordAndAdvertising、limitations。keywordAndAdvertising 必须分别给出 competitorKeywords（竞品实际曝光词及证据）、ownPriorityKeywords（自有应主打词，含搜索量/位置/份额/竞争依据）、keywordGaps、recommendedKeywords、suggestedSearchTerms、advertisingPlan。标题和五点建议必须逐项写明 targetKeywords 与 dataEvidence，并将这些词自然融入 suggestedRewrite；不要把 ShowShare=-1 当成负数。" }, { role: "user", content: [{ type: "text", text: JSON.stringify(facts) }, ...imageParts] }] });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 接口未返回 chat.completions.choices[0].message.content；请检查 OPENAI_URL 是否指向 /v1 API 端点及网关兼容性。");
    return normalizeResult(JSON.parse(content), fallbackResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 调用失败";
    throw new Error(`AI 深度分析调用失败：${message}`);
  }
}

async function loadFacts(ids: string[]) {
  const tracked = await db.trackedAsin.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 }, keywordSnapshots: { orderBy: { capturedAt: "desc" }, take: 80 } } });
  return tracked.flatMap((item): ListingFact[] => {
    const snapshot = item.snapshots[0]; if (!snapshot) return [];
    return [{ trackedAsinId: item.id, asin: item.asin, role: item.role, title: snapshot.title, brand: snapshot.brand, description: snapshot.description, properties: snapshot.properties, price: snapshot.price?.toString() ?? null, rating: snapshot.rating?.toString() ?? null, reviewCount: snapshot.reviewCount, bsr: snapshot.bsr, category: snapshot.category, variantCount: snapshot.variantCount, photoUrls: strings(snapshot.photoUrls), ebcPhotoUrls: strings(snapshot.ebcPhotoUrls), keywords: latestKeywords(item.keywordSnapshots), snapshotId: snapshot.id, capturedAt: snapshot.capturedAt }];
  });
}

export async function createListingDeepAnalysisRun(
  userId: string,
  input: ListingDeepAnalysisInput,
  onProgress?: (progress: ListingDeepAnalysisProgress) => void | Promise<void>
) {
  const reportProgress = async (progress: ListingDeepAnalysisProgress) => {
    try {
      await onProgress?.(progress);
    } catch {
      // Progress delivery must never interrupt the analysis itself.
    }
  };
  const competitorIds = [...new Set(input.competitorTrackedAsinIds)].filter((id) => id !== input.ownTrackedAsinId);
  const project = await db.project.findFirst({ where: { id: input.projectId, userId }, select: { id: true, marketplace: true, trackedAsins: { where: { id: { in: [input.ownTrackedAsinId, ...competitorIds] }, status: "ACTIVE" }, select: { id: true, asin: true, role: true } } } });
  if (!project) throw new Error("项目不存在或无权访问");
  const own = project.trackedAsins.find((item) => item.id === input.ownTrackedAsinId && item.role === "OWN");
  if (!own) throw new Error("请选择项目中的自有 ASIN");
  if (!competitorIds.length) throw new Error("请至少选择一个竞品 ASIN");
  if (competitorIds.some((id) => !project.trackedAsins.some((item) => item.id === id && item.role === "COMPETITOR"))) throw new Error("竞品 ASIN 不属于当前项目或未启用");
  const normalized = { projectId: project.id, ownTrackedAsinId: own.id, competitorTrackedAsinIds: competitorIds };
  const run = await db.analysisRun.create({ data: { userId, projectId: project.id, trackedAsinId: own.id, toolKey: "listing-deep-analysis", analysisType: "COMPETITOR_COMPARE", marketplace: project.marketplace, status: "RUNNING", inputJson: normalized, inputFingerprint: fingerprint(normalized), startedAt: new Date(), attemptCount: 1, promptVersion: "listing-deep-analysis-v1", model: process.env.OPENAI_MODEL || "gpt-4o-mini" } });
  const selected = [own.id, ...competitorIds]; const refresh: Array<{ asin: string; status: string; error?: string }> = [];
  const selectedTrackedAsins = project.trackedAsins.filter((item) => selected.includes(item.id));
  for (const [index, item] of selectedTrackedAsins.entries()) {
    await reportProgress({ phase: "REFRESHING", completed: index, total: selectedTrackedAsins.length, asin: item.asin });
    try { await syncTrackedAsin(item.id, { skipManualLimit: true, jobType: "listing_deep_analysis" }); refresh.push({ asin: item.asin, status: "SUCCESS" }); }
    catch (error) { refresh.push({ asin: item.asin, status: "FAILED", error: error instanceof Error ? error.message : "刷新失败" }); }
    await reportProgress({ phase: "REFRESHING", completed: index + 1, total: selectedTrackedAsins.length, asin: item.asin });
  }
  try {
    const facts = await loadFacts(selected); const ownFacts = facts.find((item) => item.trackedAsinId === own.id);
    const competitors = facts.filter((item) => competitorIds.includes(item.trackedAsinId));
    if (!ownFacts) throw new Error("自有 ASIN 没有可用 Listing 快照");
    if (!competitors.length) throw new Error("所选竞品没有可用 Listing 快照");
    await reportProgress({ phase: "GENERATING_AI", completed: selectedTrackedAsins.length, total: selectedTrackedAsins.length });
    const result = await generateAiResult(ownFacts, competitors, refresh);
    const sourceAsOf = new Date(Math.max(...facts.map((item) => item.capturedAt.getTime())));
    await reportProgress({ phase: "SAVING", completed: selectedTrackedAsins.length, total: selectedTrackedAsins.length });
    await db.$transaction(async (tx) => { await tx.analysisEvidence.createMany({ data: facts.flatMap((item) => [{ analysisRunId: run.id, productSnapshotId: item.snapshotId, label: `${item.role === "OWN" ? "自有" : "竞品"} Listing 快照`, fieldPath: "ProductSnapshot", observedAt: item.capturedAt }, ...item.keywords.map((keyword) => ({ analysisRunId: run.id, label: `${item.asin} 关键词：${keyword.keyword}`, fieldPath: "ProductKeywordSnapshot", observedAt: item.capturedAt }))]) }); await tx.analysisRun.update({ where: { id: run.id }, data: { status: "SUCCESS", provider: result.generatedBy === "AI" ? "OPENAI" : "LOCAL_FACTS", sourceAsOf, resultJson: { own: ownFacts, competitors, ...result } as Prisma.InputJsonValue, completedAt: new Date(), errorCode: null, errorMessage: null } }); });
  } catch (error) { await db.analysisRun.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date(), errorCode: "LISTING_DEEP_ANALYSIS_ERROR", errorMessage: error instanceof Error ? error.message : "Listing 深度分析失败" } }); }
  return db.analysisRun.findUniqueOrThrow({ where: { id: run.id } });
}
