import { auth } from "@/auth";
import { createProductLookupRun, createReviewInsightsRun, createKeywordResearchRun, createListingDiagnosisRun } from "@/server/services/analysis/analysis-runs";
import { NextResponse } from "next/server";
import { z } from "zod";

const productLookupInput = z.object({ toolKey: z.literal("product-lookup"), asin: z.string(), marketplace: z.string() });
const reviewInsightsInput = z.object({ toolKey: z.literal("review-insights"), asin: z.string(), marketplace: z.string(), lowStarOnly: z.boolean().default(true), projectId: z.string().optional() });
const keywordInput = z.object({ toolKey: z.literal("keyword-research"), asin: z.string(), marketplace: z.string(), projectId: z.string().optional(), trackedAsinId: z.string().optional() });
const listingInput = z.object({ toolKey: z.literal("listing-diagnosis"), projectId: z.string(), trackedAsinId: z.string() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null); const parsed = z.union([productLookupInput, reviewInsightsInput, keywordInput, listingInput]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "输入无效" }, { status: 400 });
  try {
    const run = parsed.data.toolKey === "product-lookup" ? await createProductLookupRun(session.user.id, parsed.data) : parsed.data.toolKey === "review-insights" ? await createReviewInsightsRun(session.user.id, parsed.data) : parsed.data.toolKey === "keyword-research" ? await createKeywordResearchRun(session.user.id, parsed.data) : await createListingDiagnosisRun(session.user.id, parsed.data);
    return NextResponse.json({ id: run.id, status: run.status, result: run.resultJson, errorMessage: run.errorMessage });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建分析任务失败" }, { status: 400 });
  }
}
