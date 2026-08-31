import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { fetchAsinRequestKeywords } from "@/server/sorftime/product";
import { getSorftimeSource } from "@/server/sorftime/adapter";
import { completeDataCapture, failDataCapture, startDataCapture, toDataSourceKind } from "@/server/services/data-captures";

export async function syncListingKeywords(trackedAsinId: string, capturedAt: Date) {
  const trackedAsin = await db.trackedAsin.findUnique({
    where: { id: trackedAsinId },
    select: { asin: true, marketplace: true, projectId: true, project: { select: { userId: true } } }
  });
  if (!trackedAsin) throw new Error("Tracked ASIN not found");

  const capture = await startDataCapture({
    userId: trackedAsin.project.userId,
    projectId: trackedAsin.projectId,
    trackedAsinId,
    marketplace: trackedAsin.marketplace,
    apiName: "ASINRequestKeyword",
    sourceKind: toDataSourceKind(getSorftimeSource())
  });
  try {
  const result = await fetchAsinRequestKeywords(trackedAsin.asin, trackedAsin.marketplace);
  await completeDataCapture(capture.id, result.rawPayload as Prisma.InputJsonValue, capturedAt);
  const keywords = result.data.slice(0, 20);
  await db.productKeywordSnapshot.createMany({
    data: keywords.map((item) => ({
      trackedAsinId,
      keyword: item.keyword,
      naturalRank: item.naturalRank,
      sponsoredRank: item.sponsoredRank,
      searchVolume: item.searchVolume,
      cpc: item.cpc,
      capturedAt,
      rawPayload: item.rawPayload as Prisma.InputJsonValue,
      captureId: capture.id
    }))
  });
  await db.apiUsageLog.create({
    data: {
      projectId: trackedAsin.projectId,
      trackedAsinId,
      apiName: result.apiName,
      requestConsumed: result.requestConsumed,
      requestLeft: result.requestLeft,
      status: "SUCCESS",
      contextRef: `${trackedAsin.asin}:${result.source}`
    }
  });
  return keywords;
  } catch (error) {
    await failDataCapture(capture.id, error);
    throw error;
  }
}
