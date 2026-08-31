import { NextResponse } from "next/server";
import { TrackedAsinRole } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { createApiErrorResponse } from "@/server/services/billing/api-error-response";
import { assertCanUpsertTrackedAsins } from "@/server/services/entitlements";
import { formatOperationalError } from "@/server/services/failure-classification";
import { syncTrackedAsin } from "@/server/services/sync-tracked-asin";
const trackedAsinRoleSchema = z.nativeEnum(TrackedAsinRole);

const addAsinSchema = z.object({
  asin: z.string().min(5),
  role: trackedAsinRoleSchema.default(TrackedAsinRole.COMPETITOR)
});

const bulkAsinSchema = z.object({
  asins: z.array(z.string().min(5)).min(1),
  role: trackedAsinRoleSchema.default(TrackedAsinRole.COMPETITOR)
});

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await db.trackedAsin.findMany({
    where: { projectId: project.id },
    orderBy: [{ role: "asc" }, { updatedAt: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await request.json();
  const parsed = Array.isArray(json?.asins)
    ? bulkAsinSchema.safeParse(json)
    : addAsinSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const inputAsins = "asins" in parsed.data ? parsed.data.asins : [parsed.data.asin];

  try {
    const { normalizedAsins } = await assertCanUpsertTrackedAsins({
      userId: session.user.id,
      projectId: project.id,
      asins: inputAsins,
      role: parsed.data.role
    });

    const existingActiveItems = await db.trackedAsin.findMany({
      where: {
        projectId: project.id,
        asin: { in: normalizedAsins },
        status: "ACTIVE"
      },
      select: { id: true }
    });
    const existingActiveIds = new Set(existingActiveItems.map((item) => item.id));

    const created = await Promise.all(
      normalizedAsins.map((asin) =>
        db.trackedAsin.upsert({
          where: {
            projectId_asin: {
              projectId: project.id,
              asin
            }
          },
          create: {
            projectId: project.id,
            asin,
            marketplace: project.marketplace,
            role: parsed.data.role
          },
          update: {
            status: "ACTIVE",
            role: parsed.data.role
          }
        })
      )
    );

    const initialCollections = [] as Array<{
      trackedAsinId: string;
      status: "SUCCESS" | "FAILED" | "SKIPPED";
      error?: string;
    }>;

    for (const item of created) {
      if (existingActiveIds.has(item.id)) {
        initialCollections.push({ trackedAsinId: item.id, status: "SKIPPED" });
        continue;
      }

      try {
        await syncTrackedAsin(item.id, {
          skipManualLimit: true,
          jobType: "initial_sync"
        });
        initialCollections.push({ trackedAsinId: item.id, status: "SUCCESS" });
      } catch (error) {
        initialCollections.push({
          trackedAsinId: item.id,
          status: "FAILED",
          error: formatOperationalError(error, "首次采集失败，系统会在下次定时任务中重试。")
        });
      }
    }

    const items = await db.trackedAsin.findMany({
      where: { id: { in: created.map((item) => item.id) } },
      orderBy: [{ role: "asc" }, { updatedAt: "desc" }]
    });

    return NextResponse.json({ items, initialCollections }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "添加 ASIN 失败，请检查输入内容后重试。");
  }
}
