"use client";

import { useState } from "react";
import { publicText } from "@/lib/public-text";

type Asin = {
  id: string;
  asin: string;
  title: string | null;
  role: "OWN" | "COMPETITOR";
};
type Result = Record<string, unknown>;
type Progress = {
  phase: "REFRESHING" | "GENERATING_AI" | "SAVING";
  completed: number;
  total: number;
  asin?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? publicText(value) : "—";
}
function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function objectList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
}

function AnalysisProgress({ progress }: { progress: Progress }) {
  const percentage =
    progress.phase === "REFRESHING"
      ? Math.round((progress.completed / Math.max(progress.total, 1)) * 70)
      : progress.phase === "GENERATING_AI"
        ? 85
        : 95;
  const label =
    progress.phase === "REFRESHING"
      ? progress.completed < progress.total
        ? `正在刷新 ${progress.asin ?? "ASIN"} 的公开 Listing 与关键词（${progress.completed + 1}/${progress.total}）`
        : `已完成 ${progress.total} 个 ASIN 的公开数据刷新`
      : progress.phase === "GENERATING_AI"
        ? "正在由 AI 对比图片、文案与关键词"
        : "正在保存分析结果";
  return (
    <section className="rounded-2xl border border-[var(--md-primary)]/30 bg-[var(--md-surface-container)] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-label text-sm font-semibold">深度分析进行中</p>
          <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">
            {label}
          </p>
        </div>
        <span className="font-mono text-sm text-[var(--md-primary)]">
          {percentage}%
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--md-surface)]">
        <div
          className="h-full rounded-full bg-[var(--md-primary)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {["刷新 Listing 与关键词", "AI 生成对比建议", "保存结果"].map(
          (item, index) => (
            <div
              key={item}
              className={`rounded-lg border p-3 ${percentage >= [70, 85, 95][index] ? "border-[var(--md-primary)]/50 bg-[var(--md-primary)]/10" : "border-[var(--md-outline-variant)] bg-[var(--md-surface)]"}`}
            >
              <div className="h-3 w-20 animate-pulse rounded bg-[var(--md-outline-variant)]/50" />
              <p className="mt-3 font-label text-xs text-[var(--md-on-surface-variant)]">
                {item}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function DeepAnalysisResult({ result }: { result: Result }) {
  const refresh = objectList(result.refresh);
  const images = objectList(result.imageSuggestions);
  const copy = objectList(result.copySuggestions);
  const strategy =
    result.keywordAndAdvertising &&
    typeof result.keywordAndAdvertising === "object" &&
    !Array.isArray(result.keywordAndAdvertising)
      ? (result.keywordAndAdvertising as Record<string, unknown>)
      : {};
  const own =
    result.own && typeof result.own === "object"
      ? (result.own as Record<string, unknown>)
      : {};
  const ownImages = stringList(own.photoUrls);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-xl font-semibold">深度分析结果</h2>
          <span className="rounded-full bg-[var(--md-primary)]/15 px-3 py-1 font-label text-xs text-[var(--md-primary)]">
            {result.generatedBy === "AI" ? "AI 对比建议" : "事实基础结果"}
          </span>
        </div>
        <p className="mt-4 font-label text-sm leading-7 text-[var(--md-on-surface-variant)]">
          {text(result.overview)}
        </p>
        {refresh.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {refresh.map((item, index) => (
              <span
                key={index}
                className={`rounded-full px-3 py-1 font-mono text-xs ${item.status === "SUCCESS" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}
              >
                {text(item.asin)} · {text(item.status)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <section>
        <h2 className="font-headline text-xl font-semibold">
          自有 Listing 图片
        </h2>
        <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">
          点击图片可放大查看。
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {ownImages.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveImage(url)}
              className="overflow-hidden rounded-xl border border-[var(--md-outline-variant)]"
            >
              <img
                src={url}
                alt={`自有 Listing 图片 ${index + 1}`}
                className="h-20 w-20 object-cover"
              />
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-headline text-xl font-semibold">图片建议</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {images.map((item, index) => (
            <article
              key={index}
              className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-5"
            >
              <p className="font-label text-xs text-[var(--md-primary)]">
                观察
              </p>
              <p className="mt-1 font-label text-sm">
                {text(item.observation)}
              </p>
              <p className="mt-4 font-label text-xs text-[var(--md-primary)]">
                竞品做得好
              </p>
              <p className="mt-1 font-label text-sm">
                {text(item.competitorStrength)}
              </p>
              <p className="mt-4 font-label text-xs text-[var(--md-primary)]">
                建议改法
              </p>
              <p className="mt-1 font-label text-sm leading-6">
                {text(item.recommendedChange)}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-headline text-xl font-semibold">文案建议</h2>
        <div className="mt-3 space-y-4">
          {copy.map((item, index) => (
            <article
              key={index}
              className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-5"
            >
              <h3 className="font-label font-semibold">{text(item.area)}</h3>
              <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">
                {text(item.observation)}
              </p>
              <p className="mt-3 font-label text-sm leading-6">
                {text(item.recommendation)}
              </p>
              {typeof item.suggestedRewrite === "string" &&
              item.suggestedRewrite ? (
                <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--md-surface)] p-4 font-label text-sm leading-6">
                  {publicText(item.suggestedRewrite)}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-6">
        <h2 className="font-headline text-xl font-semibold">
          关键词与广告策略
        </h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-label text-sm font-semibold">
              建议关注的关键词
            </h3>
            <p className="mt-2 font-label text-sm leading-6">
              {publicText(stringList(strategy.recommendedKeywords).join("、")) || "—"}
            </p>
            <h3 className="mt-5 font-label text-sm font-semibold">
              关键词覆盖缺口
            </h3>
            <p className="mt-2 font-label text-sm leading-6">
              {publicText(stringList(strategy.keywordGaps).join("、")) || "—"}
            </p>
          </div>
          <div>
            <h3 className="font-label text-sm font-semibold">
              Search Term 候选
            </h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--md-surface)] p-4 font-label text-sm leading-6">
              {publicText(text(strategy.suggestedSearchTerms))}
            </pre>
            <h3 className="mt-5 font-label text-sm font-semibold">
              广告测试建议
            </h3>
            <p className="mt-2 font-label text-sm leading-6">
              {publicText(text(strategy.advertisingPlan))}
            </p>
          </div>
        </div>
      </section>
      {stringList(result.limitations).length ? (
        <p className="font-label text-xs leading-5 text-[var(--md-on-surface-variant)]">
          限制：{publicText(stringList(result.limitations).join("；"))}
        </p>
      ) : null}
      {activeImage ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute right-6 top-6 rounded-lg bg-black/50 px-4 py-2 text-sm text-white"
          >
            关闭
          </button>
          <img
            src={activeImage}
            alt="放大的自有 Listing 图片"
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}

export function ListingDeepAnalysisForm({
  projectId,
  asins,
  recentRuns,
}: {
  projectId: string;
  asins: Asin[];
  recentRuns: Array<{
    id: string;
    status: string;
    requestedAt: string;
    resultJson: unknown;
    errorMessage: string | null;
  }>;
}) {
  const ownAsins = asins.filter((item) => item.role === "OWN");
  const competitors = asins.filter((item) => item.role === "COMPETITOR");
  const [ownTrackedAsinId, setOwnTrackedAsinId] = useState(
    ownAsins.length === 1 ? ownAsins[0].id : "",
  );
  const [competitorIds, setCompetitorIds] = useState(
    competitors.map((item) => item.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  function toggle(id: string) {
    setCompetitorIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  async function submit() {
    if (!ownTrackedAsinId || !competitorIds.length)
      return setError("请选择一个自有 ASIN 和至少一个竞品 ASIN");
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({
      phase: "REFRESHING",
      completed: 0,
      total: competitorIds.length + 1,
    });
    try {
      const response = await fetch(
        `/api/projects/${projectId}/listing-deep-analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownTrackedAsinId,
            competitorTrackedAsinIds: competitorIds,
          }),
        },
      );
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(publicText(payload?.error ?? "深度分析失败"));
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (!completed) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";
        for (const message of messages) {
          const data = message
            .split("\n")
            .find((line) => line.startsWith("data: "))
            ?.slice(6);
          if (!data) continue;
          const event = JSON.parse(data) as {
            type: string;
            result?: Result;
            error?: string;
          } & Progress;
          if (event.type === "progress")
            setProgress({
              phase: event.phase,
              completed: event.completed,
              total: event.total,
              asin: event.asin,
            });
          if (event.type === "error")
            throw new Error(event.error ?? "深度分析失败");
          if (event.type === "complete") {
            completed = true;
            if (!event.result) throw new Error(event.error ?? "深度分析失败");
            setResult(event.result);
          }
        }
        if (done) completed = true;
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? publicText(submissionError.message)
          : "深度分析失败",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-5">
        <p className="font-label text-sm text-[var(--md-on-surface-variant)]">
          {ownAsins.length > 1
            ? "请选择本次要分析的自有 Listing："
            : "本次分析使用自有 Listing："}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {ownAsins.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] p-3"
            >
              <input
                className="mt-1"
                type="radio"
                name="listing-analysis-own-asin"
                disabled={busy}
                checked={ownTrackedAsinId === item.id}
                onChange={() => setOwnTrackedAsinId(item.id)}
              />
              <span>
                <span className="block font-mono text-sm font-semibold">
                  {item.asin}
                </span>
                <span className="mt-1 block font-label text-xs text-[var(--md-on-surface-variant)]">
                  {item.title ?? "未采集标题"}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="font-label text-sm font-semibold">选择对比竞品</span>
          <label className="flex items-center gap-2 font-label text-sm">
            <input
              type="checkbox"
              checked={
                competitorIds.length === competitors.length &&
                competitors.length > 0
              }
              onChange={() =>
                setCompetitorIds(
                  competitorIds.length === competitors.length
                    ? []
                    : competitors.map((item) => item.id),
                )
              }
            />
            全选
          </label>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {competitors.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] p-3"
            >
              <input
                className="mt-1"
                type="checkbox"
                disabled={busy}
                checked={competitorIds.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span>
                <span className="block font-mono text-sm font-semibold">
                  {item.asin}
                </span>
                <span className="mt-1 block font-label text-xs text-[var(--md-on-surface-variant)]">
                  {item.title ?? "未采集标题"}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !ownTrackedAsinId || !competitorIds.length}
            onClick={submit}
            className="rounded-lg bg-[var(--md-primary)] px-5 py-2.5 font-label text-sm font-semibold text-[var(--md-on-primary)] disabled:opacity-50"
          >
            {busy ? "深度分析进行中…" : "开始 Listing 深度分析"}
          </button>
          <span className="font-label text-xs text-[var(--md-on-surface-variant)]">
            会刷新自有 ASIN 与选中竞品的公开 Listing 和关键词数据，再运行 AI
            对比。
          </span>
        </div>
        {error ? (
          <p className="mt-3 font-label text-sm text-[var(--md-error)]">
            {error}
          </p>
        ) : null}
      </section>
      {progress ? <AnalysisProgress progress={progress} /> : null}
      {recentRuns.length ? (
        <section>
          <h2 className="font-headline text-xl font-semibold">最近分析</h2>
          <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">
            仅保留最近 5 次分析结果。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentRuns.map((run) => (
              <button
                key={run.id}
                onClick={() =>
                  run.resultJson && setResult(run.resultJson as Result)
                }
                className="rounded-lg border border-[var(--md-outline-variant)] px-3 py-2 font-label text-sm"
              >
                {new Date(run.requestedAt).toLocaleString("zh-CN")} ·{" "}
                {run.status}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {result ? <DeepAnalysisResult result={result} /> : null}
    </div>
  );
}
