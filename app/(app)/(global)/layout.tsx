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
