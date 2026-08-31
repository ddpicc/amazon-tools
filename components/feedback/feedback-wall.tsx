"use client";

import { useEffect, useMemo, useState } from "react";

type FeedbackStatus =
  | "PENDING"
  | "PLANNED"
  | "IN_PROGRESS"
  | "SHIPPED"
  | "DECLINED";
type FeedbackItem = {
  id: string;
  title: string;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  author: { name: string | null; email: string | null };
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { name: string | null; email: string | null };
  }>;
  votes: Array<{ id: string }>;
  follows: Array<{ id: string }>;
  isMine: boolean;
  _count: { votes: number; comments: number };
};

const statusMeta: Record<FeedbackStatus, { label: string; className: string }> =
  {
    PENDING: { label: "待评估", className: "bg-slate-500/15 text-slate-300" },
    PLANNED: { label: "已采纳", className: "bg-sky-500/15 text-sky-300" },
    IN_PROGRESS: {
      label: "开发中",
      className: "bg-amber-500/15 text-amber-300",
    },
    SHIPPED: {
      label: "已上线",
      className: "bg-emerald-500/15 text-emerald-300",
    },
    DECLINED: { label: "暂不采纳", className: "bg-rose-500/15 text-rose-300" },
  };

function authorName(author: FeedbackItem["author"]) {
  return author.name || author.email?.split("@")[0] || "用户";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

export function FeedbackWall({ loggedIn }: { loggedIn: boolean }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [openSubmit, setOpenSubmit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "MINE" | "VOTED" | "FOLLOWING">(
    "ALL",
  );
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/feedback", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "需求墙加载失败");
      setItems(data.items || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "需求墙加载失败");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const selected = items.find((item) => item.id === selectedId) || null;
  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "MINE") return items.filter((item) => item.isMine);
    if (filter === "VOTED")
      return items.filter((item) => item.votes.length > 0);
    return items.filter((item) => item.follows.length > 0);
  }, [filter, items]);
  const request = async (url: string, init: RequestInit) => {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "操作失败，请稍后重试");
    return data;
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      setTitle("");
      setContent("");
      setOpenSubmit(false);
      setNotice("需求已提交，等待评估。");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "提交失败");
    }
  };
  const vote = async (id: string) => {
    try {
      await request(`/api/feedback/${id}/vote`, { method: "POST" });
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "投票失败");
    }
  };
  const follow = async (id: string) => {
    try {
      await request(`/api/feedback/${id}/follow`, { method: "POST" });
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "关注失败");
    }
  };
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    try {
      await request(`/api/feedback/${selected.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      setNotice("评论已发布。");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "评论发布失败");
    }
  };
  const metrics = [
    { label: "全部需求", value: items.length },
    {
      label: "已采纳",
      value: items.filter((item) => item.status === "PLANNED").length,
    },
    {
      label: "开发中",
      value: items.filter((item) => item.status === "IN_PROGRESS").length,
    },
    {
      label: "已上线",
      value: items.filter((item) => item.status === "SHIPPED").length,
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-[.2em] text-[var(--md-primary)]">
            Product feedback
          </p>
          <h1 className="mt-3 font-headline text-3xl font-bold">需求墙</h1>
          <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
            提交产品想法，点赞支持优先级，和其他用户一起讨论。
          </p>
        </div>
        <button
          onClick={() => setOpenSubmit(true)}
          className="rounded-lg bg-[var(--md-primary)] px-5 py-3 font-semibold text-[var(--md-on-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!loggedIn}
          title={loggedIn ? undefined : "请先登录后提交需求"}
        >
          + 提交需求
        </button>
      </div>
      {notice ? (
        <div className="mt-5 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3 text-sm">
          {notice}
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4"
          >
            <span className="text-sm text-[var(--md-on-surface-variant)]">
              {metric.label}
            </span>
            <strong className="mt-1 block text-3xl">{metric.value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "MINE", "VOTED", "FOLLOWING"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-2 text-sm ${filter === value ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]" : "text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-variant)]"}`}
            >
              {
                {
                  ALL: "全部",
                  MINE: "我提交的",
                  VOTED: "我支持的",
                  FOLLOWING: "我关注的",
                }[value]
              }
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-2xl bg-[var(--md-surface-container)]"
            />
          ))}
        </div>
      ) : null}
      {!loading && filteredItems.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--md-outline-variant)] p-10 text-center text-sm text-[var(--md-on-surface-variant)]">
          还没有这类需求。
          {loggedIn
            ? "成为第一个提交想法的人吧。"
            : "登录后可提交需求、点赞和评论。"}
        </div>
      ) : null}
      {!loading && filteredItems.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const meta = statusMeta[item.status];
            const voted = item.votes.length > 0;
            const following = item.follows.length > 0;
            return (
              <article
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="cursor-pointer rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--md-primary)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-[var(--md-on-surface-variant)]">
                    {formatDate(item.createdAt)}
                  </span>
                  <button
                    disabled={!loggedIn}
                    aria-label={following ? "取消关注" : "关注需求"}
                    onClick={(event) => {
                      event.stopPropagation();
                      void follow(item.id);
                    }}
                    className={`ml-auto rounded-md px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50 ${following ? "bg-[var(--md-primary)]/15 text-[var(--md-primary)]" : "text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-variant)]"}`}
                  >
                    {following ? "★ 已关注" : "☆ 关注"}
                  </button>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--md-on-surface-variant)]">
                  {item.content}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--md-outline-variant)] pt-4 text-sm">
                  <span className="text-[var(--md-on-surface-variant)]">
                    {authorName(item.author)}
                  </span>
                  <div className="flex gap-3">
                    <button
                      disabled={!loggedIn}
                      onClick={(event) => {
                        event.stopPropagation();
                        void vote(item.id);
                      }}
                      className={`rounded-md px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50 ${voted ? "bg-[var(--md-primary)]/15 text-[var(--md-primary)]" : "hover:bg-[var(--md-surface-variant)]"}`}
                    >
                      👍 {item._count.votes}
                    </button>
                    <span className="px-2 py-1">💬 {item._count.comments}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {openSubmit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-lg rounded-2xl bg-[var(--md-surface)] p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">提交需求</h2>
            <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
              描述使用场景、遇到的问题和期望结果，能帮助我们更快评估。
            </p>
            <input
              required
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="需求标题"
              className="mt-5 w-full rounded-lg border border-[var(--md-outline-variant)] bg-transparent p-3 outline-none focus:border-[var(--md-primary)]"
            />
            <textarea
              required
              maxLength={5000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="描述场景、问题和期望结果"
              className="mt-3 min-h-36 w-full rounded-lg border border-[var(--md-outline-variant)] bg-transparent p-3 outline-none focus:border-[var(--md-primary)]"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenSubmit(false)}
                className="rounded-lg px-4 py-2"
              >
                取消
              </button>
              <button className="rounded-lg bg-[var(--md-primary)] px-4 py-2 font-semibold text-[var(--md-on-primary)]">
                提交需求
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--md-surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta[selected.status].className}`}
                >
                  {statusMeta[selected.status].label}
                </span>
                <h2 className="mt-3 text-2xl font-bold">{selected.title}</h2>
                <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
                  {authorName(selected.author)} ·{" "}
                  {formatDate(selected.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg px-3 py-2 text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-variant)]"
              >
                关闭
              </button>
            </div>
            <p className="mt-5 whitespace-pre-wrap leading-7">
              {selected.content}
            </p>
            <div className="mt-6 border-t border-[var(--md-outline-variant)] pt-5">
              <h3 className="font-semibold">
                讨论 · {selected._count.comments}
              </h3>
              <div className="mt-4 space-y-4">
                {selected.comments.length === 0 ? (
                  <p className="text-sm text-[var(--md-on-surface-variant)]">
                    还没有评论，来补充你的使用场景吧。
                  </p>
                ) : (
                  selected.comments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[var(--md-surface-container)] p-4"
                    >
                      <div className="flex justify-between gap-3 text-sm">
                        <strong>{authorName(item.author)}</strong>
                        <span className="text-[var(--md-on-surface-variant)]">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
              {loggedIn ? (
                <form onSubmit={submitComment} className="mt-5">
                  <textarea
                    required
                    maxLength={5000}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="写下你的补充、使用场景或建议"
                    className="min-h-24 w-full rounded-lg border border-[var(--md-outline-variant)] bg-transparent p-3 outline-none focus:border-[var(--md-primary)]"
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="rounded-lg bg-[var(--md-primary)] px-4 py-2 font-semibold text-[var(--md-on-primary)]">
                      发布评论
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-5 text-sm text-[var(--md-on-surface-variant)]">
                  登录后可参与评论和点赞。
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
