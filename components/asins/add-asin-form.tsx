"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getBillingErrorHint,
  isBillingLimitErrorCode,
  isUpgradeEligibleBillingErrorCode
} from "@/lib/billing-error-client";
type AddAsinFormProps = {
  projectId: string;
};

export function AddAsinForm({ projectId }: AddAsinFormProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [role, setRole] = useState<"OWN" | "COMPETITOR">("COMPETITOR");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function submit() {
    if (!value.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setErrorCode(null);

    const res = await fetch(`/api/projects/${projectId}/asins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asin: value.trim(), role })
    });

    setLoading(false);

    const data = await res.json().catch(() => null);

    if (res.ok) {
      const initialCollections = Array.isArray(data?.initialCollections) ? data.initialCollections : [];
      const failedInitialCollections = initialCollections.filter((item: { status?: string }) => item.status === "FAILED");
      const skippedInitialCollections = initialCollections.filter((item: { status?: string }) => item.status === "SKIPPED");

      setValue("");
      setRole("COMPETITOR");
      setSuccessMessage(
        failedInitialCollections.length
          ? `ASIN 已添加，但 ${failedInitialCollections.length} 个对象首次采集失败，系统会在下次定时任务中重试。`
          : skippedInitialCollections.length
            ? "该 ASIN 已在项目中，未重复触发采集。"
            : "ASIN 已添加并完成首次采集。"
      );
      router.refresh();
      return;
    }

    const hint = isBillingLimitErrorCode(data?.code) ? getBillingErrorHint(data.code) : null;
    setErrorCode(isBillingLimitErrorCode(data?.code) ? data.code : null);
    setErrorMessage(hint ? `${data?.error ?? "添加 ASIN 失败，请检查额度与输入内容后重试。"}\n${hint}` : data?.error ?? "添加 ASIN 失败，请检查额度与输入内容后重试。");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "OWN" | "COMPETITOR")}
          className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-2.5 font-label text-sm text-[var(--md-on-surface)]"
        >
          <option value="OWN">自有商品</option>
          <option value="COMPETITOR">竞品</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="输入 ASIN，例如 B0ABCDE123"
          className="flex-1 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] px-4 py-2.5 font-label text-sm text-[var(--md-on-surface)] placeholder:text-[var(--md-outline)]"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[var(--md-primary)] px-4 py-2.5 font-headline text-sm font-semibold text-[var(--md-on-primary)] shadow-lg shadow-[var(--md-primary)]/10 transition hover:bg-[var(--md-primary-dim)] disabled:opacity-60"
        >
          {loading ? "添加中..." : "添加商品"}
        </button>
      </div>
      {successMessage ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="space-y-3 rounded-xl border border-[var(--md-error)]/25 bg-[var(--md-error)]/8 p-3">
          <p className="whitespace-pre-line text-sm text-[var(--md-error)]">{errorMessage}</p>
          {isUpgradeEligibleBillingErrorCode(errorCode) ? (
            <Link
              href="/billing?from=add-asin#plans"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--md-primary)] px-3 py-2 text-sm font-semibold text-[var(--md-on-primary)] transition hover:bg-[var(--md-primary-dim)]"
            >
              去升级套餐
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
