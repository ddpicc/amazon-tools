'use client';

import { useState } from "react";
import { ListingDiagnosisResult } from "@/components/analysis/listing-diagnosis-result";
import { publicText } from "@/lib/public-text";

export function ListingDiagnosisForm({ projectId, asins }: { projectId: string; asins: Array<{ id: string; asin: string; title: string | null }> }) {
  const [trackedAsinId, setTrackedAsinId] = useState(asins[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setResult(null);
    const response = await fetch("/api/analysis-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolKey: "listing-diagnosis", projectId, trackedAsinId }) });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !payload?.result) return setError(publicText(payload?.error ?? payload?.errorMessage ?? "诊断失败"));
    setResult(payload.result as Record<string, unknown>);
  }

  return <div className="space-y-5"><form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4"><label className="grid flex-1 gap-2"><span className="font-label text-xs text-[var(--md-on-surface-variant)]">选择商品</span><select value={trackedAsinId} onChange={e => setTrackedAsinId(e.target.value)} className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 font-mono text-sm">{asins.map(item => <option key={item.id} value={item.id}>{item.asin}{item.title ? ` · ${item.title.slice(0, 36)}` : ""}</option>)}</select></label><button disabled={busy || !trackedAsinId} className="rounded-lg bg-[var(--md-primary)] px-4 py-2 font-label text-sm font-semibold text-[var(--md-on-primary)] disabled:opacity-50">{busy ? "诊断中…" : "运行 Listing 诊断"}</button>{error ? <p className="w-full font-label text-sm text-[var(--md-error)]">{publicText(error)}</p> : null}</form>{result ? <ListingDiagnosisResult result={result} /> : null}</div>;
}
