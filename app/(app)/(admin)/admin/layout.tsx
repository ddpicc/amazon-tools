import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/server/db";
import { redirect } from "next/navigation";

const sidebarItems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
    label: "总览",
    href: "/admin"
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.98 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    label: "用户",
    href: "/admin/users"
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 11h-2v-2h2v2zm0-4h-2V6h2v4z" />
      </svg>
    ),
    label: "订阅对账",
    href: "/admin/subscriptions"
  }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const unreadNotificationCount = await db.inboxNotification.count({
    where: {
      userId: session.user.id,
      readAt: null
    }
  });

  return (
    <AppShell
      sidebarItems={sidebarItems}
      homeHref="/admin"
      breadcrumb="Admin"
      notificationHref="/admin"
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
