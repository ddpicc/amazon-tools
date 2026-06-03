import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';

type AppShellProps = {
  sidebarItems: Array<{
    icon: React.ReactNode;
    label: string;
    href: string;
  }>;
  homeHref?: string;
  breadcrumb?: string;
  notificationHref?: string;
  unreadNotificationCount?: number;
  children: React.ReactNode;
};

export function AppShell({
  sidebarItems,
  homeHref,
  breadcrumb,
  notificationHref,
  unreadNotificationCount = 0,
  children
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--md-surface)] text-[var(--md-on-background)]">
      <TopBar
        homeHref={homeHref}
        breadcrumb={breadcrumb}
        notificationHref={notificationHref}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="flex flex-1">
        <Sidebar items={sidebarItems} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
