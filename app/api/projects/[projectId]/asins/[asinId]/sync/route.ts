import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { createApiErrorResponse } from "@/server/services/billing/api-error-response";
import { syncTrackedAsin } from "@/server/services/sync-tracked-asin";
export async function POST(
  _request: Request,
  { params }: { params: { projectId: string; asinId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trackedAsin = await db.trackedAsin.findFirst({
    where: {
      id: params.asinId,
      projectId: params.projectId,
      project: {
        userId: session.user.id
      }
    },
    select: {
      id: true
    }
  });

  if (!trackedAsin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await syncTrackedAsin(trackedAsin.id);
    return NextResponse.json({
      ok: true,
      snapshotCapturedAt: result.snapshot.capturedAt
    });
  } catch (error) {
    return createApiErrorResponse(error, "手动刷新失败，请稍后重试。");
  }
}
