import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createListingDeepAnalysisRun } from "@/server/services/analysis/listing-deep-analysis";

const schema = z.object({ ownTrackedAsinId: z.string().min(1), competitorTrackedAsinIds: z.array(z.string().min(1)).min(1).max(20) });
const encoder = new TextEncoder();

function event(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请选择一个自有 ASIN 和至少一个竞品 ASIN" }, { status: 400 });
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = await createListingDeepAnalysisRun(
          session.user.id,
          { projectId: params.projectId, ...parsed.data },
          (progress) => controller.enqueue(event({ type: "progress", ...progress }))
        );
        controller.enqueue(event({ type: "complete", id: run.id, status: run.status, result: run.resultJson, errorMessage: run.errorMessage }));
      } catch (error) {
        controller.enqueue(event({ type: "error", error: error instanceof Error ? error.message : "Listing 深度分析失败" }));
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
