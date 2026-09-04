"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { publicText } from "@/lib/public-text";

export function ManualDigestButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/digest`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "日报生成失败");
      }

      setMessage(
        data?.reason === "no_delivery_channels"
          ? "今日日报已生成，但尚未配置通知渠道。"
          : data?.reason === "already_sent"
            ? "今日日报已经生成。"
            : "今日日报已生成并发送。"
      );
      router.refresh();
    } catch (submissionError) {
      setError(publicText(submissionError instanceof Error ? submissionError.message : "日报生成失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="rounded-lg bg-[var(--md-primary)] px-4 py-2.5 font-label text-sm font-semibold text-[var(--md-on-primary)] shadow-[0_0_15px_rgba(249,188,69,0.15)] transition hover:bg-[var(--md-primary-dim)] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "正在生成日报…" : "生成今日日报"}
      </button>
      {message ? <p className="text-right font-label text-xs text-emerald-400">{message}</p> : null}
      {error ? <p className="text-right font-label text-xs text-[var(--md-error)]">{error}</p> : null}
    </div>
  );
}
