import { formatDateTime } from "@/lib/date-time";
import { getBillingStatusPresentation } from "@/lib/billing-status";
import { UserSubscriptionForm } from "@/components/admin/user-subscription-form";
import { db } from "@/server/db";
import {
  ensureDefaultPlanDefinitions,
  getLegacyPlanCode,
  listPlanDefinitions
} from "@/server/services/billing/catalog";

export default async function AdminUsersPage() {
  await ensureDefaultPlanDefinitions();

  const [users, planOptions] = await Promise.all([
    db.user.findMany({
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
        subscription: {
          include: {
            plan: true
          }
        },
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
    }),
    listPlanDefinitions()
  ]);

  const planByCode = new Map(planOptions.map((plan) => [plan.code, plan]));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">Admin Console</p>
          <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">所有用户</h1>
          <p className="mt-3 text-sm text-[var(--md-on-surface-variant)]">
            查看全部账号、角色、订阅状态、项目数量和活跃 ASIN 规模，并直接调整套餐。
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3 text-sm text-[var(--md-on-surface-variant)]">
          共 {users.length.toLocaleString("zh-CN")} 位用户
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
        <div className="grid grid-cols-[minmax(220px,2fr)_100px_120px_120px_120px_140px_220px_180px] gap-4 border-b border-[var(--md-outline-variant)] px-6 py-4 text-xs uppercase tracking-[0.2em] text-[var(--md-on-surface-variant)]">
          <span>用户</span>
          <span>角色</span>
          <span>套餐</span>
          <span>状态</span>
          <span>项目数</span>
          <span>活跃 ASIN</span>
          <span>套餐设置</span>
          <span>创建时间</span>
        </div>

        {users.map((user) => {
          const trackedAsinCount = user.projects.reduce((sum, project) => sum + project._count.trackedAsins, 0);
          const effectivePlanCode = user.subscription?.plan.code ?? getLegacyPlanCode(user.plan);
          const effectivePlanName =
            user.subscription?.plan.displayName ?? planByCode.get(effectivePlanCode)?.displayName ?? effectivePlanCode;
          const effectiveStatus = user.subscription?.status ?? "LEGACY";
          const statusPresentation = getBillingStatusPresentation(effectiveStatus);

          return (
            <div
              key={user.id}
              className="grid grid-cols-[minmax(220px,2fr)_100px_120px_120px_120px_140px_220px_180px] gap-4 border-b border-[var(--md-outline-variant)] px-6 py-5 text-sm last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--md-on-surface)]">{user.name || "未命名用户"}</p>
                <p className="mt-1 truncate text-[var(--md-on-surface-variant)]">{user.email}</p>
              </div>
              <div className="text-[var(--md-on-surface)]">{user.role === "ADMIN" ? "管理员" : "成员"}</div>
              <div className="text-[var(--md-on-surface)]">{effectivePlanName}</div>
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPresentation.badgeClassName}`}>
                  {statusPresentation.label}
                </span>
              </div>
              <div className="text-[var(--md-on-surface)]">{user._count.projects}</div>
              <div className="text-[var(--md-on-surface)]">{trackedAsinCount}</div>
              <div>
                <UserSubscriptionForm
                  userId={user.id}
                  initialPlanCode={effectivePlanCode}
                  initialStatus={user.subscription?.status ?? "ACTIVE"}
                  planOptions={planOptions.map((plan) => ({
                    code: plan.code,
                    displayName: plan.displayName
                  }))}
                />
              </div>
              <div className="text-[var(--md-on-surface-variant)]">{formatDateTime(user.createdAt)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
