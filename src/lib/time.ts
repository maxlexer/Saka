const OFFSET_MS = 7 * 60 * 60 * 1000; // Cambodia is UTC+7 all year, with no daylight saving.

export function phnomPenhStart(unit: "day" | "month", now: Date) {
  const local = new Date(now.getTime() + OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), unit === "day" ? local.getUTCDate() : 1) - OFFSET_MS);
}

export function phnomPenhTime(iso: string | null) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(iso ? new Date(iso) : new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
