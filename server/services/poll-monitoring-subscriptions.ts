import { db } from "@/server/db";
import { formatOperationalError } from "@/server/services/failure-classification";
import { syncTrackedAsin } from "@/server/services/sync-tracked-asin";
import { syncTrackedAsinLowStarReviews } from "@/server/services/sync-product-reviews";

export async function pollProjectMonitoringSubscriptions(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      trackedAsins: {
        where: { status: "ACTIVE" },
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }]
      }
    }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const projectJob = await db.syncJob.create({
    data: {
      projectId,
      jobType: "monitoring_poll_project",
      status: "RUNNING",
      attemptCount: 1,
      scheduledAt: new Date(),
      startedAt: new Date()
    }
  });

  try {
    const asinResults = [] as Array<Awaited<ReturnType<typeof syncTrackedAsin>>>;

    for (const trackedAsin of project.trackedAsins) {
      const result = await syncTrackedAsin(trackedAsin.id, {
        skipManualLimit: true,
        jobType: "monitoring_poll"
      });
      asinResults.push(result);
      if (trackedAsin.role === "OWN") {
        await syncTrackedAsinLowStarReviews(trackedAsin.id).catch(() => null);
      }
    }

    await db.syncJob.update({
      where: { id: projectJob.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date()
      }
    });

    return {
      asinCount: project.trackedAsins.length,
      asinResults
    };
  } catch (error) {
    const errorMessage = formatOperationalError(error, "Unknown monitoring poll error");
    await db.syncJob.update({
      where: { id: projectJob.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage
      }
    });

    throw error;
  }
}
