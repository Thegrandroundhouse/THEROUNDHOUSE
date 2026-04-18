/** Shared filters for upcoming export APIs (future event dates, optional status). */
export type UpcomingExportBody = {
  date_mode?: "from_today" | "year" | "range";
  year?: string;
  event_date_from?: string;
  event_date_to?: string;
  /** Empty = pending + confirmed (default list). Else single status. */
  status?: string;
};

export function upcomingExportBounds(body: UpcomingExportBody): {
  eventFrom: string;
  eventTo: string | null;
  statusIn: string[];
} {
  const today = new Date().toISOString().slice(0, 10);
  const mode = body.date_mode || "from_today";
  let eventFrom = today;
  let eventTo: string | null = null;

  if (mode === "year" && body.year && /^\d{4}$/.test(body.year)) {
    const y = body.year;
    eventFrom = `${y}-01-01`;
    eventTo = `${y}-12-31`;
    const ty = String(new Date().getFullYear());
    if (y === ty && today > eventFrom) eventFrom = today;
  } else if (
    mode === "range" &&
    body.event_date_from &&
    body.event_date_to &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.event_date_from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.event_date_to)
  ) {
    const a = body.event_date_from <= body.event_date_to ? body.event_date_from : body.event_date_to;
    const b = body.event_date_from <= body.event_date_to ? body.event_date_to : body.event_date_from;
    eventFrom = a >= today ? a : today;
    eventTo = b;
  } else {
    eventFrom = today;
  }

  let statusIn: string[] = ["pending", "confirmed"];
  if (body.status && ["pending", "confirmed", "completed", "cancelled"].includes(body.status)) {
    statusIn = [body.status];
  }
  return { eventFrom, eventTo, statusIn };
}
