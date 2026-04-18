/** Today's date YYYY-MM-DD in the user's local timezone (browser) or server local date. */
export function minSelectableEventDateYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isDateBeforeMin(dateStr: string, minYYYYMMDD: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(minYYYYMMDD)) return false;
  return dateStr < minYYYYMMDD;
}
