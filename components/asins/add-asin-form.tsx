"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AddAsinFormProps = {
  projectId: string;
};

export function AddAsinForm({ projectId }: AddAsinFormProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [role, setRole] = useState<"OWN" | "COMPETITOR">("COMPETITOR");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!value.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/asins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asin: value.trim(), role })
    });
    setLoading(false);
    if (res.ok) {
      setValue("");
      setRole("COMPETITOR");
      router.refresh();
    }
  }

  return (
    <div className="flex items-end gap-3">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "OWN" | "COMPETITOR")}
        className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-2.5 font-label text-sm text-[var(--md-on-surface)]"
      >
        <option value="OWN">Own</option>
        <option value="COMPETITOR">Competitor</option>
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
        {loading ? "添加中..." : "Add ASIN"}
      </button>
    </div>
  );
}
