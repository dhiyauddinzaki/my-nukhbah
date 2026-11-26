import { APP_CONFIG } from "@/config/constants";

const DAY_MS = 86400000;

export function getWeekStart(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export function getWeekEnd(weekStart: Date) {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  return end;
}

export function getIsoWeekValue(weekStart: Date) {
  const thursday = new Date(weekStart);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const januaryFourth = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstThursday = getWeekStart(januaryFourth);
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function parseIsoWeek(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = getWeekStart(januaryFourth);
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);
  return getIsoWeekValue(monday) === value ? monday : null;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function countDaysInPeriod(start: Date, end: Date, periodStart: Date, periodEnd: Date) {
  const effectiveStart = Math.max(start.getTime(), periodStart.getTime());
  const effectiveEnd = Math.min(end.getTime(), periodEnd.getTime());
  return effectiveStart > effectiveEnd ? 0 : Math.floor((effectiveEnd - effectiveStart) / DAY_MS) + 1;
}

export function getTahfizhIntensifTargetPages(weekStart: Date, periodStart: Date, periodEnd: Date) {
  return APP_CONFIG.defaultTahfizhIntensifTarget
    * countDaysInPeriod(weekStart, getWeekEnd(weekStart), periodStart, periodEnd);
}
