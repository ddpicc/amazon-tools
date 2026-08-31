import { Prisma } from "@prisma/client";
import { requestSorftime } from "@/server/sorftime/adapter";

type RawReview = Record<string, unknown>;

function records(value: unknown): RawReview[] {
  if (Array.isArray(value)) return value.filter((item): item is RawReview => Boolean(item && typeof item === "object"));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return records(record.Data ?? record.Items ?? record.List ?? []);
  }
  return [];
}

function date(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type SorftimeReview = { id: string; rating: number; title: string | null; content: string | null; reviewerName: string | null; isVerified: boolean | null; reviewDate: Date | null; helpfulCount: number | null; imageUrls: Prisma.InputJsonValue; rawPayload: Prisma.InputJsonValue };

function mapReview(row: RawReview): SorftimeReview | null {
  const id = typeof row.ReviewId === "string" ? row.ReviewId : null;
  const rating = Number(row.Star);
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return { id, rating, title: typeof row.Title === "string" ? row.Title : null, content: typeof row.Content === "string" ? row.Content : null, reviewerName: typeof row.ReviewerName === "string" ? row.ReviewerName : null, isVerified: typeof row.IsVerified === "boolean" ? row.IsVerified : null, reviewDate: date(row.ReviewDate), helpfulCount: typeof row.HelpfulCount === "number" ? row.HelpfulCount : null, imageUrls: Array.isArray(row.ImageUrls) ? row.ImageUrls as Prisma.InputJsonValue : [], rawPayload: row as Prisma.InputJsonValue };
}

export async function requestLowStarReviewCollection(asin: string, marketplace: string) {
  return requestSorftime<unknown, { taskId: string | null }>({ apiName: "ProductReviewsCollection", marketplace, body: { ASIN: asin, Page: 1, CollectType: 1, Star: "10" }, mockData: { taskId: `mock-review-${asin}` }, mapData(data) { const record = data as Record<string, unknown>; return { taskId: typeof record?.Data === "string" ? record.Data : null }; } });
}

export async function queryLowStarReviews(asin: string, marketplace: string) {
  const responses = await Promise.all([1, 2, 3].map((star) => requestSorftime<unknown, SorftimeReview[]>({ apiName: "ProductReviewsQuery", marketplace, body: { ASIN: asin, Page: 1, Star: star }, mockData: [], mapData(data) { return records(data).map(mapReview).filter((item): item is SorftimeReview => item !== null); } })));
  return {
    reviews: responses.flatMap((response) => response.data),
    requestConsumed: responses.reduce((sum, response) => sum + response.requestConsumed, 0),
    requestLeft: responses.at(-1)?.requestLeft ?? null,
    source: responses[0]?.source ?? "mock",
    rawPayload: responses.map((response) => response.rawPayload)
  };
}
