/** Calendar “today” in Europe/London — same as create-booking validation. */
export function todayLondonYYYYMMDD(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

/** True when event_date (YYYY-MM-DD) is strictly after today in London. */
export function isEventDateInFutureLondon(eventDateYMD: string | null | undefined): boolean {
  const d = String(eventDateYMD ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d > todayLondonYYYYMMDD();
}

export const BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE =
  "You can’t mark a booking as **Completed** while the event is still in the future (event date must be today or earlier). If the booking won’t go ahead, set it to **Cancelled**. Otherwise keep **Confirmed** (or **Pending**) until after the event.";
