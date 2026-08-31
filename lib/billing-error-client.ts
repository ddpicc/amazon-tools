export const BILLING_ERROR_CODES = {
  PROJECT_LIMIT_REACHED: "PROJECT_LIMIT_REACHED",
  TRACKED_ASIN_LIMIT_REACHED: "TRACKED_ASIN_LIMIT_REACHED",
  OWN_ASIN_PER_PROJECT_LIMIT_REACHED: "OWN_ASIN_PER_PROJECT_LIMIT_REACHED",
  COMPETITOR_ASIN_PER_PROJECT_LIMIT_REACHED: "COMPETITOR_ASIN_PER_PROJECT_LIMIT_REACHED",
  MANUAL_SYNC_LIMIT_REACHED: "MANUAL_SYNC_LIMIT_REACHED"
} as const;

export type BillingErrorCode = (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];

export function getBillingErrorHint(code?: string | null) {
  switch (code) {
    case BILLING_ERROR_CODES.PROJECT_LIMIT_REACHED:
    case BILLING_ERROR_CODES.TRACKED_ASIN_LIMIT_REACHED:
      return "如需继续使用更多额度，可以前往 Billing 页面升级套餐。";
    case BILLING_ERROR_CODES.OWN_ASIN_PER_PROJECT_LIMIT_REACHED:
    case BILLING_ERROR_CODES.COMPETITOR_ASIN_PER_PROJECT_LIMIT_REACHED:
      return "这是单个项目内的结构限制，减少当前输入数量后即可继续。";
    case BILLING_ERROR_CODES.MANUAL_SYNC_LIMIT_REACHED:
      return "这条规则不区分套餐，需等到下一天才能再次手动刷新。";
    default:
      return null;
  }
}

export function isBillingLimitErrorCode(code?: string | null): code is BillingErrorCode {
  return Boolean(code && Object.values(BILLING_ERROR_CODES).includes(code as BillingErrorCode));
}

export function isUpgradeEligibleBillingErrorCode(code?: string | null) {
  return (
    code === BILLING_ERROR_CODES.PROJECT_LIMIT_REACHED ||
    code === BILLING_ERROR_CODES.TRACKED_ASIN_LIMIT_REACHED
  );
}
