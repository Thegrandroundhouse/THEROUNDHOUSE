import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { DEFAULT_BOOKING_SLOTS, parseBookingSlots, type BookingSlotsConfig } from "@/lib/booking-slots";

const KEY = "booking_slots";

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const payload = parseBookingSlots(data?.value);
  return NextResponse.json(payload);
}

function normalize(body: unknown): BookingSlotsConfig {
  if (!body || typeof body !== "object") return { ...DEFAULT_BOOKING_SLOTS };
  const o = body as Record<string, unknown>;
  const slotsRaw = o.slots;
  const slots =
    Array.isArray(slotsRaw) && slotsRaw.length
      ? slotsRaw
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const s = x as Record<string, unknown>;
            const key = typeof s.key === "string" ? s.key.trim().replace(/\s+/g, "_").toLowerCase() : "";
            if (!key || !/^[a-z0-9_-]+$/.test(key)) return null;
            return {
              key,
              label: typeof s.label === "string" && s.label.trim() ? s.label.trim() : key,
              timeLabel: typeof s.timeLabel === "string" ? s.timeLabel.trim() : "",
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)
          .slice(0, 12)
      : DEFAULT_BOOKING_SLOTS.slots;
  return {
    enabled: o.enabled === true,
    maxPerSlot:
      typeof o.maxPerSlot === "number" && o.maxPerSlot >= 1 ? Math.min(20, Math.floor(o.maxPerSlot)) : 1,
    allowWholeDay: o.allowWholeDay !== false,
    wholeDayLabel:
      typeof o.wholeDayLabel === "string" && o.wholeDayLabel.trim()
        ? o.wholeDayLabel.trim().slice(0, 280)
        : DEFAULT_BOOKING_SLOTS.wholeDayLabel,
    slots: slots.length ? slots : DEFAULT_BOOKING_SLOTS.slots,
  };
}

export async function PUT(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const payload = normalize(body);
  const { data: prevRow } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  const before = parseBookingSlots(prevRow?.value);
  const { error } = await supabase.from("site_settings").upsert(
    { key: KEY, value: payload as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "site_setting",
    summary: `Settings: booking time slots (${payload.enabled ? "on" : "off"}, ${payload.slots.length} slots)`,
    payload_before: before as unknown as Record<string, unknown>,
    payload_after: payload as unknown as Record<string, unknown>,
    metadata: { setting_key: KEY, path: "/admin/settings" },
  });
  return NextResponse.json(payload);
}
