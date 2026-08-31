import { ProductLookupForm } from "@/components/analysis/product-lookup-form";

export default function ProductLookupToolPage() {
  return <div className="mx-auto max-w-3xl"><p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Product lookup</p><h1 className="mt-3 font-headline text-3xl font-bold text-[var(--md-on-surface)]">商品事实查询</h1><p className="mt-2 font-label text-sm leading-6 text-[var(--md-on-surface-variant)]">此工具只发起一次性公开数据查询；不会添加 ASIN 到项目，也不会创建持续监控订阅。</p><ProductLookupForm /></div>;
}
