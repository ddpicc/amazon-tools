import { db } from "@/server/db";
import { formatDateTime } from "@/lib/date-time";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      createdAt: true,
      _count: {
        select: {
          projects: true
        }
      },
      projects: {
        select: {
          _count: {
            select: {
              trackedAsins: true
            }
          }
        }
      }
    }
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">Admin Console</p>
          <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">所有用户</h1>
          <p className="mt-3 text-sm text-[var(--md-on-surface-variant)]">
            查看全部账号、角色、项目数量和订阅 ASIN 规模。
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3 text-sm text-[var(--md-on-surface-variant)]">
          共 {users.length.toLocaleString("zh-CN")} 位用户
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
        <div className="grid grid-cols-[minmax(220px,2fr)_100px_100px_120px_180px_180px] gap-4 border-b border-[var(--md-outline-variant)] px-6 py-4 text-xs uppercase tracking-[0.2em] text-[var(--md-on-surface-variant)]">
          <span>用户</span>
          <span>角色</span>
          <span>套餐</span>
          <span>项目数</span>
          <span>订阅 ASIN</span>
          <span>创建时间</span>
        </div>

        {users.map((user) => {
          const trackedAsinCount = user.projects.reduce((sum, project) => sum + project._count.trackedAsins, 0);

          return (
            <div
              key={user.id}
              className="grid grid-cols-[minmax(220px,2fr)_100px_100px_120px_180px_180px] gap-4 border-b border-[var(--md-outline-variant)] px-6 py-5 text-sm last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--md-on-surface)]">{user.name || "未命名用户"}</p>
                <p className="mt-1 truncate text-[var(--md-on-surface-variant)]">{user.email}</p>
              </div>
              <div className="text-[var(--md-on-surface)]">{user.role === "ADMIN" ? "管理员" : "成员"}</div>
              <div className="text-[var(--md-on-surface)]">{user.plan}</div>
              <div className="text-[var(--md-on-surface)]">{user._count.projects}</div>
              <div className="text-[var(--md-on-surface)]">{trackedAsinCount}</div>
              <div className="text-[var(--md-on-surface-variant)]">{formatDateTime(user.createdAt)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
