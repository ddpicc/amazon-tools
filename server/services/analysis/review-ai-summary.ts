import OpenAI from "openai";

export type ReviewForAnalysis = {
  rating: number;
  title: string | null;
  content: string | null;
  reviewerName: string | null;
  reviewDate: string | null;
  helpfulCount: number | null;
};

type ReviewAiSummary = {
  overview: string;
  keyThemes: Array<{ theme: string; sentiment: "positive" | "negative" | "mixed"; evidenceCount: number; detail: string }>;
  strengths: string[];
  recommendedActions: string[];
  limitations: string[];
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 8) : [];
}

function normalize(value: unknown): ReviewAiSummary {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const keyThemes = Array.isArray(source.keyThemes) ? source.keyThemes.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const theme = item as Record<string, unknown>;
    const sentiment: "positive" | "negative" | "mixed" = theme.sentiment === "positive" || theme.sentiment === "negative" || theme.sentiment === "mixed" ? theme.sentiment : "mixed";
    return [{ theme: text(theme.theme, "未命名主题"), sentiment, evidenceCount: Number.isFinite(Number(theme.evidenceCount)) ? Math.max(0, Math.round(Number(theme.evidenceCount))) : 0, detail: text(theme.detail, "未提供说明") }];
  }).slice(0, 8) : [];
  return {
    overview: text(source.overview, "AI 未返回有效总览。"),
    keyThemes,
    strengths: stringList(source.strengths),
    recommendedActions: stringList(source.recommendedActions),
    limitations: stringList(source.limitations)
  };
}

export async function generateReviewAiSummary(input: { asin: string; marketplace: string; reviews: ReviewForAnalysis[] }) {
  const apiKey = process.env.OPENAI_KEY;
  const baseURL = process.env.OPENAI_URL;
  if (!apiKey || !baseURL) throw new Error("AI 总结未配置：需要 OPENAI_KEY 和 OPENAI_URL");

  const reviews = input.reviews.slice(0, 60).map((review) => ({
    rating: review.rating,
    title: review.title?.slice(0, 240) ?? null,
    content: review.content?.slice(0, 1200) ?? null,
    reviewerName: review.reviewerName,
    reviewDate: review.reviewDate,
    helpfulCount: review.helpfulCount
  }));
  const client = new OpenAI({ apiKey, baseURL: baseURL.replace(/\/+$/, "") });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "你是亚马逊产品评论分析师。只依据输入评论，不得编造产品事实、销量、竞品或用户动机。用中文输出 JSON，键固定为 overview、keyThemes、strengths、recommendedActions、limitations。keyThemes 每项为 theme、sentiment（positive/negative/mixed）、evidenceCount、detail。区分评论中明确出现的事实与推测；样本量或筛选导致的局限必须写入 limitations。" },
      { role: "user", content: JSON.stringify({ asin: input.asin, marketplace: input.marketplace, reviewCount: input.reviews.length, analyzedReviewCount: reviews.length, reviews }) }
    ]
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI 未返回评论总结");
  try {
    return { summary: normalize(JSON.parse(content)), analyzedReviewCount: reviews.length, model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  } catch {
    throw new Error("AI 返回的评论总结不是有效 JSON");
  }
}
