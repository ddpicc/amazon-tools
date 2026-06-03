import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getCurrencyDivisor } from "@/server/sorftime/marketplaces";

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
  BsrCategory?: unknown;
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

export type SorftimeProductSnapshot = {
  asin: string;
  title: string;
  storeName: string;
  asinSalesCount: number | null;
  parentAsin: string | null;
  brand: string;
  description: string;
  buyboxSeller: string;
  buyboxSellerId: string;
  isFBA: boolean | null;
  shipCost: number | null;
  onlineDate: Date | null;
  onlineDays: number | null;
  category: string;
  categoryNodeId: string | null;
  imageUrl: string;
  photoUrls: Prisma.InputJsonValue;
  ebcPhotoUrls: Prisma.InputJsonValue;
  price: Decimal;
  listPrice: Decimal;
  listingSaleCount: number | null;
  listingSaleCountOfDaily: Prisma.InputJsonValue | null;
  coupon: number | null;
  rating: Decimal;
  reviewCount: number;
  bsr: number;
  bsrCategory: Prisma.InputJsonValue | null;
  sellerCount: number | null;
  variantCount: number;
  stockStatus: string;
  hasVideo: boolean | null;
  aPlus: boolean | null;
  hasBrandStore: boolean | null;
  packageSize: Prisma.InputJsonValue | null;
  weightGrams: number | null;
  extraSavings: Prisma.InputJsonValue | null;
  properties: Prisma.InputJsonValue | null;
  capturedAt: Date;
  rawPayload: Prisma.InputJsonValue;
};

function toDecimalAmount(value: number | null | undefined, marketplace: string) {
  const divisor = getCurrencyDivisor(marketplace);
  const normalizedValue = value ?? 0;
  return new Decimal(normalizedValue).div(divisor);
}

function normalizeCategory(category: SorftimeProductObject["Category"], fallback: string | undefined) {
  if (Array.isArray(category) && typeof category[0] === "string") {
    return category[0];
  }

  return fallback ?? "";
}

function normalizeImageUrl(photo: SorftimeProductObject["Photo"]) {
  if (Array.isArray(photo) && typeof photo[0] === "string") {
    return photo[0];
  }

  return "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCategoryNodeId(category: SorftimeProductObject["Category"]) {
  if (Array.isArray(category) && typeof category[1] === "string") {
    return category[1];
  }

  return null;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function mapSorftimeProductObjectToSnapshot(
  data: SorftimeProductObject,
  marketplace: string,
  asinFallback: string,
  rawPayload: unknown
): SorftimeProductSnapshot {
  const actualPrice = data.SalesPrice ?? data.ListPrice ?? data.Price;
  const originalListPrice = data.Price ?? data.ListPrice ?? data.SalesPrice;

  return {
    asin: data.ASIN || data.Asin || asinFallback,
    title: data.Title || "",
    storeName: data.StoreName || "",
    asinSalesCount: data.AsinSalesCount ?? null,
    parentAsin: data.ParentAsin ?? null,
    brand: data.Brand || "",
    description: data.Description || "",
    buyboxSeller: data.BuyboxSeller || "",
    buyboxSellerId: data.BuyboxSellerId || "",
    isFBA: data.IsFBA ?? null,
    shipCost: data.ShipCost ?? null,
    onlineDate: normalizeDate(data.OnlineDate),
    onlineDays: data.OnlineDays ?? null,
    category: normalizeCategory(data.Category, data.ProductType),
    categoryNodeId: normalizeCategoryNodeId(data.Category),
    imageUrl: normalizeImageUrl(data.Photo),
    photoUrls: normalizeStringArray(data.Photo) as Prisma.InputJsonValue,
    ebcPhotoUrls: normalizeStringArray(data.EBCPhoto) as Prisma.InputJsonValue,
    price: toDecimalAmount(actualPrice, marketplace),
    listPrice: toDecimalAmount(originalListPrice, marketplace),
    listingSaleCount: data.ListingSaleCount ?? null,
    listingSaleCountOfDaily:
      data.ListingSaleCountOfDaily !== null && data.ListingSaleCountOfDaily !== undefined
        ? (data.ListingSaleCountOfDaily as Prisma.InputJsonValue)
        : null,
    coupon: data.Coupon ?? null,
    rating: new Decimal(data.Ratings ?? 0),
    reviewCount: data.RatingsCount ?? 0,
    bsr: data.Rank ?? 0,
    bsrCategory: data.BsrCategory ? (data.BsrCategory as Prisma.InputJsonValue) : null,
    sellerCount: data.SellerCount ?? null,
    variantCount: data.VariationASINCount ?? 0,
    stockStatus: (data.SellerCount ?? 0) > 0 ? "in_stock" : "unknown",
    hasVideo: data.HasVideo ?? null,
    aPlus: data.APlus ?? null,
    hasBrandStore: data.HasBrandStore ?? null,
    packageSize: data.Size ? (data.Size as Prisma.InputJsonValue) : null,
    weightGrams: data.Weight ?? null,
    extraSavings: data.ExtraSavings ? (data.ExtraSavings as Prisma.InputJsonValue) : null,
    properties: data.Property ? (data.Property as Prisma.InputJsonValue) : null,
    capturedAt: new Date(),
    rawPayload: rawPayload as Prisma.InputJsonValue
  };
}
