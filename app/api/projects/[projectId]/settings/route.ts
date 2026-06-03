import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";

const settingsSchema = z.object({});

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.projectSettings.findFirst({
    where: {
      projectId: params.projectId,
      project: { userId: session.user.id }
    }
  });

  return NextResponse.json({ settings });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = settingsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settings = await db.projectSettings.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      ...parsed.data
    },
    update: parsed.data
  });

  return NextResponse.json({ settings });
}
