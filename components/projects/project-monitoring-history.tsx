"use client";

import { NotificationDeliveryStatus, NotificationChannelType, SyncJobStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectMonitoringHistoryProps = {
  projectId: string;
  pollJobs: Array<{
    id: string;
    status: SyncJobStatus;
    startedAt: string | Date | null;
    finishedAt: string | Date | null;
    errorMessage: string | null;
    failureLabel: string;
    failureDetail: string | null;
    createdAt: string | Date;
  }>;
  deliveries: Array<{
    id: string;
    channelType: NotificationChannelType;
    status: NotificationDeliveryStatus;
    errorMessage: string | null;
    failureLabel: string;
    failureDetail: string | null;
    createdAt: string | Date;
    channel: {
      name: string | null;
    } | null;
    alert: {
      title: string;
    };
  }>;
  suppressions: Array<{
    id: string;
    type: string;
    title: string;
    cooldownMinutes: number;
    createdAt: string | Date;
    trackedAsin: {
      asin: string;
    };
  }>;
  dailyDigests: Array<{
    id: string;
    digestDate: string | Date;
    status: string;
    errorMessage: string | null;
    sentAt: string | Date | null;
    summary: string;
  }>;
};

function formatDate(value: string | Date | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

function statusStyle(status: string) {
  if (status === "SUCCESS") return "bg-emerald-500/10 text-emerald-400";
  if (status === "FAILED") return "bg-[var(--md-error)]/10 text-[var(--md-error)]";
  if (status === "RUNNING") return "bg-sky-500/10 text-sky-300";
  return "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]";
}

function channelLabel(channelType: NotificationChannelType) {
  if (channelType === "FEISHU") return "飞书";
  if (channelType === "WECOM") return "企微";
  if (channelType === "EMAIL") return "邮件";
  return channelType;
}

function failureStyle(label: string) {
  if (label.includes("权限")) return "bg-[var(--md-error)]/10 text-[var(--md-error)]";
  if (label.includes("限流")) return "bg-[var(--md-primary)]/10 text-[var(--md-primary)]";
  if (label.includes("Sorftime")) return "bg-sky-500/10 text-sky-300";
  return "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]";
}

export function ProjectMonitoringHistory({
  projectId,
  pollJobs,
  deliveries,
  suppressions,
  dailyDigests
}: ProjectMonitoringHistoryProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retryFailedWebhooks() {
    setRetrying(true);
    setMessage(null);
    const response = await fetch(`/api/projects/${projectId}/notification-deliveries/retry`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setRetrying(false);
    if (!response.ok) {
      setMessage(data?.error ?? "重试失败");
      return;
    }
    setMessage(
      `已重试 ${data?.attempted ?? 0} 条，成功 ${data?.successCount ?? 0} 条，失败 ${data?.failedCount ?? 0} 条`
    );
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">监控历史与通知运维</h2>
          <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">
            查看最近轮询任务、通知投递记录和重复告警抑制记录，并可重试最近失败的飞书 / 企微投递。
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={retryFailedWebhooks}
            disabled={retrying}
            className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-2 font-label text-sm text-[var(--md-on-surface)] transition hover:border-[var(--md-primary)] hover:text-[var(--md-primary)] disabled:opacity-60"
          >
            {retrying ? "重试中..." : "重试失败 Webhook"}
          </button>
          {message ? <p className="max-w-72 text-right font-label text-xs text-[var(--md-on-surface-variant)]">{message}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {/* Poll jobs */}
        <div className="rounded-xl bg-[var(--md-surface-container-low)] p-4">
          <h3 className="font-headline text-sm font-semibold text-[var(--md-on-surface)]">最近轮询任务</h3>
          <div className="mt-4 space-y-3">
            {pollJobs.length ? (
              pollJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${statusStyle(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="font-label text-xs text-[var(--md-on-surface-variant)]">{formatDate(job.startedAt ?? job.createdAt)}</span>
                  </div>
                  {job.errorMessage ? (
                    <p className="mt-2">
                      <span className={`rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${failureStyle(job.failureLabel)}`}>
                        {job.failureLabel}
                      </span>
                    </p>
                  ) : null}
                  {job.failureDetail ? <p className="mt-2 font-label text-xs text-[var(--md-on-surface-variant)]">{job.failureDetail}</p> : null}
                  <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">完成时间：{formatDate(job.finishedAt)}</p>
                  {job.errorMessage ? <p className="mt-2 font-label text-sm text-[var(--md-error)]">{job.errorMessage}</p> : null}
                </div>
              ))
            ) : (
              <p className="font-label text-sm text-[var(--md-on-surface-variant)]">暂无轮询历史。</p>
            )}
          </div>
        </div>

        {/* Deliveries */}
        <div className="rounded-xl bg-[var(--md-surface-container-low)] p-4">
          <h3 className="font-headline text-sm font-semibold text-[var(--md-on-surface)]">最近通知投递</h3>
          <div className="mt-4 space-y-3">
            {deliveries.length ? (
              deliveries.map((delivery) => (
                <div key={delivery.id} className="rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-label text-sm font-medium text-[var(--md-on-surface)]">
                      {channelLabel(delivery.channelType)} · {delivery.channel?.name ?? "未命名渠道"}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${statusStyle(delivery.status)}`}>
                      {delivery.status}
                    </span>
                  </div>
                  {delivery.errorMessage ? (
                    <p className="mt-2">
                      <span className={`rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${failureStyle(delivery.failureLabel)}`}>
                        {delivery.failureLabel}
                      </span>
                    </p>
                  ) : null}
                  {delivery.failureDetail ? <p className="mt-2 font-label text-xs text-[var(--md-on-surface-variant)]">{delivery.failureDetail}</p> : null}
                  <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">{delivery.alert.title}</p>
                  <p className="mt-1 font-label text-sm text-[var(--md-outline)]">{formatDate(delivery.createdAt)}</p>
                  {delivery.errorMessage ? <p className="mt-2 font-label text-sm text-[var(--md-error)]">{delivery.errorMessage}</p> : null}
                </div>
              ))
            ) : (
              <p className="font-label text-sm text-[var(--md-on-surface-variant)]">暂无通知投递记录。</p>
            )}
          </div>
        </div>

        {/* Suppressions */}
        <div className="rounded-xl bg-[var(--md-surface-container-low)] p-4">
          <h3 className="font-headline text-sm font-semibold text-[var(--md-on-surface)]">最近抑制记录</h3>
          <div className="mt-4 space-y-3">
            {suppressions.length ? (
              suppressions.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container)] p-3">
                  <p className="font-label text-sm font-medium text-[var(--md-on-surface)]">{item.trackedAsin.asin}</p>
                  <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">{item.title}</p>
                  <p className="mt-1 font-label text-sm text-[var(--md-outline)]">
                    {item.type} · 冷却 {item.cooldownMinutes} 分钟
                  </p>
                  <p className="mt-1 font-label text-sm text-[var(--md-outline)]">{formatDate(item.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="font-label text-sm text-[var(--md-on-surface-variant)]">暂无抑制记录。</p>
            )}
          </div>
        </div>

        {/* Daily digests */}
        <div className="rounded-xl bg-[var(--md-surface-container-low)] p-4">
          <h3 className="font-headline text-sm font-semibold text-[var(--md-on-surface)]">最近日报发送</h3>
          <div className="mt-4 space-y-3">
            {dailyDigests.length ? (
              dailyDigests.map((digest) => (
                <div key={digest.id} className="rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${statusStyle(digest.status)}`}>
                      {digest.status}
                    </span>
                    <span className="font-label text-xs text-[var(--md-on-surface-variant)]">{formatDate(digest.digestDate)}</span>
                  </div>
                  <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">发送时间：{formatDate(digest.sentAt)}</p>
                  {digest.errorMessage ? <p className="mt-2 font-label text-sm text-[var(--md-error)]">{digest.errorMessage}</p> : null}
                </div>
              ))
            ) : (
              <p className="font-label text-sm text-[var(--md-on-surface-variant)]">暂无日报发送记录。</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
