import Link from "next/link";

const tools = [
  ["/tools/product-lookup", "商品事实查询", "按 ASIN 查询公开商品事实、价格、评分和 Listing 状态。"],
  ["/tools/reviews", "评论洞察", "获取公开评论，提炼痛点、代表性原话和改进方向。"],
  ["/tools/keywords", "关键词研究", "查询关键词覆盖、自然/广告排名、搜索量和 CPC。"]
];

export default function ToolsPage() {
  return <div className="mx-auto max-w-6xl space-y-8"><div><p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Tools</p><h1 className="mt-3 font-headline text-3xl font-bold text-[var(--md-on-surface)]">工具箱</h1><p className="mt-2 max-w-2xl font-label text-sm text-[var(--md-on-surface-variant)]">工具运行不会创建监控订阅或改写历史事实；结果可关联到项目。</p></div><div className="grid gap-5 md:grid-cols-2">{tools.map(([href, title, description]) => <Link key={href} href={href} className="rounded-2xl border border-[var(--md-primary)]/50 bg-[var(--md-surface-container)] p-6 transition hover:border-[var(--md-primary)]"><p className="font-label text-xs font-semibold uppercase tracking-[0.16em] text-[var(--md-primary)]">分析工具</p><h2 className="mt-3 font-headline text-xl font-semibold text-[var(--md-on-surface)]">{title}</h2><p className="mt-2 font-label text-sm leading-6 text-[var(--md-on-surface-variant)]">{description}</p></Link>)}</div></div>;
}
