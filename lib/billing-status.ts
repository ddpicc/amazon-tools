export type BillingStatusPresentation = {
  label: string;
  description: string;
  badgeClassName: string;
};

export function getBillingStatusPresentation(status?: string | null): BillingStatusPresentation {
  switch (status) {
    case "TRIALING":
      return {
        label: "试用中",
        description: "当前处于试用阶段，试用结束后会切换到正式订阅状态。",
        badgeClassName: "bg-sky-500/15 text-sky-300 border-sky-400/25"
      };
    case "ACTIVE":
      return {
        label: "已生效",
        description: "当前套餐权益正常生效，可按当前额度使用。",
        badgeClassName: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25"
      };
    case "PAST_DUE":
      return {
        label: "待处理",
        description: "订阅状态存在待处理问题，建议尽快检查并更新。",
        badgeClassName: "bg-amber-500/15 text-amber-300 border-amber-400/25"
      };
    case "CANCELED":
      return {
        label: "已取消",
        description: "当前订阅已取消，后续可能需要重新开通或切换套餐。",
        badgeClassName: "bg-rose-500/15 text-rose-300 border-rose-400/25"
      };
    case "SCHEDULED_DOWNGRADE":
      return {
        label: "待降级",
        description: "当前套餐仍然有效，但已安排在后续周期切换到更低套餐。",
        badgeClassName: "bg-violet-500/15 text-violet-300 border-violet-400/25"
      };
    case "LEGACY":
      return {
        label: "旧版映射",
        description: "当前仍按旧版 plan 字段映射套餐，尚未建立正式订阅记录。",
        badgeClassName: "bg-zinc-500/15 text-zinc-300 border-zinc-400/25"
      };
    default:
      return {
        label: status || "未知状态",
        description: "当前状态暂未识别，请以后台配置为准。",
        badgeClassName: "bg-zinc-500/15 text-zinc-300 border-zinc-400/25"
      };
  }
}
