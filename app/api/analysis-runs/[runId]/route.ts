import { auth } from "@/auth";
import { attachAnalysisRunToProject } from "@/server/services/analysis/analysis-runs";
import { NextResponse } from "next/server";
import { z } from "zod";

const input = z.object({ projectId: z.string().min(1) });

export async function PATCH(request: Request, { params }: { params: { runId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "项目无效" }, { status: 400 });
  try {
    await attachAnalysisRunToProject(session.user.id, params.runId, parsed.data.projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "关联项目失败" }, { status: 400 });
  }
}
