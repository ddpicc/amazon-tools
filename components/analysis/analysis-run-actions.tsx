'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publicText } from "@/lib/public-text";

export function AnalysisRunActions({ runId, status, marketplace, projects, attachedProjectId }: { runId: string; status: string; marketplace: string; projects: Array<{ id: string; name: string; marketplace: string }>; attachedProjectId: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState(attachedProjectId ?? "");
  const retry = async () => { setBusy(true); setError(null); const response = await fetch(`/api/analysis-runs/${runId}/retry`, { method: "POST" }); const payload = await response.json(); setBusy(false); if (!response.ok) return setError(publicText(payload.error ?? "重试失败")); router.refresh(); };
  const attach = async () => { if (!projectId) return; setBusy(true); setError(null); const response = await fetch(`/api/analysis-runs/${runId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }); const payload = await response.json(); setBusy(false); if (!response.ok) return setError(publicText(payload.error ?? "关联失败")); router.refresh(); };
  return <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4 sm:flex-row sm:items-end"><div className="grid flex-1 gap-2"><label className="font-label text-xs text-[var(--md-on-surface-variant)]">保存到项目（仅显示相同站点）</label><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 font-label text-sm text-[var(--md-on-surface)]"><option value="">不关联项目</option>{projects.filter((project) => project.marketplace === marketplace).map((project) => <option key={project.id} value={project.id}>{project.name} · {project.marketplace}</option>)}</select></div><button onClick={attach} disabled={busy || !projectId} className="rounded-lg border border-[var(--md-outline-variant)] px-4 py-2 font-label text-sm text-[var(--md-on-surface)] disabled:opacity-50">关联项目</button>{status === "FAILED" ? <button onClick={retry} disabled={busy} className="rounded-lg bg-[var(--md-primary)] px-4 py-2 font-label text-sm font-semibold text-[var(--md-on-primary)] disabled:opacity-50">重试</button> : null}{error ? <p className="font-label text-sm text-[var(--md-error)]">{error}</p> : null}</div>;
}
