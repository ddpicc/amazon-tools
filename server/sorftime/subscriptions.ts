import { Prisma } from "@prisma/client";
import { requestSorftime, type SorftimeAdapterResult } from "@/server/sorftime/adapter";
import {
  mapSorftimeProductObjectToSnapshot,
  type SorftimeProductSnapshot
} from "@/server/sorftime/client";

const MAX_ASINS_PER_BATCH = 100;
const SUBSCRIPTION_INTERVAL = 1;

type SorftimeTaskResponse = {
  TaskId?: string;
  taskId?: string;
  Data?: string;
};

type SorftimeProductObject = {
  ASIN?: string;
  Asin?: string;
  Title?: string;
  Photo?: unknown;
  EBCPhoto?: unknown;
  StoreName?: string;
  AsinSalesCount?: number | null;
  ParentAsin?: string | null;
  Price?: number | null;
  ListPrice?: number | null;
  ListingSaleCount?: number | null;
  ListingSaleCountOfDaily?: string | null;
  Coupon?: number | null;
  SalesPrice?: number | null;
  Brand?: string;
  Description?: string;
  BuyboxSeller?: string;
  BuyboxSellerId?: string;
  IsFBA?: boolean;
  ShipCost?: number | null;
  OnlineDate?: string;
  OnlineDays?: number | null;
  RatingsCount?: number | null;
  ProductType?: string;
  Category?: unknown;
  Rank?: number | null;
  Ratings?: number | null;
  VariationASINCount?: number | null;
  SellerCount?: number | null;
  HasVideo?: boolean;
  APlus?: boolean;
  HasBrandStore?: boolean;
  Size?: unknown;
  Weight?: number | null;
  ExtraSavings?: unknown;
  Property?: unknown;
};

type SorftimeAsinSubscriptionQueryItem = {
  TaskId?: string;
  taskId?: string;
  ASIN?: string;
  Status?: string | number;
  status?: string | number;
};

type SorftimeAsinSubscriptionQueryValue = SorftimeAsinSubscriptionQueryItem | string;

export type SorftimeSubscriptionTask = {
  subscriptionRef: string;
  rawPayload: Prisma.InputJsonValue;
};

export type SorftimeAsinSubscriptionQueryRecord = {
  taskId: string;
  asin: string;
  status: string | null;
  rawPayload: Prisma.InputJsonValue;
};

export type SorftimeSubscriptionTaskResult = SorftimeAdapterResult<SorftimeSubscriptionTask>;
export type SorftimeProductSubscriptionResult = SorftimeAdapterResult<SorftimeProductSnapshot>;
export type SorftimeAsinSubscriptionQueryResult = SorftimeAdapterResult<SorftimeAsinSubscriptionQueryRecord[]>;
export type SorftimeBatchSubscriptionAction = "subscribe" | "unsubscribe";
export type SorftimeBatchSubscriptionResult = {
  apiName: "ASINSubscription";
  action: SorftimeBatchSubscriptionAction;
  batchCount: number;
  asins: string[];
  requestConsumed: number;
  requestLeft: number | null;
  rawPayloads: Prisma.InputJsonValue[];
};

function createMockTaskId(prefix: string, parts: string[]) {
  const joined = parts.join("-").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return `${prefix}-${joined || "task"}`;
}

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.Data)) {
      return record.Data as T[];
    }
    if (Array.isArray(record.Items)) {
      return record.Items as T[];
    }
    if (Array.isArray(record.List)) {
      return record.List as T[];
    }
  }

  return [];
}

function chunkAsins(asins: string[]) {
  const chunks = [] as string[][];

  for (let index = 0; index < asins.length; index += MAX_ASINS_PER_BATCH) {
    chunks.push(asins.slice(index, index + MAX_ASINS_PER_BATCH));
  }

  return chunks;
}

function buildAsinsInstruction(
  asins: string[],
  action: SorftimeBatchSubscriptionAction
) {
  const prefix = action === "subscribe" ? "+" : "-";
  return asins.map((asin) => `${prefix},${asin},${SUBSCRIPTION_INTERVAL}`).join("|");
}

function mapAsinSubscriptionQueryRecord(record: SorftimeAsinSubscriptionQueryItem): SorftimeAsinSubscriptionQueryRecord {
  const taskId = record.TaskId || record.taskId || "";
  return {
    taskId,
    asin: record.ASIN || "",
    status: record.Status !== undefined ? String(record.Status) : record.status !== undefined ? String(record.status) : null,
    rawPayload: record as Prisma.InputJsonValue
  };
}

function mapAsinSubscriptionQueryValue(
  record: SorftimeAsinSubscriptionQueryValue,
  marketplace: string
): SorftimeAsinSubscriptionQueryRecord | null {
  if (typeof record === "string") {
    const asin = record.trim().toUpperCase();
    if (!asin) {
      return null;
    }

    return {
      taskId: `${marketplace}:${asin}`,
      asin,
      status: "ACTIVE",
      rawPayload: {
        ASIN: asin,
        Status: "ACTIVE"
      }
    };
  }

  const mapped = mapAsinSubscriptionQueryRecord(record);
  if (!mapped.asin) {
    return null;
  }

  return {
    ...mapped,
    asin: mapped.asin.trim().toUpperCase()
  };
}

