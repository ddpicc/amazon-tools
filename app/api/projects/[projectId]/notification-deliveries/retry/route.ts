import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { retryFailedProjectWebhookDeliveries } from "@/server/services/alert-notifications";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id
    },
    select: {
      id: true
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await retryFailedProjectWebhookDeliveries(project.id, { limit: 10 });
  return NextResponse.json(result);
}
