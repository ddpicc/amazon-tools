import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await db.alert.findMany({
    where: {
      projectId: params.projectId,
      project: { userId: session.user.id }
    },
    include: {
      trackedAsin: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({ alerts });
}
