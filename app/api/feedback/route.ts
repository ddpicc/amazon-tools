import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await auth();
  const items = await db.feedbackRequest.findMany({
    include: {
      author: { select: { name: true, email: true } },
      comments: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      votes: { where: { userId: session?.user?.id }, select: { id: true } },
      follows: { where: { userId: session?.user?.id }, select: { id: true } },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      isMine: item.authorId === session?.user?.id,
    })),
  });
}
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!title || !content)
    return NextResponse.json(
      { error: "请填写需求标题和说明" },
      { status: 400 },
    );
  const item = await db.feedbackRequest.create({
    data: { title, content, authorId: session.user.id },
  });
  return NextResponse.json({ item }, { status: 201 });
}
