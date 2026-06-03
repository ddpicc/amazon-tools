import { NextResponse } from "next/server";
import { TrackedAsinRole } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ensureAsinMonitoringSubscription } from "@/server/services/monitoring-subscriptions";

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

  const created = "asins" in parsed.data
    ? await Promise.all(
        parsed.data.asins.map((asin) =>
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
      )
    : [
        await db.trackedAsin.upsert({
          where: {
            projectId_asin: {
              projectId: project.id,
              asin: parsed.data.asin
            }
          },
          create: {
            projectId: project.id,
            asin: parsed.data.asin,
            marketplace: project.marketplace,
            role: parsed.data.role
          },
          update: {
            status: "ACTIVE",
            role: parsed.data.role
          }
        })
      ];

  await Promise.all(created.map((item) => ensureAsinMonitoringSubscription(item.id).catch(() => null)));

  return NextResponse.json({ items: created }, { status: 201 });
}
