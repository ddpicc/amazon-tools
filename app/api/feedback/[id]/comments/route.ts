import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const content = String((await request.json()).content || "").trim();
  if (!content)
    return NextResponse.json({ error: "请输入评论" }, { status: 400 });
  const comment = await db.feedbackComment.create({
    data: { content, requestId: params.id, authorId: session.user.id },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
