import { Prisma } from "@prisma/client";

const baseUrl = (process.env.REVEYES_API_BASE_URL || "https://server.reveyes.cn/api/open").replace(/\/+$/, "");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Raw = Record<string, unknown>;
export type ReveyesReview = { id: string; rating: number; title: string | null; content: string | null; reviewerName: string | null; isVerified: boolean | null; reviewDate: Date | null; helpfulCount: number | null; productVariant: string | null; page: number | null; imageUrls: Prisma.InputJsonValue; rawPayload: Prisma.InputJsonValue };
export type ReveyesReviewFilters = {
  pages: number;
  filterStar: "all_stars" | "one_star" | "two_star" | "three_star" | "four_star" | "five_star" | "positive" | "critical";
  filterSortBy: "recent" | "helpful";
  filterReviewerType: "all_reviews" | "avp_only_reviews";
  filterMediaType: "all_contents" | "media_reviews_only";
  filterVariant: "all_formats" | "current_format";
};

function key() { const value = process.env.REVEYES_API_KEY?.trim(); if (!value) throw new Error("REVEYES_API_KEY is not configured"); return value; }
async function request(path: string, init?: RequestInit) { const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", "X-API-Key": key(), ...init?.headers }, cache: "no-store" }); const payload = await response.json().catch(() => null) as Raw | null; if (!response.ok || payload?.code !== 0) throw new Error(typeof payload?.message === "string" ? payload.message : `Reveyes request failed: ${response.status}`); return payload.data; }
function rows(value: unknown): Raw[] { if (Array.isArray(value)) return value.filter((item): item is Raw => Boolean(item && typeof item === "object")); if (value && typeof value === "object") { const item = value as Raw; return rows(item.reviews ?? item.items ?? item.data ?? item.results ?? []); } return []; }
function map(row: Raw): ReveyesReview | null { const id = typeof row.review_id === "string" ? row.review_id : null; const rating = Number(row.rating); if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) return null; const date = typeof row.review_date === "string" ? new Date(row.review_date) : null; return { id, rating, title: typeof row.title === "string" ? row.title : null, content: typeof row.review_content === "string" ? row.review_content : null, reviewerName: typeof row.user_name === "string" ? row.user_name : null, isVerified: row.verified_purchase === 1, reviewDate: date && !Number.isNaN(date.getTime()) ? date : null, helpfulCount: Number.isFinite(Number(row.helpful_votes)) ? Number(row.helpful_votes) : null, productVariant: typeof row.product_variant === "string" ? row.product_variant : null, page: Number.isInteger(Number(row.page)) ? Number(row.page) : null, imageUrls: Array.isArray(row.images) ? row.images as Prisma.InputJsonValue : [], rawPayload: row as Prisma.InputJsonValue }; }
export async function fetchReveyesReviews(asin: string, marketplace: string, filters: ReveyesReviewFilters) {
  const created = await request("/v1/reviews/fetch", {
    method: "POST",
    body: JSON.stringify({
      asins: [{
        asin,
        marketplace,
        pages: filters.pages,
        filter_star: filters.filterStar,
        filter_sort_by: filters.filterSortBy,
        filter_reviewer_type: filters.filterReviewerType,
        filter_media_type: filters.filterMediaType,
        filter_variant: filters.filterVariant
      }]
    })
  }) as Raw;
  const taskId = String(created.task_id ?? created.taskId ?? created.id ?? "");
  if (!taskId) throw new Error("Reveyes did not return task_id");
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await wait(5000);
    const result = await request(`/v1/reviews/result/${encodeURIComponent(taskId)}`) as Raw;
    const status = String(result.status ?? "").toLowerCase();
    if (["done", "completed", "success"].includes(status)) return { taskId, rawPayload: result, reviews: rows(result).map(map).filter((item): item is ReveyesReview => item !== null) };
    if (["failed", "error", "cancelled"].includes(status)) throw new Error(String(result.message ?? "Reveyes review task failed"));
  }
  throw new Error(`Reveyes review task ${taskId} timed out`);
}
