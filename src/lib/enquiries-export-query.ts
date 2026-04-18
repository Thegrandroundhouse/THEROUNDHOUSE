export type EnquiriesExportBody = {
  date_mode?: "all" | "year" | "range";
  year?: string;
  event_date_from?: string;
  event_date_to?: string;
  status?: string;
};

export function enquiriesEventBounds(body: EnquiriesExportBody): { from: string | null; to: string | null } {
  const mode = body.date_mode || "all";
  if (mode === "year" && body.year && /^\d{4}$/.test(body.year)) {
    return { from: `${body.year}-01-01`, to: `${body.year}-12-31` };
  }
  if (
    mode === "range" &&
    body.event_date_from &&
    body.event_date_to &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.event_date_from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.event_date_to)
  ) {
    const a = body.event_date_from <= body.event_date_to ? body.event_date_from : body.event_date_to;
    const b = body.event_date_from <= body.event_date_to ? body.event_date_to : body.event_date_from;
    return { from: a, to: b };
  }
  return { from: null, to: null };
}
