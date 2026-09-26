export const DAY_MS = 24 * 60 * 60 * 1000;

/** Khoảng lặp lại ngắt quãng theo sheet: 1 - 2 - 4 - 7 ngày, sau đó giãn dần. */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30];
export const MAX_STAGE = REVIEW_INTERVALS.length;

export function startOfDay(d: Date = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Parse "yyyy-mm-dd" từ input date thành Date theo giờ địa phương. */
export function parseDayKey(s?: string | null) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function nextReviewDate(stage: number, from: Date = new Date()) {
  const idx = Math.min(stage, REVIEW_INTERVALS.length - 1);
  return addDays(startOfDay(from), REVIEW_INTERVALS[idx]);
}
