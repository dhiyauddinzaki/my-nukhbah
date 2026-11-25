export const dormSessions = [
  { value: "TAHAJJUD", label: "Tahajjud", hasPhoto: false },
  { value: "PAGI", label: "Absen Pagi", hasPhoto: true },
  { value: "SEKOLAH", label: "Sekolah", hasPhoto: false },
  { value: "SORE", label: "Absen Sore", hasPhoto: true },
  { value: "KAJIAN_ADAB", label: "Kajian Adab", hasPhoto: false },
  { value: "MALAM", label: "Absen Malam", hasPhoto: true },
] as const;

export type DormSessionValue = (typeof dormSessions)[number]["value"];

export const prayers = [
  { value: "SUBUH", label: "Subuh" },
  { value: "DZUHUR", label: "Dzuhur" },
  { value: "ASHAR", label: "Ashar" },
  { value: "MAGHRIB", label: "Maghrib" },
  { value: "ISYA", label: "Isya" },
] as const;

export type PrayerNameValue = (typeof prayers)[number]["value"];

export const prayerStatuses = [
  { value: "MUWAFIQ", label: "Muwafiq" },
  { value: "JT", label: "JT" },
  { value: "MF", label: "MF" },
  { value: "ALPHA", label: "Alpha" },
  { value: "IZIN", label: "Izin" },
  { value: "SAKIT", label: "Sakit" },
] as const;

export type PrayerStatusValue = (typeof prayerStatuses)[number]["value"];

export const photoSessions = dormSessions.filter((session) => session.hasPhoto);
