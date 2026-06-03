const SHANGHAI_OFFSET_MINUTES = 8 * 60;

const shanghaiPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function getShanghaiParts(value: Date) {
  const parts = shanghaiPartsFormatter.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second")
  };
}

export function getShanghaiDateKey(value: Date) {
  const parts = getShanghaiParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getShanghaiStartOfDay(value: Date) {
  const parts = getShanghaiParts(value);
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0) - SHANGHAI_OFFSET_MINUTES * 60 * 1000
  );
}

export function getShanghaiEndOfDay(value: Date) {
  return new Date(getShanghaiStartOfDay(value).getTime() + 24 * 60 * 60 * 1000);
}

export function isAfterShanghaiTime(value: Date, hour: number, minute: number) {
  const parts = getShanghaiParts(value);
  return parts.hour > hour || (parts.hour === hour && parts.minute >= minute);
}

export function formatShanghaiDate(value: Date) {
  const parts = getShanghaiParts(value);
  return `${parts.year}/${parts.month}/${parts.day}`;
}

export function formatClockTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
