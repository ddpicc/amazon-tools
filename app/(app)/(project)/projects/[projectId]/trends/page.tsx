import { auth } from "@/auth";
import { ListingIntelligenceGrid } from "@/components/projects/listing-intelligence-grid";
import { db } from "@/server/db";

export default async function ListingIntelligencePage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await db.project.findFirst({ where: { id: params.projectId, userId: session.user.id }, select: { id: true, name: true, marketplace: true, trackedAsins: { orderBy: [{ role: "asc" }, { updatedAt: "desc" }], select: { id: true, asin: true, role: true, title: true, consecutiveFailures: true, snapshots: { orderBy: { capturedAt: "desc" }, take: 2, select: { capturedAt: true, price: true, coupon: true, dealType: true, rating: true, bsr: true, category: true, categoryNodeId: true, bsrCategory: true, sellerCount: true, buyboxSeller: true, buyboxSellerId: true, photoUrls: true, ebcPhotoUrls: true, variantCount: true, capture: { select: { sourceKind: true, provider: true, apiName: true, capturedAt: true } } } } } } } });
  if (!project) return null;
  const cards = project.trackedAsins;
  return <div className="mx-auto max-w-6xl space-y-8"><div><p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Listing intelligence</p><h1 className="mt-3 font-headline text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">Listing 状态与竞品情报</h1><p className="mt-2 max-w-3xl font-label text-sm text-[var(--md-on-surface-variant)]">{project.marketplace} · {project.name}。每天使用订阅采集更新价格、促销、变体、评分、BSR 与素材等 Listing 状态。</p></div>{cards.length ? <ListingIntelligenceGrid items={cards} projectId={project.id} /> : <div className="rounded-2xl border border-dashed border-[var(--md-outline-variant)] p-8 text-center font-label text-sm text-[var(--md-on-surface-variant)]">尚未添加 ASIN。每个项目最多添加 10 个自有或竞品 ASIN。</div>}</div>;
}
