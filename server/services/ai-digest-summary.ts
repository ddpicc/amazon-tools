type DigestSections = {
  overview: string;
  ownProduct: string;
  competitors: string;
  action: string;
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
};

export type ProjectDigestAiContext = {
  project: string;
  marketplace: string;
  digestDate: string;
  ownAsins: DigestContextItem[];
  competitorAsins: DigestContextItem[];
  ownChanges: Array<{ asin: string; lines: string[] }>;
  competitorChanges: Array<{ asin: string; lines: string[] }>;
  crossComparisons: string[];
  stabilityNotes: string[];
};

const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

function normalizeSection(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const next = value.trim();
  return next || fallback;
}

export function buildFallbackDigestSections(context: ProjectDigestAiContext): DigestSections {
  const ownLines = context.ownChanges.flatMap((item) =>
    item.lines.slice(0, 2).map((line) => `${item.asin}：${line}`)
  );
  const competitorLines = context.competitorChanges.flatMap((item) =>
    item.lines.slice(0, 2).map((line) => `${item.asin}：${line}`)
  );

  return {
    overview:
      ownLines.length || competitorLines.length
        ? `今天共监测 ${context.ownAsins.length} 个 own ASIN 和 ${context.competitorAsins.length} 个竞品 ASIN，重点变化集中在${ownLines.length ? " own listing" : ""}${ownLines.length && competitorLines.length ? "和" : ""}${competitorLines.length ? "竞品动作" : ""}。`
        : "今天主要指标整体稳定，没有出现明显的价格、评分、评论或排名波动。",
    ownProduct: ownLines.length
      ? ownLines.join("；")
      : "你的产品今天没有出现明显变化，核心指标整体稳定。",
    competitors: competitorLines.length
      ? competitorLines.join("；")
      : "竞品今天没有明显变化，暂无需要单独点名关注的动作。",
    action: context.crossComparisons.length
      ? `优先关注：${context.crossComparisons.slice(0, 2).join("；")}`
      : "建议继续观察明天的价格、BSR 和评论增长情况，确认当前 listing 状态是否持续稳定。"
  };
}

export function formatDigestText(title: string, sections: DigestSections) {
  return [
    title,
    "",
    `今日总览：${sections.overview}`,
    `你的产品变化：${sections.ownProduct}`,
    `竞品变化：${sections.competitors}`,
    `建议关注：${sections.action}`
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

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: defaultModel,
      temperature: 0.3,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content:
            "你是一个亚马逊竞品监控日报助手。你会收到一个项目中 own ASIN 与 competitor ASIN 的最近几次快照摘要。请基于这些数据生成一份中文运营日报。你必须严格依据输入内容总结，不要编造不存在的数据或原因。请优先指出 own 产品的关键变化、竞品的关键变化、双方对比后最值得关注的点，以及运营上下一步最需要关注的事项。输出要短、清楚、可执行，适合早上快速浏览。请只返回 JSON，键固定为 overview、ownProduct、competitors、action。"
        },
        {
          role: "user",
          content: JSON.stringify(context, null, 2)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI digest generation failed: ${response.status}${errorBody ? ` | ${errorBody}` : ""}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const content = json.choices?.[0]?.message?.content;
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
      overview: normalizeSection(parsed.overview, fallback.overview),
      ownProduct: normalizeSection(parsed.ownProduct, fallback.ownProduct),
      competitors: normalizeSection(parsed.competitors, fallback.competitors),
      action: normalizeSection(parsed.action, fallback.action)
    },
    usedAi: true
  };
}
