"use client";

import { useMemo, useState } from "react";
import { ListingIntelligenceCard } from "@/components/projects/listing-intelligence-card";

type Item = React.ComponentProps<typeof ListingIntelligenceCard>["item"];
function hasChange(item: Item) { const [latest, previous] = item.snapshots; if (!latest || !previous) return false; return ["price", "coupon", "dealType", "rating", "bsr", "variantCount", "sellerCount", "buyboxSeller", "photoUrls", "ebcPhotoUrls"].some((key) => JSON.stringify(latest[key as keyof typeof latest]) !== JSON.stringify(previous[key as keyof typeof previous])); }

export function ListingIntelligenceGrid({ items, projectId }: { items: Item[]; projectId: string }) {
  const [role, setRole] = useState<"ALL" | "OWN" | "COMPETITOR">("ALL"); const [changedOnly, setChangedOnly] = useState(false);
  const visible = useMemo(() => items.filter((item) => (role === "ALL" || item.role === role) && (!changedOnly || hasChange(item))).sort((a, b) => Number(hasChange(b)) - Number(hasChange(a))), [items, role, changedOnly]);
  return <><div className="flex flex-wrap items-center gap-3"><select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 font-label text-sm"><option value="ALL">全部 ASIN</option><option value="OWN">仅自有</option><option value="COMPETITOR">仅竞品</option></select><label className="flex items-center gap-2 font-label text-sm"><input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} />仅显示有变化</label><span className="font-label text-sm text-[var(--md-on-surface-variant)]">{visible.length} 个对象</span></div><div className="grid gap-5 xl:grid-cols-2">{visible.map((item) => <ListingIntelligenceCard key={item.id} item={item} projectId={projectId} />)}</div>{!visible.length ? <div className="rounded-2xl border border-dashed border-[var(--md-outline-variant)] p-8 text-center font-label text-sm text-[var(--md-on-surface-variant)]">当前筛选条件下没有匹配的监控对象。</div> : null}</>;
}
