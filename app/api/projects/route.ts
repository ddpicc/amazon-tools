import { TrackedAsinRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { initializeProjectWithSubscriptions } from "@/server/services/project-lifecycle";

const createProjectSchema = z.object({
  name: z.string().min(2),
  marketplace: z.string().min(2),
  syncFrequencyMinutes: z.number().int().positive().max(10080).default(1440),
  ownAsins: z.array(z.string().min(5)).max(3).default([]),
  competitorAsins: z.array(z.string().min(5)).max(20).default([])
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    include: {
      trackedAsins: {
        select: {
          role: true
        }
      },
      _count: {
        select: {
          trackedAsins: true,
          alerts: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const normalizedProjects = projects.map(({ trackedAsins, ...project }) => ({
    ...project,
    counts: {
      ownAsins: trackedAsins.filter((item) => item.role === TrackedAsinRole.OWN).length,
      competitorAsins: trackedAsins.filter((item) => item.role === TrackedAsinRole.COMPETITOR).length
    }
  }));

  return NextResponse.json({ projects: normalizedProjects });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createProjectSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ownAsins = Array.from(new Set(parsed.data.ownAsins.map((item) => item.trim().toUpperCase()).filter(Boolean)));
  const competitorAsins = Array.from(
    new Set(
      parsed.data.competitorAsins
        .map((item) => item.trim().toUpperCase())
        .filter((item) => item && !ownAsins.includes(item))
    )
  );

  try {
    const project = await initializeProjectWithSubscriptions({
      userId: session.user.id,
      name: parsed.data.name,
      marketplace: parsed.data.marketplace,
      syncFrequencyMinutes: parsed.data.syncFrequencyMinutes,
      ownAsins,
      competitorAsins
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Project initialization failed"
      },
      { status: 400 }
    );
  }
}
