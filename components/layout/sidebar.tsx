'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarItem = {
  icon: React.ReactNode;
  label: string;
  href?: string;
  description?: string;
};

type SidebarProps = {
  items: Array<SidebarItem | { label: string; items: SidebarItem[] }>;
};

function isGroup(item: SidebarProps["items"][number]): item is { label: string; items: SidebarItem[] } {
  return "items" in item;
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const navigationItems = items.flatMap((item) => (isGroup(item) ? item.items : [item]));
  const activeHref =
    navigationItems
      .map((item) => item.href)
      .filter((href): href is string => Boolean(href))
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
      <nav className="flex-1 space-y-1 p-3">
        {items.map((entry, entryIndex) => {
          const group = isGroup(entry) ? entry : null;
          const groupItems: SidebarItem[] = group ? group.items : [entry as SidebarItem];
          return (
            <div key={group?.label ?? groupItems[0]?.href ?? entryIndex} className={entryIndex ? "mt-5" : ""}>
              {group ? <p className="px-3 pb-2 font-label text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--md-outline)]">{group.label}</p> : null}
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const active = item.href === activeHref;
                  const className = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-label text-sm transition ${
                    active
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                      : item.href
                        ? 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] hover:text-[var(--md-on-surface)]'
                        : 'cursor-not-allowed text-[var(--md-outline)]'
                  }`;
                  const content = <><span className="shrink-0">{item.icon}</span><span className="min-w-0 flex-1">{item.label}</span>{item.description ? <span className="text-[10px] text-[var(--md-outline)]">{item.description}</span> : null}</>;
                  return item.href ? <Link key={item.href} href={item.href} className={className}>{content}</Link> : <div key={item.label} className={className} aria-disabled="true">{content}</div>;
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
