"use client";

import { useMemo, useState } from "react";

type Review = {
  id: string;
  asin: string;
  reviewDate: string | null;
  title: string | null;
  rating: number;
  content: string | null;
};

export function ReviewMonitorList({ asins, reviews }: { asins: string[]; reviews: Review[] }) {
  const [selectedAsin, setSelectedAsin] = useState(asins[0] ?? "ALL");
  const [selectedRating, setSelectedRating] = useState("ALL");
  const visibleReviews = useMemo(
    () => reviews.filter((review) => (selectedAsin === "ALL" || review.asin === selectedAsin) && (selectedRating === "ALL" || String(review.rating) === selectedRating)),
    [reviews, selectedAsin, selectedRating],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">全部评论</h2>
          <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">显示 {visibleReviews.length} 条</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 font-label text-xs text-[var(--md-on-surface-variant)]">
            <span>商品</span>
            <select
              value={selectedAsin}
              onChange={(event) => setSelectedAsin(event.target.value)}
              aria-label="按 ASIN 筛选评论"
              className="cursor-pointer rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 font-mono text-sm text-[var(--md-on-surface)]"
            >
              <option value="ALL">全部 ASIN</option>
              {asins.map((asin) => <option key={asin} value={asin}>{asin}</option>)}
            </select>
          </label>
          <label className="grid gap-1 font-label text-xs text-[var(--md-on-surface-variant)]">
            <span>星级</span>
            <select
              value={selectedRating}
              onChange={(event) => setSelectedRating(event.target.value)}
              aria-label="按星级筛选评论"
              className="cursor-pointer rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 font-label text-sm text-[var(--md-on-surface)]"
            >
              <option value="ALL">全部星级</option>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} 星</option>)}
            </select>
          </label>
        </div>
      </div>
      {visibleReviews.length ? (
        <div className="mt-5 space-y-3">
          {visibleReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-label text-xs text-[var(--md-on-surface-variant)]">{review.asin} · {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString("zh-CN") : "日期未知"}</p>
                  <h3 className="mt-1 font-headline text-base font-semibold text-[var(--md-on-surface)]">{review.title ?? "未提供标题"}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 font-label text-xs ${review.rating === 1 ? "bg-[var(--md-error)]/15 text-[var(--md-error)]" : review.rating <= 3 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{review.rating} 星</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap font-label text-sm leading-6 text-[var(--md-on-surface-variant)]">{review.content ?? "未提供评论正文"}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--md-outline-variant)] p-8 text-center font-label text-sm text-[var(--md-on-surface-variant)]">当前筛选条件下没有评论。</div>
      )}
    </>
  );
}
