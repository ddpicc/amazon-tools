import { auth } from "@/auth";
import { retryAnalysisRun } from "@/server/services/analysis/analysis-runs";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: { runId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const run = await retryAnalysisRun(session.user.id, params.runId);
    return NextResponse.json({ id: run.id, status: run.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "重试失败" }, { status: 400 });
  }
}
