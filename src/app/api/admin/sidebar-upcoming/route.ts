import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { getBookingSlotsConfig } from "@/lib/booking-slots";

/** Next bookings by event date (for sidebar). */
export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const slotConfig = await getBookingSlotsConfig(supabase);
  const slotLabel = (key: string | null) => {
    if (key == null || String(key).trim() === "") return "Full day";
    const s = slotConfig.slots.find((x) => x.key === key);
    return s ? `${s.label}${s.timeLabel ? ` · ${s.timeLabel}` : ""}` : key;
  };
  const today = new Date().toISOString().slice(0, 10);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(8, parseInt(searchParams.get("limit") || "25", 10)));
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from("bookings")
    .select("id, client_name, client_email, client_phone, event_date, event_slot_key, status, event_type, booking_code, total_cents", { count: "exact" })
    .gte("event_date", today)
    .in("status", ["pending", "confirmed"])
    .order("event_date", { ascending: true })
    .range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const totalPages = Math.ceil((count ?? 0) / limit) || 1;
  const rows = (data ?? []).map((r) => ({
    ...r,
    event_slot_label: slotLabel((r as { event_slot_key?: string | null }).event_slot_key ?? null),
  }));
  return NextResponse.json({
    rows,
    total: count ?? 0,
    page,
    limit,
    totalPages,
  });
}
