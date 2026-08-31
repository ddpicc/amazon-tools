import {
  formatCompetitorAsinPerProjectLimit,
  formatManualSyncLimitReached,
  formatOwnAsinPerProjectLimit,
  formatProjectLimitReached,
  formatTrackedAsinLimitReached
} from "@/server/services/billing/messages";

export const BILLING_ERROR_CODES = {
  PROJECT_LIMIT_REACHED: "PROJECT_LIMIT_REACHED",
  TRACKED_ASIN_LIMIT_REACHED: "TRACKED_ASIN_LIMIT_REACHED",
  PROJECT_ASIN_LIMIT_REACHED: "PROJECT_ASIN_LIMIT_REACHED",
  OWN_ASIN_PER_PROJECT_LIMIT_REACHED: "OWN_ASIN_PER_PROJECT_LIMIT_REACHED",
  COMPETITOR_ASIN_PER_PROJECT_LIMIT_REACHED: "COMPETITOR_ASIN_PER_PROJECT_LIMIT_REACHED",
  MANUAL_SYNC_LIMIT_REACHED: "MANUAL_SYNC_LIMIT_REACHED"
} as const;

export type BillingErrorCode = (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];

export class BillingLimitError extends Error {
  code: BillingErrorCode;

  constructor(code: BillingErrorCode, message: string) {
    super(message);
    this.name = "BillingLimitError";
    this.code = code;
  }
}

export function isBillingLimitError(error: unknown): error is BillingLimitError {
  return error instanceof BillingLimitError;
}

export function createProjectLimitError(limit: number) {
  return new BillingLimitError(
    BILLING_ERROR_CODES.PROJECT_LIMIT_REACHED,
    formatProjectLimitReached(limit)
  );
}

export function createTrackedAsinLimitError(limit: number, nextCount?: number) {
  return new BillingLimitError(
    BILLING_ERROR_CODES.TRACKED_ASIN_LIMIT_REACHED,
    formatTrackedAsinLimitReached(limit, nextCount)
  );
}

export function createProjectAsinLimitError(limit: number) {
  return new BillingLimitError(
    BILLING_ERROR_CODES.PROJECT_ASIN_LIMIT_REACHED,
    `单个项目最多可添加 ${limit} 个 ASIN（自有与竞品合计），请减少后再继续。`
  );
}

export function createOwnAsinPerProjectLimitError(limit: number) {
  return new BillingLimitError(
    BILLING_ERROR_CODES.OWN_ASIN_PER_PROJECT_LIMIT_REACHED,
    formatOwnAsinPerProjectLimit(limit)
  );
}

export function createCompetitorAsinPerProjectLimitError(limit: number) {
  return new BillingLimitError(
    BILLING_ERROR_CODES.COMPETITOR_ASIN_PER_PROJECT_LIMIT_REACHED,
    formatCompetitorAsinPerProjectLimit(limit)
  );
}

export function createManualSyncLimitError(limit: number) {
  return new BillingLimitError(
    BILLING_ERROR_CODES.MANUAL_SYNC_LIMIT_REACHED,
    formatManualSyncLimitReached(limit)
  );
}
