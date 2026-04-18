import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getBookingSlotsConfig } from "@/lib/booking-slots";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** GET: month overview — bookings per date + manual blocks from venue_calendar */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const y = parseInt(request.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const m = parseInt(request.nextUrl.searchParams.get("month") || String(new Date().getMonth()), 10);
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const start = new Date(y, m, 1).toISOString().slice(0, 10);
  const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);

  const slotConfig = await getBookingSlotsConfig(supabase);
  const slotLabel = (key: string | null) => {
    if (key == null || String(key).trim() === "") return "Full day";
    const s = slotConfig.slots.find((x) => x.key === key);
    return s ? `${s.label}${s.timeLabel ? ` · ${s.timeLabel}` : ""}` : key;
  };

  const [{ data: bookings }, { data: manualRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, event_date, event_slot_key, client_name, client_email, status, package_name, event_type")
      .gte("event_date", start)
      .lte("event_date", end)
      .in("status", ["pending", "confirmed", "completed"]),
    supabase
      .from("venue_calendar")
      .select("date")
      .gte("date", start)
      .lte("date", end)
      .eq("is_booked", true)
      .is("booking_id", null),
  ]);

  const bookingsByDate: Record<
    string,
    {
      id: string;
      client_name: string | null;
      client_email: string;
      status: string;
      package_name: string | null;
      event_type: string | null;
      event_slot_key: string | null;
      event_slot_label: string;
    }[]
  > = {};
  for (const b of bookings ?? []) {
    const d = b.event_date as string;
    if (!bookingsByDate[d]) bookingsByDate[d] = [];
    bookingsByDate[d].push({
      id: b.id,
      client_name: b.client_name,
      client_email: b.client_email,
      status: b.status,
      package_name: b.package_name ?? null,
      event_type: b.event_type ?? null,
      event_slot_key: (b.event_slot_key as string | null) ?? null,
      event_slot_label: slotLabel((b.event_slot_key as string | null) ?? null),
    });
  }

  const manualBlockedDates = [...new Set((manualRows ?? []).map((r) => r.date as string))];

  return NextResponse.json({
    year: y,
    month: m,
    start,
    end,
    bookingsByDate,
    manualBlockedDates,
  });
}
