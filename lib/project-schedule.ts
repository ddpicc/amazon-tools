import { formatClockTime } from "@/lib/shanghai-time";

export const PROJECT_DAILY_POLL_HOUR = 8;
export const PROJECT_DAILY_POLL_MINUTE = 0;

export function isDailyDigestTimeValid(hour: number, minute: number) {
  return hour > PROJECT_DAILY_POLL_HOUR || (hour === PROJECT_DAILY_POLL_HOUR && minute > PROJECT_DAILY_POLL_MINUTE);
}

export function getProjectDailyPollTimeLabel() {
  return `UTC+8 ${formatClockTime(PROJECT_DAILY_POLL_HOUR, PROJECT_DAILY_POLL_MINUTE)}`;
}
