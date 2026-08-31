import "server-only";
import { getSorftimeDomain } from "@/server/sorftime/marketplaces";

const DEFAULT_BASE_URL = "https://standardapi.sorftime.com/api";
const SUCCESS_CODES = new Set([0, 1, 200]);

type SorftimeLogLevel = "info" | "error";

type SorftimeRequestOptions<TResponseData, TOutput> = {
  apiName: string;
  marketplace: string;
  body: Record<string, unknown>;
  mockData: TOutput;
  mapData: (data: TResponseData, meta: { marketplace: string; apiName: string; rawPayload: unknown }) => TOutput;
};

type SorftimeEnvelope<T> = {
  Code?: number;
  Message?: string;
  Data?: T;
  RequestLeft?: number;
  RequestConsumed?: number;
  request_left?: number;
  request_consumed?: number;
};

export type SorftimeAdapterResult<T> = {
  data: T;
  apiName: string;
  source: "mock" | "live";
  receivedAt: Date;
  requestConsumed: number;
  requestLeft: number | null;
  rawPayload: unknown;
};

function shouldUseMock() {
  return process.env.SORFTIME_USE_MOCK !== "false" || !getConfig().accountSk;
}

export function getSorftimeSource() {
  return shouldUseMock() ? "mock" : "live";
}

function getConfig() {
  return {
    baseUrl: process.env.SORFTIME_API_BASE_URL || DEFAULT_BASE_URL,
    accountSk: process.env.SORFTIME_ACCOUNT_SK || process.env.SORFTIME_API_KEY || ""
  };
}

function getAuthHeaderValue(accountSk: string) {
  return accountSk.startsWith("BasicAuth ") ? accountSk : `BasicAuth ${accountSk}`;
}

function buildEndpoint(baseUrl: string, apiName: string, marketplace: string) {
  const url = new URL(baseUrl.endsWith("/") ? `${baseUrl}${apiName}` : `${baseUrl}/${apiName}`);
  url.searchParams.set("domain", String(getSorftimeDomain(marketplace)));
  return url.toString();
}

function parseUsage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { requestConsumed: 1, requestLeft: null };
  }

  const data = payload as Record<string, unknown>;
  const requestConsumedRaw = data.RequestConsumed ?? data.request_consumed ?? data.requestConsumed ?? 1;
  const requestLeftRaw = data.RequestLeft ?? data.request_left ?? data.requestLeft ?? null;
  const requestConsumed = Number(requestConsumedRaw);
  const requestLeft = requestLeftRaw === null || requestLeftRaw === undefined ? null : Number(requestLeftRaw);

  return {
    requestConsumed: Number.isFinite(requestConsumed) ? requestConsumed : 1,
    requestLeft: requestLeft !== null && Number.isFinite(requestLeft) ? requestLeft : null
  };
}

function parseEnvelope<T>(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      code: undefined,
      message: null,
      data: payload as T
    };
  }

  const maybeEnvelope = payload as SorftimeEnvelope<T>;
  return {
    code: typeof maybeEnvelope.Code === "number" ? maybeEnvelope.Code : undefined,
    message: typeof maybeEnvelope.Message === "string" ? maybeEnvelope.Message : null,
    data: (maybeEnvelope.Data ?? payload) as T
  };
}

function isSuccessResponse(status: number, code: number | undefined) {
  if (code === undefined) {
    return status >= 200 && status < 300;
  }

  return status >= 200 && status < 300 && SUCCESS_CODES.has(code);
}

function logSorftime(
  level: SorftimeLogLevel,
  message: string,
  payload: Record<string, unknown>
) {
  const logger = level === "error" ? console.error : console.info;
  logger(`[sorftime] ${message}`, payload);
}

export async function requestSorftime<TResponseData, TOutput>({
  apiName,
  marketplace,
  body,
  mockData,
  mapData
}: SorftimeRequestOptions<TResponseData, TOutput>): Promise<SorftimeAdapterResult<TOutput>> {
  if (shouldUseMock()) {
    logSorftime("info", "mock request", {
      apiName,
      marketplace,
      source: "mock",
      body
    });

    return {
      data: mockData,
      apiName,
      source: "mock",
      receivedAt: new Date(),
      requestConsumed: 1,
      requestLeft: null,
      rawPayload: mockData
    };
  }

  const config = getConfig();
  if (!config.accountSk) {
    throw new Error("SORFTIME_ACCOUNT_SK is not configured");
  }

  const endpoint = buildEndpoint(config.baseUrl, apiName, marketplace);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Authorization: getAuthHeaderValue(config.accountSk)
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);
  const usage = parseUsage(payload);
  const envelope = parseEnvelope<TResponseData>(payload);

  if (!isSuccessResponse(response.status, envelope.code)) {
    logSorftime("error", "live request failed", {
      apiName,
      marketplace,
      source: "live",
      body,
      status: response.status,
      code: envelope.code ?? null,
      message: envelope.message,
      requestConsumed: usage.requestConsumed,
      requestLeft: usage.requestLeft,
      payload
    });

    const message = envelope.message || `Sorftime request failed: ${response.status}`;
    const error = new Error(message);
    error.name = "SorftimeApiError";
    Object.assign(error, {
      payload,
      status: response.status,
      code: envelope.code,
      usage
    });
    throw error;
  }

  logSorftime("info", "live request succeeded", {
    apiName,
    marketplace,
    source: "live",
    body,
    status: response.status,
    code: envelope.code ?? null,
    requestConsumed: usage.requestConsumed,
    requestLeft: usage.requestLeft
  });

  return {
    data: mapData(envelope.data, {
      marketplace,
      apiName,
      rawPayload: payload
    }),
    apiName,
    source: "live",
    receivedAt: new Date(),
    requestConsumed: usage.requestConsumed,
    requestLeft: usage.requestLeft,
    rawPayload: payload
  };
}
