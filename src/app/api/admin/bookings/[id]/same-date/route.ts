import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { getBookingSlotsConfig } from "@/lib/booking-slots";

/** Other bookings on the same date (multi-slot / whole-day visibility). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: self, error: e0 } = await supabase
    .from("bookings")
    .select("id, event_date, event_slot_key, booking_code, client_name, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (e0 || !self?.event_date)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("id, event_date, event_slot_key, booking_code, client_name, client_email, status")
    .eq("event_date", self.event_date)
    .in("status", ["pending", "confirmed", "completed"])
    .neq("id", bookingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const config = await getBookingSlotsConfig(supabase);
  const label = (key: string | null) => {
    if (key == null || String(key).trim() === "") return "Full venue (whole day)";
    const def = config.slots.find((s) => s.key === key);
    return def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : key;
  };

  const selfSlot = self.event_slot_key;
  const selfWhole = selfSlot == null || String(selfSlot).trim() === "";

  const others = (rows || []).map((r) => ({
    id: r.id,
    booking_code: r.booking_code as string | null,
    client_name: r.client_name as string | null,
    client_email: r.client_email as string | null,
    status: r.status as string,
    slot_label: label(r.event_slot_key as string | null),
    same_slot_or_overlap: selfWhole || r.event_slot_key == null || String(r.event_slot_key).trim() === "" || r.event_slot_key === selfSlot,
  }));

  return NextResponse.json({
    event_date: self.event_date,
    this_booking: {
      id: self.id,
      booking_code: self.booking_code,
      slot_label: label(selfSlot as string | null),
      reserves: selfWhole ? "whole_day" : "slot",
    },
    others_on_date: others,
  });
}
