// All progress dates are the user's LOCAL calendar day as "YYYY-MM-DD",
// so "solved today" matches what the user sees on their clock.
const pad = (n) => String(n).padStart(2, "0");

export function toDayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDay(dayKey, days) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return toDayKey(new Date(y, m - 1, d + days));
}
