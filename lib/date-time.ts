const shanghaiDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return shanghaiDateTimeFormatter.format(new Date(value));
}