export async function subscribeAsinMonitoring(
  asin: string,
  marketplace: string
): Promise<SorftimeSubscriptionTaskResult> {
  const fallbackTaskId = createMockTaskId("asin", [marketplace, asin]);

  return requestSorftime<SorftimeTaskResponse, SorftimeSubscriptionTask>({
    apiName: "ASINSubscription",
    marketplace,
    body: {
      Asins: buildAsinsInstruction([asin], "subscribe")
    },
    mockData: {
      subscriptionRef: `${marketplace}:${asin}`,
      rawPayload: {
        source: "mock",
        ASIN: asin,
        marketplace,
        taskId: fallbackTaskId
      }
    },
    mapData(data, meta) {
      void data;
      return {
        subscriptionRef: `${marketplace}:${asin}`,
        rawPayload: meta.rawPayload as Prisma.InputJsonValue
      };
    }
  });
}

export async function changeAsinMonitoringSubscriptions(
  asins: string[],
  marketplace: string,
  action: SorftimeBatchSubscriptionAction
): Promise<SorftimeBatchSubscriptionResult> {
  const normalizedAsins = Array.from(
    new Set(asins.map((asin) => asin.trim().toUpperCase()).filter(Boolean))
  );

  if (!normalizedAsins.length) {
    return {
      apiName: "ASINSubscription",
      action,
      batchCount: 0,
      asins: [],
      requestConsumed: 0,
      requestLeft: null,
      rawPayloads: []
    };
  }

  const batches = chunkAsins(normalizedAsins);
  const rawPayloads = [] as Prisma.InputJsonValue[];
  let requestConsumed = 0;
  let requestLeft = null as number | null;

  for (const batch of batches) {
    const fallbackTaskId = createMockTaskId(action === "subscribe" ? "asin-sub" : "asin-unsub", [marketplace, ...batch]);
    const result = await requestSorftime<SorftimeTaskResponse, SorftimeSubscriptionTask>({
      apiName: "ASINSubscription",
      marketplace,
      body: {
        Asins: buildAsinsInstruction(batch, action)
      },
      mockData: {
        subscriptionRef: `${marketplace}:${batch[0]}`,
        rawPayload: {
          source: "mock",
          action,
          marketplace,
          asins: batch,
          taskId: fallbackTaskId
        }
      },
      mapData(data, meta) {
        void data;
        return {
          subscriptionRef: `${marketplace}:${batch[0]}`,
          rawPayload: meta.rawPayload as Prisma.InputJsonValue
        };
      }
    });

    requestConsumed += result.requestConsumed;
    requestLeft = result.requestLeft;
    rawPayloads.push(result.rawPayload as Prisma.InputJsonValue);
  }

  return {
    apiName: "ASINSubscription",
    action,
    batchCount: batches.length,
    asins: normalizedAsins,
    requestConsumed,
    requestLeft,
    rawPayloads
  };
}

export async function queryAsinMonitoringSubscriptions(
  marketplace: string
): Promise<SorftimeAsinSubscriptionQueryResult> {
  return requestSorftime<unknown, SorftimeAsinSubscriptionQueryRecord[]>({
    apiName: "ASINSubscriptionQuery",
    marketplace,
    body: {},
    mockData: [
      {
        taskId: createMockTaskId("asin-query", [marketplace, "sample"]),
        asin: "MOCKASIN000",
        status: "ACTIVE",
        rawPayload: {
          source: "mock",
          marketplace,
          ASIN: "MOCKASIN000",
          Status: "ACTIVE"
        }
      }
    ],
    mapData(data, meta) {
      return extractArray<SorftimeAsinSubscriptionQueryValue>(data)
        .map((item) => mapAsinSubscriptionQueryValue(item, meta.marketplace))
        .filter((item): item is SorftimeAsinSubscriptionQueryRecord => Boolean(item?.taskId && item.asin));
    }
  });
}

export async function fetchAsinSubscriptionCollection(
  asin: string,
  marketplace: string
): Promise<SorftimeProductSubscriptionResult> {
  return requestSorftime<unknown, SorftimeProductSnapshot>({
    apiName: "ASINSubscriptionCollection",
    marketplace,
    body: {
      Asins: asin
    },
    mockData: mapSorftimeProductObjectToSnapshot(
      {
        ASIN: asin,
        Title: `Mock Product ${asin}`,
        Brand: `Brand ${asin.slice(-3)}`,
        ProductType: "Home & Kitchen",
        Price: 2999,
        ListPrice: 3999,
        Ratings: 4.4,
        RatingsCount: 320,
        Rank: 1820,
        VariationASINCount: 4,
        SellerCount: 1
      },
      marketplace,
      asin,
      {
        source: "mock",
        asin
      }
    ),
    mapData(data, meta) {
      const items = extractArray<SorftimeProductObject>(data);
      const product = items[0] ?? ((data && typeof data === "object") ? (data as SorftimeProductObject) : {});
      return mapSorftimeProductObjectToSnapshot(product, meta.marketplace, asin, meta.rawPayload);
    }
  });
}
