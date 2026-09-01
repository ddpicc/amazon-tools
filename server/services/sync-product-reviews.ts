import { db } from "@/server/db";
import { fetchReveyesReviews } from "@/server/reveyes/reviews";
import { completeDataCapture, failDataCapture, startDataCapture, toDataSourceKind } from "@/server/services/data-captures";
import { Prisma } from "@prisma/client";

export async function syncTrackedAsinLowStarReviews(trackedAsinId: string) {
  const tracked = await db.trackedAsin.findUnique({ where: { id: trackedAsinId }, select: { id: true, asin: true, marketplace: true, projectId: true, role: true, project: { select: { userId: true } } } });
  if (!tracked || tracked.role !== "OWN") return { skipped: true, newReviewCount: 0 };

  const existingCount = await db.productReview.count({ where: { trackedAsinId } });
  const capture = await startDataCapture({ userId: tracked.project.userId, projectId: tracked.projectId, trackedAsinId, marketplace: tracked.marketplace, apiName: "ReveyesReviewsFetch", sourceKind: "LIVE_PROVIDER" });
  try {
  const result = await fetchReveyesReviews(tracked.asin, tracked.marketplace, {
    pages: existingCount ? 1 : 10,
    filterStar: "all_stars",
    filterSortBy: "recent",
    filterReviewerType: "all_reviews",
    filterMediaType: "all_contents",
    filterVariant: "all_formats"
  });
  await completeDataCapture(capture.id, result.rawPayload as Prisma.InputJsonValue, new Date());
  const reviews = result.reviews;
  let newReviewCount = 0;

  for (const review of reviews) {
    const current = await db.productReview.findUnique({ where: { trackedAsinId_externalReviewId: { trackedAsinId, externalReviewId: review.id } }, select: { id: true } });
    await db.productReview.upsert({
      where: { trackedAsinId_externalReviewId: { trackedAsinId, externalReviewId: review.id } },
      create: { trackedAsinId, externalReviewId: review.id, rating: review.rating, title: review.title, content: review.content, reviewerName: review.reviewerName, isVerified: review.isVerified, reviewDate: review.reviewDate, helpfulCount: review.helpfulCount, imageUrls: review.imageUrls, rawPayload: review.rawPayload, captureId: capture.id },
      update: { rating: review.rating, title: review.title, content: review.content, reviewerName: review.reviewerName, isVerified: review.isVerified, reviewDate: review.reviewDate, helpfulCount: review.helpfulCount, imageUrls: review.imageUrls, rawPayload: review.rawPayload, captureId: capture.id }
    });
    if (!current) newReviewCount += 1;
  }

  await db.apiUsageLog.create({ data: { projectId: tracked.projectId, trackedAsinId, apiName: "ReveyesReviewsFetch", status: "SUCCESS", contextRef: `${tracked.asin}:${existingCount ? "daily-latest" : "initial-all"}` } });
  return { skipped: false, newReviewCount: existingCount > 0 ? newReviewCount : 0, baselineImported: existingCount === 0, fetchedCount: reviews.length };
  } catch (error) {
    await failDataCapture(capture.id, error).catch(() => null);
    throw error;
  }
}
