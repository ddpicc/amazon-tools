"use client";

import { useState } from "react";
import { KeywordResearchResult } from "@/components/analysis/keyword-research-result";

type AsinOption = { id: string; asin: string; title: string | null; role: string };
type AnalysisResult = { id: string; asin: string; status: string; result: Record<string, unknown> | null; errorMessage: string | null };

export function ProjectKeywordAnalysisForm({ projectId, asins }: { projectId: string; asins: AsinOption[] }) {
  const [selected, setSelected] = useState<string[]>(asins.map((item) => item.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const allSelected = selected.length === asins.length && asins.length > 0;

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submit() {
    if (!selected.length) return setError("请至少选择一个 ASIN");
    setBusy(true); setError(null);
    const response = await fetch(`/api/projects/${projectId}/keyword-analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackedAsinIds: selected }) });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) return setError(payload?.error ?? "关键词分析失败");
    setResults(Array.isArray(payload?.runs) ? payload.runs : []);
  }

  return <><section className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-headline text-lg font-semibold">选择要分析的 ASIN</h2><p className="mt-1 max-w-3xl font-label text-sm text-[var(--md-on-surface-variant)]">每个 ASIN 会调用一次 ASINRequestKeyword，并与最近一次已保存的关键词快照比较自然排名。关键词搜索量和 CPC 是需求信号，不是 Amazon 流量归因。</p></div><label className="flex cursor-pointer items-center gap-2 font-label text-sm"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : asins.map((item) => item.id))} />全选</label></div><div className="mt-5 grid gap-2 md:grid-cols-2">{asins.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] p-3"><input className="mt-1" type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span><span className="block font-mono text-sm font-semibold">{item.asin}</span><span className="mt-1 block font-label text-xs text-[var(--md-on-surface-variant)]">{item.role === "OWN" ? "自有" : "竞品"}{item.title ? ` · ${item.title}` : ""}</span></span></label>)}</div><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={busy || !selected.length} onClick={submit} className="rounded-lg bg-[var(--md-primary)] px-5 py-2.5 font-label text-sm font-semibold text-[var(--md-on-primary)] disabled:opacity-50">{busy ? "分析中…" : `分析 ${selected.length} 个 ASIN`}</button><span className="font-label text-xs text-[var(--md-on-surface-variant)]">可全选项目 ASIN；将按顺序执行，避免 Provider 并发与配额风险。</span>{error ? <p className="w-full font-label text-sm text-[var(--md-error)]">{error}</p> : null}</div></section>{results.length ? <section className="space-y-5"><div className="flex items-center justify-between"><h2 className="font-headline text-xl font-semibold">本次分析结果</h2><span className="font-label text-sm text-[var(--md-on-surface-variant)]">{results.filter((item) => item.status === "SUCCESS").length}/{results.length} 完成</span></div>{results.map((item) => item.result ? <KeywordResearchResult key={item.id} result={item.result} /> : <div key={item.id} className="rounded-xl border border-[var(--md-error)] p-4 font-label text-sm"><span className="font-mono font-semibold">{item.asin}</span>：{item.errorMessage ?? "关键词分析未返回结果"}</div>)}</section> : null}</>;
}
