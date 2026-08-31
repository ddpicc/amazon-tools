"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanOption = {
  code: string;
  displayName: string;
};

type UserSubscriptionFormProps = {
  userId: string;
  initialPlanCode: string;
  initialStatus: string;
  planOptions: PlanOption[];
};

export function UserSubscriptionForm({
  userId,
  initialPlanCode,
  initialStatus,
  planOptions
}: UserSubscriptionFormProps) {
  const router = useRouter();
  const [planCode, setPlanCode] = useState(initialPlanCode);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${userId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, status })
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "更新失败");
      return;
    }

    setMessage("已更新");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 xl:flex-row">
        <select
          value={planCode}
          onChange={(event) => setPlanCode(event.target.value)}
          className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] px-3 py-2 text-sm text-[var(--md-on-surface)]"
        >
          {planOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.displayName}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] px-3 py-2 text-sm text-[var(--md-on-surface)]"
        >
          <option value="TRIALING">TRIALING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="CANCELED">CANCELED</option>
          <option value="SCHEDULED_DOWNGRADE">SCHEDULED_DOWNGRADE</option>
        </select>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[var(--md-primary)] px-3 py-2 text-sm font-semibold text-[var(--md-on-primary)] transition hover:bg-[var(--md-primary-dim)] disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
      {message ? <p className="text-xs text-[var(--md-primary)]">{message}</p> : null}
    </div>
  );
}
