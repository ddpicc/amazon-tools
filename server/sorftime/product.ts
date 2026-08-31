import { Prisma } from "@prisma/client";
import { requestSorftime, type SorftimeAdapterResult } from "@/server/sorftime/adapter";
import {
  mapSorftimeProductObjectToSnapshot,
  type SorftimeProductObject,
  type SorftimeProductSnapshot
} from "@/server/sorftime/client";

type KeywordItem = Record<string, unknown>;

export type ListingKeyword = {
  keyword: string;
  naturalRank: number | null;
  sponsoredRank: number | null;
  searchVolume: number | null;
  cpc: number | null;
  rawPayload: Prisma.InputJsonValue;
};

function asArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Array.isArray(record.Data) ? record.Data : Array.isArray(record.Items) ? record.Items : [];
  }
  return [];
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function nestedKeyword(item: KeywordItem) {
  const value = item.Keyword;
  return value && typeof value === "object" && !Array.isArray(value) ? value as KeywordItem : item;
}

function searchPositionRank(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/第\d+页，第(\d+)\//);
  return match ? Number(match[1]) : null;
}

function mapKeyword(item: KeywordItem): ListingKeyword | null {
  const details = nestedKeyword(item);
  const keyword = String(details.Keyword ?? details.keyword ?? details.Word ?? "").trim();
  if (!keyword) return null;
  return {
    keyword,
    naturalRank: numberOrNull(item.Rank ?? item.NaturalRank ?? item.SearchRank) ?? searchPositionRank(item.SearchPosition),
    sponsoredRank: numberOrNull(item.SponsoredRank ?? item.AdRank ?? item.PPCPosition ?? item.AdPosition),
    searchVolume: numberOrNull(details.SearchVolume ?? item.SearchVolume ?? item.Volume ?? item.Searches),
    cpc: numberOrNull(details.CPC ?? details.Cpc ?? item.CPC ?? item.Cpc),
    rawPayload: item as Prisma.InputJsonValue
  };
}

export async function fetchProductRequest(asin: string, marketplace: string): Promise<SorftimeAdapterResult<SorftimeProductSnapshot>> {
  return requestSorftime<unknown, SorftimeProductSnapshot>({
    apiName: "ProductRequest",
    marketplace,
    body: { ASIN: asin, Trend: 1, QueryTrendStartDt: "", QueryTrendEndDt: "" },
    mockData: mapSorftimeProductObjectToSnapshot({ ASIN: asin, Title: `Mock Product ${asin}`, Price: 2999, Ratings: 4.4, RatingsCount: 320, Rank: 1820, VariationASINCount: 4, SellerCount: 1 }, marketplace, asin, { source: "mock", asin }),
    mapData(data, meta) {
      const product = (asArray(data)[0] ?? data) as SorftimeProductObject;
      if (!product || typeof product !== "object" || !Object.keys(product).length) {
        throw new Error(`ProductRequest returned no Listing data for ${asin}`);
      }
      return mapSorftimeProductObjectToSnapshot(product, meta.marketplace, asin, meta.rawPayload);
    }
  });
}

export async function fetchAsinRequestKeywords(asin: string, marketplace: string): Promise<SorftimeAdapterResult<ListingKeyword[]>> {
  return requestSorftime<unknown, ListingKeyword[]>({
    apiName: "ASINRequestKeyword",
    marketplace,
    body: { ASIN: asin, PageIndex: 1, PageSize: 20 },
    mockData: [{ keyword: "mock keyword", naturalRank: 12, sponsoredRank: null, searchVolume: 12000, cpc: 0.82, rawPayload: { Keyword: "mock keyword", Rank: 12 } }],
    mapData(data) {
      return asArray(data).map((item) => mapKeyword(item as KeywordItem)).filter((item): item is ListingKeyword => Boolean(item));
    }
  });
}
