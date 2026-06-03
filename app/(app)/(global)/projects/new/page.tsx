"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const marketplaces = [
  { code: "US", label: "US" },
  { code: "GB", label: "GB" },
  { code: "DE", label: "DE" },
  { code: "FR", label: "FR" },
  { code: "IN", label: "IN" },
  { code: "CA", label: "CA" },
  { code: "JP", label: "JP" },
  { code: "ES", label: "ES" },
  { code: "IT", label: "IT" },
  { code: "MX", label: "MX" },
  { code: "AE", label: "AE" },
  { code: "AU", label: "AU" },
  { code: "BR", label: "BR" },
  { code: "SA", label: "SA" }
];
const progressStages = ["创建项目", "批量订阅 ASIN", "拉取首批数据", "完成"];

function parseAsinLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [ownAsinsInput, setOwnAsinsInput] = useState("");
  const [competitorAsinsInput, setCompetitorAsinsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownCount = useMemo(() => parseAsinLines(ownAsinsInput).length, [ownAsinsInput]);
  const competitorCount = useMemo(() => parseAsinLines(competitorAsinsInput).length, [competitorAsinsInput]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, progressStages.length - 2));
    }, 900);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStageIndex(0);
    setLoading(true);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        marketplace,
        ownAsins: parseAsinLines(ownAsinsInput),
        competitorAsins: parseAsinLines(competitorAsinsInput)
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setLoading(false);
      setErrorMessage(data?.error ?? "项目初始化失败");
      return;
    }

    const data = await response.json();
    setStageIndex(progressStages.length - 1);
    setLoading(false);
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
      <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-400">New Project</p>
        <h1 className="mt-3 text-3xl font-semibold">创建监控项目</h1>
        <p className="mt-3 text-sm text-zinc-400">
          在创建阶段一次性填入 own ASIN 和竞品 ASIN。系统会在创建时完成批量订阅与首批数据初始化，完成后再进入 dashboard。
        </p>
        {loading ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-4 text-sm text-amber-100">
              <span>初始化进度</span>
              <span>{progressStages[stageIndex]}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{
                  width: `${((stageIndex + 1) / progressStages.length) * 100}%`
                }}
              />
            </div>
          </div>
        ) : null}
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-zinc-300">项目名称</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="例如：Water Bottle Competitors"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-zinc-300">站点</label>
            <select
              value={marketplace}
              onChange={(event) => setMarketplace(event.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            >
              {marketplaces.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm text-zinc-300">Own ASIN</label>
              <span className="text-xs text-zinc-500">最多 3 个，换行或逗号分隔，创建后默认不在项目页追加</span>
            </div>
            <textarea
              value={ownAsinsInput}
              onChange={(event) => setOwnAsinsInput(event.target.value.toUpperCase())}
              rows={3}
              placeholder="B0ABCDE123"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            />
            <p className="mt-2 text-xs text-zinc-500">已填写 {ownCount} 个</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm text-zinc-300">Competitor ASIN</label>
              <span className="text-xs text-zinc-500">最多 20 个，换行或逗号分隔，创建后默认不在项目页追加</span>
            </div>
            <textarea
              value={competitorAsinsInput}
              onChange={(event) => setCompetitorAsinsInput(event.target.value.toUpperCase())}
              rows={6}
              placeholder="B0ABCDE124\nB0ABCDE125"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            />
            <p className="mt-2 text-xs text-zinc-500">已填写 {competitorCount} 个</p>
          </div>
          <button
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {loading ? `${progressStages[stageIndex]}...` : "创建项目"}
          </button>
          {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
        </form>
      </div>
    </main>
  );
}
