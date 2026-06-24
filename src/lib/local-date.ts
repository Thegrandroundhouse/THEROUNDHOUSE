/** Local calendar dates (YYYY-MM-DD) — never use toISOString() for calendar cells. */

export function formatLocalDateParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatLocalDateFromDate(date: Date): string {
  return formatLocalDateParts(date.getFullYear(), date.getMonth(), date.getDate());
}

export function todayLocalDateString(): string {
  return formatLocalDateFromDate(new Date());
}

export function monthBoundsLocal(year: number, monthIndex: number): { start: string; end: string } {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    start: formatLocalDateParts(year, monthIndex, 1),
    end: formatLocalDateParts(year, monthIndex, lastDay),
  };
}

export function enumerateLocalDates(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return [from];
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const cur = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  if (cur > end) return [from];
  const out: string[] = [];
  while (cur <= end) {
    out.push(formatLocalDateFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
