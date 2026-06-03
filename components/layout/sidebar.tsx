'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarItem = {
  icon: React.ReactNode;
  label: string;
  href: string;
};

type SidebarProps = {
  items: SidebarItem[];
};

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const activeHref =
    items
      .map((item) => item.href)
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-label text-sm transition ${
                active
                  ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                  : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
