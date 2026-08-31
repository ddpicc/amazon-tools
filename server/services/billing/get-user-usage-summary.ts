import { TrackedAsinRole } from "@prisma/client";
import { db } from "@/server/db";

export type UserUsageSummary = {
  projectCount: number;
  activeTrackedAsinCount: number;
  ownAsinCount: number;
  competitorAsinCount: number;
};

export async function getUserUsageSummary(userId: string): Promise<UserUsageSummary> {
  const [projectCount, trackedAsins] = await Promise.all([
    db.project.count({ where: { userId } }),
    db.trackedAsin.findMany({
      where: {
        status: "ACTIVE",
        project: { userId }
      },
      select: { role: true }
    })
  ]);

  const ownAsinCount = trackedAsins.filter((item) => item.role === TrackedAsinRole.OWN).length;
  const competitorAsinCount = trackedAsins.filter((item) => item.role === TrackedAsinRole.COMPETITOR).length;

  return {
    projectCount,
    activeTrackedAsinCount: trackedAsins.length,
    ownAsinCount,
    competitorAsinCount
  };
}
