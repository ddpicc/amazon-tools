import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { sendProjectDailyDigest } from "@/server/services/daily-digests";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: { id: true }
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await sendProjectDailyDigest(project.id, new Date());
    return NextResponse.json({
      ok: true,
      skipped: "skipped" in result ? result.skipped : false,
      reason: "reason" in result ? result.reason : null,
      status: result.run.status
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "日报生成失败" },
      { status: 500 }
    );
  }
}
