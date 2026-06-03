import { auth } from '@/auth';
import { db } from '@/server/db';
import { AppShell } from '@/components/layout/app-shell';
import { redirect } from 'next/navigation';

type ProjectLayoutProps = {
  params: { projectId: string };
  children: React.ReactNode;
};

export default async function ProjectLayout({ params, children }: ProjectLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role === 'ADMIN') redirect('/admin');

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: { id: true, name: true, marketplace: true }
  });

  if (!project) return null;

  const unreadNotificationCount = await db.inboxNotification.count({
    where: {
      userId: session.user.id,
      readAt: null
    }
  });

  // Project-level sidebar items
  const sidebarItems = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ),
      label: 'Dashboard',
      href: `/projects/${params.projectId}`
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M4 5h6v14H4V5zm10 4h6v10h-6V9z" />
        </svg>
      ),
      label: 'Compare',
      href: `/projects/${params.projectId}/compare`
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 15H5V8h14v10zm-9-1h7v-2h-7v2zm0-3h7v-2h-7v2zm0-3h4V9h-4v2z" />
        </svg>
      ),
      label: 'Snapshots',
      href: `/projects/${params.projectId}/trends`
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
        </svg>
      ),
      label: 'ASINs',
      href: `/projects/${params.projectId}/asins`
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
        </svg>
      ),
      label: 'Digest',
      href: `/projects/${params.projectId}/digest`
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      ),
      label: 'Settings',
      href: `/projects/${params.projectId}/settings`
    }
  ];

  return (
    <AppShell
      sidebarItems={sidebarItems}
      homeHref="/projects"
      breadcrumb={project.name}
      notificationHref={`/projects/${params.projectId}#recent-alerts`}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
