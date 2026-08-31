import "server-only";

export type CanopyReview = { id: string; rating: number; title: string | null; body: string | null; reviewerName: string | null; verifiedPurchase: boolean | null; helpfulVotes: number | null; imageUrls: string[]; rawPayload: Record<string, unknown> };

function records(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : []; }
function stringOrNull(value: unknown) { return typeof value === "string" && value.trim() ? value : null; }
function numberOrNull(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }

function mapReview(value: Record<string, unknown>): CanopyReview | null {
  const id = stringOrNull(value.id); const rating = numberOrNull(value.rating);
  if (!id || !rating || rating < 1 || rating > 5) return null;
  const reviewer = value.reviewer && typeof value.reviewer === "object" ? value.reviewer as Record<string, unknown> : {};
  return { id, rating, title: stringOrNull(value.title), body: stringOrNull(value.body), reviewerName: stringOrNull(reviewer.name), verifiedPurchase: typeof value.verifiedPurchase === "boolean" ? value.verifiedPurchase : null, helpfulVotes: numberOrNull(value.helpfulVotes), imageUrls: records(value.imageUrls).map(String), rawPayload: value };
}

export async function fetchCanopyReviews({ asin, marketplace, lowStarOnly }: { asin: string; marketplace: string; lowStarOnly: boolean }) {
  const apiKey = process.env.CANOPY_API_KEY;
  if (!apiKey) throw new Error("CANOPY_API_KEY 未配置，无法获取真实 Amazon 评论");
  const all: CanopyReview[] = []; const rawPayloads: unknown[] = []; const maxPages = 3;
  const ratingFilters = lowStarOnly ? ["ONE_STAR", "TWO_STAR", "THREE_STAR"] : ["ALL"];
  for (const ratingFilter of ratingFilters) for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL("https://rest.canopyapi.co/api/amazon/product/reviews");
    url.searchParams.set("asin", asin); url.searchParams.set("domain", marketplace); url.searchParams.set("page", String(page));
    url.searchParams.set("rating", ratingFilter);
    const response = await fetch(url, { headers: { "API-KEY": apiKey }, cache: "no-store" });
    const payload: unknown = await response.json().catch(() => null); rawPayloads.push(payload);
    if (!response.ok) throw new Error(`Canopy 评论请求失败 (${response.status})`);
    const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const data = root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : {};
    const product = data.amazonProduct && typeof data.amazonProduct === "object" ? data.amazonProduct as Record<string, unknown> : {};
    const paginated = product.reviewsPaginated && typeof product.reviewsPaginated === "object" ? product.reviewsPaginated as Record<string, unknown> : {};
    const reviews = records(paginated.reviews).map(mapReview).filter((review): review is CanopyReview => Boolean(review)); all.push(...reviews);
    const pageInfo = paginated.pageInfo && typeof paginated.pageInfo === "object" ? paginated.pageInfo as Record<string, unknown> : {};
    if (pageInfo.hasNextPage !== true) break;
  }
  return { reviews: Array.from(new Map(all.map((review) => [review.id, review])).values()), rawPayload: rawPayloads };
}
