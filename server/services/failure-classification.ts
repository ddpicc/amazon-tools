type FailureCategory =
  | "AUTH"
  | "RATE_LIMIT"
  | "CONFIG"
  | "NETWORK"
  | "REMOTE_5XX"
  | "NOT_FOUND"
  | "MANUAL_LIMIT"
  | "SORFTIME_API"
  | "UNKNOWN";

export type FailureClassification = {
  category: FailureCategory;
  label: string;
  detail?: string | null;
};

type ParsedFailureMeta = {
  message: string;
  status: number | null;
  code: number | null;
};

function parseFailureMeta(message: string): ParsedFailureMeta {
  const statusMatch = message.match(/(?:^|\|)\s*status=(\d{3})\b/i);
  const codeMatch = message.match(/(?:^|\|)\s*code=(\d+)\b/i);

  return {
    message,
    status: statusMatch ? Number(statusMatch[1]) : null,
    code: codeMatch ? Number(codeMatch[1]) : null
  };
}

function buildDetail(meta: ParsedFailureMeta) {
  const parts = [] as string[];

  if (meta.status !== null) {
    parts.push(`HTTP ${meta.status}`);
  }

  if (meta.code !== null) {
    parts.push(`Code ${meta.code}`);
  }

  return parts.length ? parts.join(" · ") : null;
}

function classifyByStatusOrCode(meta: ParsedFailureMeta): FailureClassification | null {
  if (meta.status === 401 || meta.status === 403 || meta.code === 100) {
    return { category: "AUTH", label: "权限错误", detail: buildDetail(meta) };
  }

  if (meta.status === 429 || meta.code === 429) {
    return { category: "RATE_LIMIT", label: "限流或配额", detail: buildDetail(meta) };
  }

  if (meta.status === 404) {
    return { category: "NOT_FOUND", label: "对象不存在", detail: buildDetail(meta) };
  }

  if (meta.status !== null && meta.status >= 500) {
    return { category: "REMOTE_5XX", label: "远端服务异常", detail: buildDetail(meta) };
  }

  if (meta.code !== null) {
    if (meta.code >= 500) {
      return { category: "SORFTIME_API", label: "Sorftime 接口错误", detail: buildDetail(meta) };
    }

    if (meta.code >= 400) {
      return { category: "CONFIG", label: "请求参数或配置错误", detail: buildDetail(meta) };
    }
  }

  return null;
}

function pickCategory(message: string): FailureClassification {
  const meta = parseFailureMeta(message);
  const structured = classifyByStatusOrCode(meta);
  if (structured) {
    return structured;
  }

  const text = message.toLowerCase();

  if (
    text.includes("unauthorized") ||
    text.includes("forbidden") ||
    text.includes("401") ||
    text.includes("403") ||
    text.includes("invalid token") ||
    text.includes("account_sk") ||
    text.includes("account-sk")
  ) {
    return { category: "AUTH", label: "权限错误", detail: buildDetail(meta) };
  }

  if (
    text.includes("429") ||
    text.includes("too many requests") ||
    text.includes("rate limit") ||
    text.includes("quota") ||
    text.includes("request limit")
  ) {
    return { category: "RATE_LIMIT", label: "限流或配额", detail: buildDetail(meta) };
  }

  if (
    text.includes("not configured") ||
    text.includes("unsupported marketplace") ||
    text.includes("webhook url") ||
    text.includes("channel is disabled")
  ) {
    return { category: "CONFIG", label: "配置错误", detail: buildDetail(meta) };
  }

  if (
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("timeout") ||
    text.includes("econnreset") ||
    text.includes("enotfound") ||
    text.includes("socket hang up")
  ) {
    return { category: "NETWORK", label: "网络错误", detail: buildDetail(meta) };
  }

  if (
    text.includes("500") ||
    text.includes("502") ||
    text.includes("503") ||
    text.includes("504") ||
    text.includes("bad gateway") ||
    text.includes("service unavailable")
  ) {
    return { category: "REMOTE_5XX", label: "远端服务异常", detail: buildDetail(meta) };
  }

  if (text.includes("not found")) {
    return { category: "NOT_FOUND", label: "对象不存在", detail: buildDetail(meta) };
  }

  if (text.includes("manual sync limit reached")) {
    return { category: "MANUAL_LIMIT", label: "手动额度限制", detail: buildDetail(meta) };
  }

  if (text.includes("sorftime")) {
    return { category: "SORFTIME_API", label: "Sorftime 接口错误", detail: buildDetail(meta) };
  }

  return { category: "UNKNOWN", label: "未知错误", detail: buildDetail(meta) };
}

export function classifyFailure(message?: string | null): FailureClassification {
  if (!message) {
    return { category: "UNKNOWN", label: "未知错误", detail: null };
  }

  return pickCategory(message);
}

export function formatOperationalError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status =
    "status" in error && typeof (error as Error & { status?: unknown }).status === "number"
      ? (error as Error & { status: number }).status
      : null;
  const code =
    "code" in error && typeof (error as Error & { code?: unknown }).code === "number"
      ? (error as Error & { code: number }).code
      : null;

  const parts = [error.message || fallbackMessage];
  if (status !== null) {
    parts.push(`status=${status}`);
  }
  if (code !== null) {
    parts.push(`code=${code}`);
  }

  return parts.join(" | ");
}
