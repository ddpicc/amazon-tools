import OpenAI from "openai";
import { sanitizeDigestText } from "@/lib/digest-display";

type DigestSections = {
  ownProduct: string;
  competitors: string;
};

export type DigestContextItem = {
  asin: string;
  title: string | null;
  role: "OWN" | "COMPETITOR";
  latestCapturedAt: string | null;
  summaryLines: string[];
  recentSnapshots: Array<{
    capturedAt: string;
    price: number | null;
    rating: number | null;
    reviewCount: number | null;
    bsr: number | null;
    monthlySales: number | null;
    dailySales: number | null;
    sellerCount: number | null;
    buyboxSeller: string | null;
  }>;
  latestMetrics: Record<string, string | number | null>;
  keywordChanges: string[];
};

export type ProjectDigestAiContext = {
  project: string;
  marketplace: string;
  digestDate: string;
  ownAsins: DigestContextItem[];
  competitorAsins: DigestContextItem[];
  ownChanges: Array<{ asin: string; lines: string[] }>;
  competitorChanges: Array<{ asin: string; lines: string[] }>;
};

const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

function createOpenAIClient(apiKey: string, baseURL: string) {
  return new OpenAI({
    apiKey,
    baseURL: baseURL.replace(/\/+$/, "")
  });
}

function normalizeSection(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const next = value.trim();
  return next || fallback;
}

export function buildFallbackDigestSections(context: ProjectDigestAiContext): DigestSections {
  const formatAsinChanges = (items: Array<{ asin: string; lines: string[] }>) =>
    items
      .map((item) => {
        const lines = item.lines.slice(0, 8).map(sanitizeDigestText).filter(Boolean);
        return lines.length ? `${item.asin}：${lines.join("；")}` : null;
      })
      .filter((item): item is string => Boolean(item))
      .join("\n\n");

  const ownLines = formatAsinChanges(context.ownChanges);
  const competitorLines = formatAsinChanges(context.competitorChanges);

  return {
    ownProduct: ownLines.length
      ? ownLines
      : "自有商品今天未发现明显变化。",
    competitors: competitorLines.length
      ? competitorLines
      : "竞品今天未发现明显变化。"
  };
}

export function formatDigestText(title: string, sections: DigestSections) {
  return [
    title,
    "",
    `你的产品变化：${sections.ownProduct}`,
    `竞品变化：${sections.competitors}`
  ].join("\n");
}

export async function generateAiDigestSections(context: ProjectDigestAiContext) {
  const fallback = buildFallbackDigestSections(context);
  const apiKey = process.env.OPENAI_KEY;
  const apiUrl = process.env.OPENAI_URL;

  if (!apiKey || !apiUrl) {
    return {
      sections: fallback,
      usedAi: false
    };
  }

  const client = createOpenAIClient(apiKey, apiUrl);
  const response = await client.chat.completions.create({
      model: defaultModel,
      temperature: 0.3,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content:
            "你是一个亚马逊竞品监控日报助手。请基于输入的已采集数据，生成简洁的中文日报，只返回 JSON，键固定为 ownProduct、competitors。不要输出今日总览、建议动作或其他第三部分。\n\n你的产品变化必须优先检查并简洁说明：Listing 是否仍在售或状态未知、Buy Box 是否仍存在、是否出现跟卖、FBA 配送费是否变化、BSR、销量估算、评论数是否变化。\n\n竞品变化必须优先检查并简洁说明：价格、优惠券或秒杀、评分、主图和 A+ 是否变化、关键词自然排名是上升还是下降。\n\n每个 ASIN 必须单独成段，以 ASIN 开头，ASIN 之间用换行分隔，不能把多个 ASIN 混成一段。评论只写“新增几星评论”或评论数量变化，不要输出评论标题、正文或用户原话。只依据输入数据，不要把状态未知写成确定下架或确定有/无变化；没有变化时写“未发现明显变化”。每个 ASIN 只保留最重要的变化，避免冗长。"
        },
        {
          role: "user",
          content: JSON.stringify(context, null, 2)
        }
      ]
    });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    return {
      sections: fallback,
      usedAi: false
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      sections: fallback,
      usedAi: false
    };
  }

  return {
    sections: {
      ownProduct: sanitizeDigestText(normalizeSection(parsed.ownProduct, fallback.ownProduct)),
      competitors: sanitizeDigestText(normalizeSection(parsed.competitors, fallback.competitors))
    },
    usedAi: true
  };
}
