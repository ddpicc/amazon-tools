import { MonitoringSubscriptionType, TrackedAsinRole } from "@prisma/client";
import { db } from "@/server/db";
import {
  batchEnsureAsinMonitoringSubscriptions,
  batchRemoveAsinMonitoringSubscriptions
} from "@/server/services/monitoring-subscriptions";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";
import { assertCanCreateProject } from "@/server/services/entitlements";
import { syncTrackedAsin } from "@/server/services/sync-tracked-asin";
import { syncTrackedAsinLowStarReviews } from "@/server/services/sync-product-reviews";

type InitializeProjectInput = {
  userId: string;
  name: string;
  marketplace: string;
  ownAsins: string[];
  competitorAsins: string[];
};

export async function initializeProjectWithSubscriptions(input: InitializeProjectInput) {
  await assertCanCreateProject(input.userId, {
    ownAsins: input.ownAsins.length,
    competitorAsins: input.competitorAsins.length
  });

  const project = await db.project.create({
    data: {
      userId: input.userId,
      name: input.name,
      marketplace: input.marketplace,
      settings: {
        create: {}
      },
      trackedAsins: {
        create: [
          ...input.ownAsins.map((asin) => ({
            asin,
            marketplace: input.marketplace,
            role: TrackedAsinRole.OWN
          })),
          ...input.competitorAsins.map((asin) => ({
            asin,
            marketplace: input.marketplace,
            role: TrackedAsinRole.COMPETITOR
          }))
        ]
      }
    },
    include: {
      trackedAsins: true,
      settings: true,
      notificationChannels: true
    }
  });

  try {
    const trackedAsinByAsin = new Map(project.trackedAsins.map((trackedAsin) => [trackedAsin.asin, trackedAsin]));
    const orderedTrackedAsins = [
      ...input.ownAsins.map((asin) => trackedAsinByAsin.get(asin)).filter(Boolean),
      ...input.competitorAsins.map((asin) => trackedAsinByAsin.get(asin)).filter(Boolean)
    ];

    await batchEnsureAsinMonitoringSubscriptions(
      project.id,
      orderedTrackedAsins.map((trackedAsin) => ({
        id: trackedAsin!.id,
        asin: trackedAsin!.asin,
        marketplace: trackedAsin!.marketplace
      }))
    );

    for (const trackedAsin of orderedTrackedAsins) {
      if (!trackedAsin) {
        continue;
      }

      await syncTrackedAsin(trackedAsin.id, {
        skipManualLimit: true,
        jobType: "initial_sync",
        skipKeywordSync: true
      });
      if (trackedAsin.role === TrackedAsinRole.OWN) await syncTrackedAsinLowStarReviews(trackedAsin.id);
    }

    const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);

    return {
      ...project,
      notificationChannels: channels
    };
  } catch (error) {
    await batchRemoveAsinMonitoringSubscriptions(
      project.id,
      input.marketplace,
      [...input.ownAsins, ...input.competitorAsins]
    ).catch(() => null);
    await db.project.delete({
      where: { id: project.id }
    }).catch(() => null);
    throw error;
  }
}

export async function deleteProjectWithSubscriptions(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId
    },
    include: {
      trackedAsins: {
        where: { status: "ACTIVE" },
        orderBy: [{ role: "asc" }, { asin: "asc" }]
      },
      monitoringSubscriptions: {
        where: {
          type: MonitoringSubscriptionType.ASIN,
          enabled: true
        }
      }
    }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const asins = project.trackedAsins
    .filter((trackedAsin) =>
      project.monitoringSubscriptions.some((subscription) => subscription.trackedAsinId === trackedAsin.id)
    )
    .map((trackedAsin) => trackedAsin.asin);

  await batchRemoveAsinMonitoringSubscriptions(project.id, project.marketplace, asins);

  await db.project.delete({
    where: { id: project.id }
  });

  return { ok: true };
}
