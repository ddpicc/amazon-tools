export function publicText(value: string) {
  return value
    .replace(/\bSORFTIME\b/gi, "数据服务")
    .replace(/\bREVEYES\b/gi, "评论数据服务")
    .replace(/\bPROVIDER\b/gi, "数据服务")
    .replace(/ASINSubscriptionCollection/gi, "商品数据服务")
    .replace(/ASINRequestKeyword/gi, "关键词数据服务")
    .replace(/ReveyesReviewsFetch/gi, "评论数据服务");
}
