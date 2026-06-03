import { auth } from '@/auth';
import { AppShell } from '@/components/layout/app-shell';
import { db } from '@/server/db';

const sidebarItems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z" />
      </svg>
    ),
    label: 'Projects',
    href: '/projects'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>
    ),
    label: 'Billing',
    href: '/billing'
  }
];

export default async function GlobalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unreadNotificationCount = session?.user?.id
    ? await db.inboxNotification.count({
        where: {
          userId: session.user.id,
          readAt: null
        }
      })
    : 0;

  return (
    <AppShell
      sidebarItems={sidebarItems}
      homeHref="/projects"
      breadcrumb="Projects"
      notificationHref="/projects"
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
