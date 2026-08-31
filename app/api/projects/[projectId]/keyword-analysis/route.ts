import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { createKeywordResearchRun } from "@/server/services/analysis/analysis-runs";

const inputSchema = z.object({ trackedAsinIds: z.array(z.string()).min(1).max(50) });

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请选择 1 至 50 个项目 ASIN" }, { status: 400 });

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: { id: true, marketplace: true, trackedAsins: { where: { id: { in: parsed.data.trackedAsinIds }, status: "ACTIVE" }, select: { id: true, asin: true } } }
  });
  if (!project) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });
  if (project.trackedAsins.length !== new Set(parsed.data.trackedAsinIds).size) return NextResponse.json({ error: "包含不存在或未启用的项目 ASIN" }, { status: 400 });

  const byId = new Map(project.trackedAsins.map((item) => [item.id, item]));
  try {
    const runs = [] as Array<{ id: string; asin: string; status: string; result: unknown; errorMessage: string | null }>;
    for (const trackedAsinId of parsed.data.trackedAsinIds) {
      const tracked = byId.get(trackedAsinId);
      if (!tracked) continue;
      const run = await createKeywordResearchRun(session.user.id, { asin: tracked.asin, marketplace: project.marketplace, projectId: project.id, trackedAsinId: tracked.id });
      runs.push({ id: run.id, asin: tracked.asin, status: run.status, result: run.resultJson, errorMessage: run.errorMessage });
    }
    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "关键词分析失败" }, { status: 400 });
  }
}
