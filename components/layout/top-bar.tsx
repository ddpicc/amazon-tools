'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type TopBarProps = {
  homeHref?: string;
  breadcrumb?: string;
  notificationHref?: string;
  unreadNotificationCount?: number;
  children?: React.ReactNode;
};

export function TopBar({
  homeHref = '/projects',
  breadcrumb,
  notificationHref = '/projects',
  unreadNotificationCount = 0,
  children
}: TopBarProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(unreadNotificationCount);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function handleNotificationClick() {
    if (unreadCount > 0) {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      });

      if (response.ok) {
        setUnreadCount(0);
      }
    }

    router.push(notificationHref);
    router.refresh();
  }

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--md-outline-variant)] bg-[var(--md-surface)]/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link
          href={homeHref}
          className="font-headline text-xl font-bold tracking-tight text-[var(--md-primary)] transition hover:text-[var(--md-primary-dim)]"
        >
          Sellumio
        </Link>
        {breadcrumb ? (
          <>
            <span className="text-lg text-[var(--md-outline-variant)]">/</span>
            <span className="font-headline text-sm font-medium text-[var(--md-on-surface)]">
              {breadcrumb}
            </span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-56 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 pl-10 font-label text-sm text-[var(--md-on-surface)] placeholder:text-[var(--md-on-surface-variant)] focus:border-[var(--md-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)]"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {/* Notifications */}
        <button
          type="button"
          onClick={handleNotificationClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--md-on-surface-variant)] transition hover:bg-[var(--md-surface-container)] hover:text-[var(--md-on-surface)]"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </svg>
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--md-error)] px-1.5 font-label text-[10px] font-semibold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] transition hover:border-[var(--md-primary)] hover:text-[var(--md-on-surface)]"
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            aria-label="账号菜单"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </button>

          {accountMenuOpen ? (
            <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] shadow-lg shadow-black/20">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[var(--md-on-surface)] transition hover:bg-[var(--md-surface-container-high)]"
              >
                <span>退出登录</span>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-[var(--md-on-surface-variant)]">
                  <path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H4v2h8.67l-2.58 2.59zM19 3H9c-1.1 0-2 .9-2 2v4h2V5h10v14H9v-4H7v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
