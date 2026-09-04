'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publicText } from "@/lib/public-text";

export function ProductLookupForm() {
  const router = useRouter();
  const [asin, setAsin] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/analysis-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolKey: "product-lookup", asin, marketplace }) });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) return setError(publicText(payload.error ?? "创建任务失败"));
    router.push(`/analysis/${payload.id}`);
  }

  return <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-5 sm:grid-cols-[1fr_140px_auto] sm:items-end"><label className="grid gap-2"><span className="font-label text-sm text-[var(--md-on-surface-variant)]">Amazon ASIN</span><input value={asin} onChange={(event) => setAsin(event.target.value)} required placeholder="例如 B0XXXXXXXX" className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2.5 font-mono text-sm text-[var(--md-on-surface)] outline-none focus:border-[var(--md-primary)]" /></label><label className="grid gap-2"><span className="font-label text-sm text-[var(--md-on-surface-variant)]">站点</span><select value={marketplace} onChange={(event) => setMarketplace(event.target.value)} className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2.5 font-label text-sm text-[var(--md-on-surface)] outline-none focus:border-[var(--md-primary)]"><option value="US">美国 US</option><option value="CA">加拿大 CA</option><option value="UK">英国 UK</option><option value="DE">德国 DE</option><option value="JP">日本 JP</option></select></label><button disabled={submitting} className="rounded-lg bg-[var(--md-primary)] px-5 py-2.5 font-label text-sm font-semibold text-[var(--md-on-primary)] disabled:opacity-60">{submitting ? "正在运行…" : "开始查询"}</button>{error ? <p className="sm:col-span-3 font-label text-sm text-[var(--md-error)]">{error}</p> : null}</form>;
}
