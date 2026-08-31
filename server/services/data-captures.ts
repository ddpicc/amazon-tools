import { DataSourceKind, Prisma } from "@prisma/client";
import { db } from "@/server/db";

export type ProviderSource = "live" | "mock";

export function toDataSourceKind(source: ProviderSource): DataSourceKind {
  return source === "live" ? "LIVE_PROVIDER" : "MOCK";
}

type StartCaptureInput = {
  userId: string;
  projectId: string;
  trackedAsinId: string;
  marketplace: string;
  apiName: string;
  sourceKind: DataSourceKind;
};

export function startDataCapture(input: StartCaptureInput) {
  return db.dataCapture.create({
    data: {
      ...input,
      provider: "SORFTIME",
      normalizerVersion: "sorftime-v1",
      schemaVersion: "2026-08-27"
    }
  });
}

export function completeDataCapture(id: string, rawPayload: Prisma.InputJsonValue | null | undefined, capturedAt: Date) {
  return db.dataCapture.update({
    where: { id },
    data: {
      status: "SUCCESS",
      receivedAt: new Date(),
      capturedAt,
      rawPayload: rawPayload === null || rawPayload === undefined ? Prisma.JsonNull : rawPayload
    }
  });
}

export function failDataCapture(id: string, error: unknown) {
  return db.dataCapture.update({
    where: { id },
    data: {
      status: "FAILED",
      receivedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : "Unknown provider error"
    }
  });
}

export function sourceLabel(sourceKind: DataSourceKind | null | undefined) {
  if (sourceKind === "LIVE_PROVIDER") return "实时 Provider 数据";
  if (sourceKind === "MOCK") return "模拟数据";
  if (sourceKind === "IMPORT") return "导入数据";
  if (sourceKind === "USER_INPUT") return "用户输入";
  if (sourceKind === "DERIVED") return "派生数据";
  return "历史数据（来源未知）";
}
