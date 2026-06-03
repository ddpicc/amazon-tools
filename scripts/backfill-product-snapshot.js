const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

function getCurrencyDivisor(marketplace) {
  return String(marketplace || "").trim().toUpperCase() === "JP" ? 1 : 100;
}

function toDecimalString(value, marketplace) {
  const normalizedValue = Number(value ?? 0);
  if (!Number.isFinite(normalizedValue)) {
    return "0";
  }

  return (normalizedValue / getCurrencyDivisor(marketplace)).toFixed(2);
}

function normalizeCategory(category, fallback) {
  if (Array.isArray(category) && typeof category[0] === "string") {
    return category[0];
  }

  return fallback || "";
}

function normalizeCategoryNodeId(category) {
  if (Array.isArray(category) && typeof category[1] === "string") {
    return category[1];
  }

  return null;
}

function normalizeImageUrl(photo) {
  if (Array.isArray(photo) && typeof photo[0] === "string") {
    return photo[0];
  }

  return "";
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string");
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeJsonString(value) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapSnapshotFields(data, marketplace) {
  const actualPrice = data.SalesPrice ?? data.ListPrice ?? data.Price;
  const originalListPrice = data.Price ?? data.ListPrice ?? data.SalesPrice;

  return {
    storeName: data.StoreName || "",
    asinSalesCount: data.AsinSalesCount ?? null,
    parentAsin: data.ParentAsin ?? null,
    price: toDecimalString(actualPrice, marketplace),
    listPrice: toDecimalString(originalListPrice, marketplace),
    listingSaleCount: data.ListingSaleCount ?? null,
    listingSaleCountOfDaily: data.ListingSaleCountOfDaily ?? null,
    coupon: data.Coupon ?? null,
    rating: String(data.Ratings ?? 0),
    reviewCount: data.RatingsCount ?? 0,
    bsr: data.Rank ?? 0,
    bsrCategory: data.BsrCategory ?? null,
    variantCount: data.VariationASINCount ?? 0,
    stockStatus: (data.SellerCount ?? 0) > 0 ? "in_stock" : "unknown",
    title: data.Title || "",
    photoUrls: normalizeStringArray(data.Photo),
    ebcPhotoUrls: normalizeStringArray(data.EBCPhoto),
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
    hasVideo: data.HasVideo ?? null,
    aPlus: data.APlus ?? null,
    hasBrandStore: data.HasBrandStore ?? null,
    packageSize: data.Size ?? null,
    weightGrams: data.Weight ?? null,
    extraSavings: data.ExtraSavings ?? null,
    properties: normalizeJsonString(data.Property)
  };
}

async function main() {
  const target = process.argv[2] || "B07FPQZG6V";

  const snapshot = await db.productSnapshot.findFirst({
    where: target.startsWith("cmp")
      ? { id: target }
      : { trackedAsin: { asin: target } },
    orderBy: { capturedAt: "desc" },
    select: {
      id: true,
      trackedAsinId: true,
      capturedAt: true,
      rawPayload: true,
      trackedAsin: {
        select: {
          id: true,
          asin: true,
          marketplace: true
        }
      }
    }
  });

  if (!snapshot) {
    throw new Error(`Snapshot not found for target: ${target}`);
  }

  const payload = snapshot.rawPayload;
  const data = payload && Array.isArray(payload.Data) ? payload.Data[0] : null;

  if (!data || typeof data !== "object") {
    throw new Error(`Snapshot ${snapshot.id} does not contain rawPayload.Data[0]`);
  }

  const fields = mapSnapshotFields(data, snapshot.trackedAsin.marketplace);

  const updatedSnapshot = await db.productSnapshot.update({
    where: { id: snapshot.id },
    data: fields,
    select: {
      id: true,
      title: true,
      brand: true,
      price: true,
      rating: true,
      reviewCount: true,
      bsr: true,
      category: true,
      stockStatus: true
    }
  });

  const updatedTrackedAsin = await db.trackedAsin.update({
    where: { id: snapshot.trackedAsinId },
    data: {
      title: fields.title,
      brand: fields.brand,
      category: fields.category,
      imageUrl: normalizeImageUrl(data.Photo),
      lastSyncedAt: snapshot.capturedAt,
      lastSuccessAt: snapshot.capturedAt,
      consecutiveFailures: 0
    },
    select: {
      id: true,
      asin: true,
      title: true,
      brand: true,
      category: true,
      imageUrl: true
    }
  });

  console.log(JSON.stringify({
    ok: true,
    snapshot: updatedSnapshot,
    trackedAsin: updatedTrackedAsin
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
