import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/server/db";

const sidebarItems = [
  {
    label: "工作台",
    items: [
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z" />
          </svg>
        ),
        label: "首页",
        href: "/dashboard",
      },
    ],
  },
  {
    label: "项目",
    items: [
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        ),
        label: "我的项目",
        href: "/projects",
      },
    ],
  },
  {
    label: "工具",
    items: [
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M22.7 19.3 13.4 10a6 6 0 0 1-7.9-7.9l3.1 3.1 2.1-2.1-3.1-3.1A6 6 0 0 1 10 7.9l9.3 9.3a2.4 2.4 0 0 1-3.4 3.4Z" />
          </svg>
        ),
        label: "工具箱",
        href: "/tools",
      },
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M4 4h16v12H7l-3 3V4Zm3 5h10v2H7V9Zm0 4h7v-2H7v2Z" />
          </svg>
        ),
        label: "需求墙",
        href: "/feedback",
      },
    ],
  },
  {
    label: "账户",
    items: [
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M2 6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6zm2 0v2h16V6H4zm0 4v8h16v-8H4z" />
          </svg>
        ),
        label: "套餐与用量",
        href: "/billing",
      },
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-2-10H7v2h10V9zm0 4H7v2h7v-2z" />
          </svg>
        ),
        label: "使用帮助",
        href: "/help/webhooks",
      },
    ],
  },
];

export default async function GlobalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const unreadNotificationCount = session?.user?.id
    ? await db.inboxNotification.count({
        where: {
          userId: session.user.id,
          readAt: null,
        },
      })
    : 0;

  return (
    <AppShell
      sidebarItems={sidebarItems}
      homeHref="/dashboard"
      breadcrumb="经营工作台"
      notificationHref="/dashboard"
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
