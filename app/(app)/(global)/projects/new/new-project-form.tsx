"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getBillingErrorHint,
  isBillingLimitErrorCode,
  isUpgradeEligibleBillingErrorCode
} from "@/lib/billing-error-client";
import {
  formatProjectLimitReached,
  formatTrackedAsinLimitReached
} from "@/server/services/billing/messages";
type NewProjectFormProps = {
  billing: {
    planName: string;
    billingState: string;
    billingStatusLabel: string;
    billingStatusDescription: string;
    billingStatusBadgeClassName: string;
    projectCount: number;
    maxProjects: number;
    activeTrackedAsinCount: number;
    maxTrackedAsins: number;
    maxOwnAsinsPerProject: number;
    maxCompetitorAsinsPerProject: number;
    planRecentlyChanged: boolean;
    planLastChangedAtLabel: string | null;
  };
};

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

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default function NewProjectForm({ billing }: NewProjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [ownAsinsInput, setOwnAsinsInput] = useState("");
  const [competitorAsinsInput, setCompetitorAsinsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const ownCount = useMemo(() => parseAsinLines(ownAsinsInput).length, [ownAsinsInput]);
  const competitorCount = useMemo(() => parseAsinLines(competitorAsinsInput).length, [competitorAsinsInput]);
  const newTrackedAsinCount = ownCount + competitorCount;
  const projectedTrackedAsins = billing.activeTrackedAsinCount + newTrackedAsinCount;
  const remainingProjectSlots = Math.max(0, billing.maxProjects - billing.projectCount);
  const remainingTrackedAsinSlots = Math.max(0, billing.maxTrackedAsins - billing.activeTrackedAsinCount);

  const projectAsinLimitExceeded = newTrackedAsinCount > 10;
  const projectLimitExceeded = remainingProjectSlots < 1;
  const trackedAsinLimitExceeded = projectedTrackedAsins > billing.maxTrackedAsins;

  const blockingMessage = projectLimitExceeded
    ? formatProjectLimitReached(billing.maxProjects)
    : projectAsinLimitExceeded
      ? "单个项目最多可添加 10 个 ASIN（自有与竞品合计）。"
        : trackedAsinLimitExceeded
          ? formatTrackedAsinLimitReached(billing.maxTrackedAsins, projectedTrackedAsins)
          : null;

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

    if (blockingMessage) {
      setErrorMessage(blockingMessage);
      setErrorCode(
        projectLimitExceeded
          ? "PROJECT_LIMIT_REACHED"
          : trackedAsinLimitExceeded
            ? "TRACKED_ASIN_LIMIT_REACHED"
            : projectAsinLimitExceeded
              ? "PROJECT_ASIN_LIMIT_REACHED"
                : null
      );
      return;
    }

    setErrorMessage(null);
    setErrorCode(null);
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
      const hint = isBillingLimitErrorCode(data?.code) ? getBillingErrorHint(data.code) : null;
      setLoading(false);
      setErrorCode(isBillingLimitErrorCode(data?.code) ? data.code : null);
      setErrorMessage(hint ? `${data?.error ?? "项目创建失败，请检查输入内容后重试。"}\n${hint}` : data?.error ?? "项目创建失败，请检查输入内容后重试。");
      return;
    }

    const data = await response.json();
    setStageIndex(progressStages.length - 1);
    setLoading(false);
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
      <div className="mx-auto max-w-5xl space-y-6">
        {billing.planRecentlyChanged ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
            <p className="font-semibold text-emerald-200">套餐已更新并立即生效</p>
            <p className="mt-2 text-emerald-100/90">
              {billing.planLastChangedAtLabel
                ? `最近一次套餐变更时间：${billing.planLastChangedAtLabel}。下面显示的项目额度与 ASIN 上限都已按最新套餐刷新。`
                : "你当前看到的项目额度与 ASIN 上限已经按最新套餐刷新。"}
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm text-zinc-300">Own ASIN</label>
                  <span className={`text-xs ${projectAsinLimitExceeded ? "text-rose-300" : "text-zinc-500"}`}>
                    项目合计最多 10 个，换行或逗号分隔
                  </span>
                </div>
                <textarea
                  value={ownAsinsInput}
                  onChange={(event) => setOwnAsinsInput(event.target.value.toUpperCase())}
                  rows={3}
                  placeholder="B0ABCDE123"
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${
                    projectAsinLimitExceeded ? "border-rose-400 bg-rose-500/5" : "border-zinc-700 bg-zinc-950"
                  }`}
                />
                <p className={`mt-2 text-xs ${projectAsinLimitExceeded ? "text-rose-300" : "text-zinc-500"}`}>
                  已填写 {ownCount} 个
                </p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm text-zinc-300">Competitor ASIN</label>
                  <span className={`text-xs ${projectAsinLimitExceeded ? "text-rose-300" : "text-zinc-500"}`}>
                    项目合计最多 10 个，换行或逗号分隔
                  </span>
                </div>
                <textarea
                  value={competitorAsinsInput}
                  onChange={(event) => setCompetitorAsinsInput(event.target.value.toUpperCase())}
                  rows={6}
                  placeholder="B0ABCDE124\nB0ABCDE125"
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${
                    projectAsinLimitExceeded ? "border-rose-400 bg-rose-500/5" : "border-zinc-700 bg-zinc-950"
                  }`}
                />
                <p className={`mt-2 text-xs ${projectAsinLimitExceeded ? "text-rose-300" : "text-zinc-500"}`}>
                  已填写 {competitorCount} 个
                </p>
              </div>
              <button
                disabled={loading || Boolean(blockingMessage)}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
              >
                {loading ? `${progressStages[stageIndex]}...` : "创建项目"}
              </button>
              {errorMessage ? (
                <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <p className="whitespace-pre-line text-sm text-rose-200">{errorMessage}</p>
                  {isUpgradeEligibleBillingErrorCode(errorCode) ? (
                    <Link
                      href="/billing?from=create-project#plans"
                      className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
                    >
                      去升级套餐
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </form>
          </div>

          <aside className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-400">当前套餐</p>
              <h2 className="mt-3 text-2xl font-semibold text-zinc-50">{billing.planName}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${billing.billingStatusBadgeClassName}`}>
                  {billing.billingStatusLabel}
                </span>
                <p className="text-sm text-zinc-400">{billing.billingStatusDescription}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <StatCard
                label="项目额度"
                value={`${billing.projectCount} / ${billing.maxProjects}`}
                hint={`还可创建 ${remainingProjectSlots} 个项目`}
              />
              <StatCard
                label="活跃 ASIN"
                value={`${billing.activeTrackedAsinCount} / ${billing.maxTrackedAsins}`}
                hint={`当前还剩 ${remainingTrackedAsinSlots} 个 ASIN 名额`}
              />
              <StatCard
                label="本次新增"
                value={`${newTrackedAsinCount}`}
                hint={`创建后预计变为 ${projectedTrackedAsins} / ${billing.maxTrackedAsins}`}
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300">
              <p className="font-medium text-zinc-100">创建规则说明</p>
              <ul className="mt-3 space-y-2 text-zinc-400">
                <li>• 当前套餐只限制项目数和总 ASIN 数，已有功能都可正常使用。</li>
                <li>• 单个项目最多 10 个 ASIN，自有与竞品可自由组合。</li>
                <li>• 手动刷新规则不区分套餐：每个 ASIN 每天最多 1 次。</li>
              </ul>
            </div>

            {blockingMessage ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                {blockingMessage}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                当前输入在套餐额度内，可以继续创建。
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
