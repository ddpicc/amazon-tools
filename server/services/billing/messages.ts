export function formatProjectLimitReached(limit: number) {
  return `你当前套餐最多可创建 ${limit} 个项目，当前额度已用完。如需继续创建项目，请升级套餐。`;
}

export function formatTrackedAsinLimitReached(limit: number, nextCount?: number) {
  if (typeof nextCount === "number") {
    return `当前操作会让活跃 ASIN 达到 ${nextCount} 个，已超过套餐上限 ${limit} 个。请先删除部分 ASIN，或升级套餐后再继续。`;
  }

  return `你当前套餐最多可使用 ${limit} 个活跃 ASIN，当前操作会超出额度。请先删除部分 ASIN，或升级套餐后再继续。`;
}

export function formatProjectAsinLimitReached(limit: number) {
  return `单个项目最多可添加 ${limit} 个 ASIN（自有与竞品合计），请减少后再继续。`;
}

export function formatOwnAsinPerProjectLimit(limit: number) {
  return `单个项目最多可添加 ${limit} 个 Own ASIN，请减少后再继续。`;
}

export function formatCompetitorAsinPerProjectLimit(limit: number) {
  return `单个项目最多可添加 ${limit} 个 Competitor ASIN，请减少后再继续。`;
}

export function formatManualSyncLimitReached(limit: number) {
  return `同一个 ASIN 每天最多手动刷新 ${limit} 次，请明天再试。`;
}
