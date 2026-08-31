import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const where = {
    userId_requestId: { userId: session.user.id, requestId: params.id },
  };
  const existing = await db.feedbackFollow.findUnique({ where });
  if (existing) await db.feedbackFollow.delete({ where });
  else {
    await db.feedbackFollow.create({
      data: { userId: session.user.id, requestId: params.id },
    });
  }
  return NextResponse.json({ following: !existing });
}
