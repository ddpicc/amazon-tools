import { TrackedAsinStatus } from "@prisma/client";

export const MONITORING_FRESHNESS_HOURS = 30;

export type MonitoringState =
  | "PAUSED"
  | "WAITING_FOR_FIRST_COLLECTION"
  | "FIRST_COLLECTION_FAILED"
  | "DATA_OVERDUE"
  | "MONITORING";

type MonitoringStateInput = {
  status: TrackedAsinStatus | string;
  lastSuccessAt: Date | null;
  consecutiveFailures: number;
};

export function getMonitoringState(
  input: MonitoringStateInput,
  now = new Date()
): MonitoringState {
  if (input.status === TrackedAsinStatus.PAUSED || input.status === "PAUSED") {
    return "PAUSED";
  }

  if (!input.lastSuccessAt) {
    return input.consecutiveFailures > 0
      ? "FIRST_COLLECTION_FAILED"
      : "WAITING_FOR_FIRST_COLLECTION";
  }

  const overdueAt = input.lastSuccessAt.getTime() + MONITORING_FRESHNESS_HOURS * 60 * 60 * 1000;
  return overdueAt < now.getTime() ? "DATA_OVERDUE" : "MONITORING";
}

export function getMonitoringStateLabel(state: MonitoringState) {
  switch (state) {
    case "PAUSED":
      return "已暂停";
    case "WAITING_FOR_FIRST_COLLECTION":
      return "等待首次采集";
    case "FIRST_COLLECTION_FAILED":
      return "首次采集失败";
    case "DATA_OVERDUE":
      return "数据已过期";
    case "MONITORING":
      return "监控中";
  }
}
