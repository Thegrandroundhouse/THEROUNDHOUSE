import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { writeAuditLog } from "@/lib/audit-log";
import { reserveUniqueBookingCode } from "@/lib/booking-code";
import {
  assertSlotBookable,
  assertWholeDayBookable,
  getBookingSlotsConfig,
} from "@/lib/booking-slots";
import {
  BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE,
  isEventDateInFutureLondon,
  todayLondonYYYYMMDD,
} from "@/lib/booking-status-rules";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const BK_LIMIT = 50;

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(BK_LIMIT), 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const statusFilter = searchParams.get("status");
  const eventDateFrom = searchParams.get("event_date_from");
  const eventDateTo = searchParams.get("event_date_to");
  const searchQ = (searchParams.get("q") || "")
    .replace(/%/g, "")
    .replace(/_/g, "")
    .trim()
    .slice(0, 80);

  let qb = supabase.from("bookings").select("*", { count: "exact" });
  if (statusFilter && ["pending", "confirmed", "cancelled", "completed"].includes(statusFilter)) {
    qb = qb.eq("status", statusFilter);
  }
  if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) {
    qb = qb.gte("event_date", eventDateFrom);
  }
  if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) {
    qb = qb.lte("event_date", eventDateTo);
  }
  if (searchQ.length >= 2) {
    const like = `%${searchQ}%`;
    qb = qb.or(`booking_code.ilike.${like},client_email.ilike.${like},client_name.ilike.${like},client_phone.ilike.${like}`);
  }
  const { data, error, count } = await qb.order("event_date", { ascending: false }).range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const ms = `${y}-${String(m + 1).padStart(2, "0")}`;
  const [{ count: pending }, { count: confirmed }, { count: upcoming }] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("event_date", `${ms}-01`).lte("event_date", `${ms}-31`).neq("status", "cancelled"),
  ]);
  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit) || 1,
    summary: {
      pending: pending ?? 0,
      confirmed: confirmed ?? 0,
      upcomingThisMonth: upcoming ?? 0,
    },
  });
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  if (body.event_date && /^\d{4}-\d{2}-\d{2}$/.test(String(body.event_date)) && String(body.event_date) < todayLondonYYYYMMDD()) {
    return NextResponse.json({ error: "Event date cannot be in the past." }, { status: 400 });
  }
  const createStatus = body.status ?? "pending";
  if (
    createStatus === "completed" &&
    body.event_date &&
    isEventDateInFutureLondon(String(body.event_date))
  ) {
    return NextResponse.json({ error: BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE }, { status: 400 });
  }
  let package_name = body.package_name ?? null;
  let total_cents = body.total_cents ?? null;
  let pkg_notes: string | null = null;
  if (total_cents == null && body.event_date) {
    const { data: dayRow } = await supabase
      .from("venue_day_pricing")
      .select("suggested_total_cents")
      .eq("event_date", body.event_date)
      .maybeSingle();
    if (dayRow?.suggested_total_cents != null) {
      total_cents = dayRow.suggested_total_cents;
    } else {
      const { data: seasons } = await supabase
        .from("venue_season_pricing")
        .select("suggested_total_cents")
        .eq("active", true)
        .lte("date_start", body.event_date)
        .gte("date_end", body.event_date)
        .limit(1);
      const season = seasons?.[0];
      if (season?.suggested_total_cents != null) total_cents = season.suggested_total_cents;
    }
  }
  let pkgSlotKeys: string[] = [];
  if (body.package_id) {
    const { data: pkg } = await supabase
      .from("packages")
      .select("name, base_price_cents, description, line_items, event_slot_keys")
      .eq("id", body.package_id)
      .maybeSingle();
    if (pkg) {
      const raw = (pkg as { event_slot_keys?: unknown }).event_slot_keys;
      pkgSlotKeys = Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
        : [];
      package_name = pkg.name;
      if (total_cents == null && pkg.base_price_cents != null) total_cents = pkg.base_price_cents;
      const lines = Array.isArray(pkg.line_items) ? pkg.line_items : [];
      if (lines.length) {
        pkg_notes =
          "Package line items:\n" +
          lines.map((r: { label?: string; description?: string; amount_cents?: number }) => `• ${r.label || "Item"} ${r.description ? `— ${r.description}` : ""} (£${((r.amount_cents || 0) / 100).toFixed(2)})`).join("\n");
      } else if (pkg.description) pkg_notes = pkg.description;
    }
  }

  const booking_code = await reserveUniqueBookingCode(supabase);

  const slotConfig = await getBookingSlotsConfig(supabase);
  let event_slot_key: string | null = null;
  if (slotConfig.enabled && slotConfig.slots.length) {
    const hasExplicitSlot =
      body.event_slot_key &&
      String(body.event_slot_key).trim() &&
      body.event_slot_key !== "whole_day";
    if (slotConfig.allowWholeDay === false) {
      if (body.whole_day === true || !hasExplicitSlot) {
        return NextResponse.json(
          {
            error:
              "Choose a time slot. Full venue / whole day is turned off in Settings → Booking slots.",
          },
          { status: 400 },
        );
      }
    }
    const wholeDay =
      body.whole_day === true ||
      (!hasExplicitSlot && (body.event_slot_key === null || body.event_slot_key === "" || body.event_slot_key === "whole_day"));
    if (wholeDay) {
      const w = await assertWholeDayBookable(supabase, body.event_date);
      if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });
      event_slot_key = null;
    } else {
      const a = await assertSlotBookable(supabase, body.event_date, body.event_slot_key, slotConfig);
      if (!a.ok) return NextResponse.json({ error: a.error }, { status: 400 });
      event_slot_key = String(body.event_slot_key).trim();
    }
  } else {
    /* Whole-venue mode (no slots): one booking per date — same rule as full-day. */
    const w = await assertWholeDayBookable(supabase, body.event_date);
    if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });
    event_slot_key = null;
  }

  if (pkgSlotKeys.length > 0 && slotConfig.enabled && slotConfig.slots.length) {
    if (event_slot_key == null) {
      return NextResponse.json(
        { error: "This package is tied to specific time slots — choose a slot, not full venue." },
        { status: 400 },
      );
    }
    if (!pkgSlotKeys.includes(event_slot_key)) {
      return NextResponse.json(
        { error: `This package only applies to: ${pkgSlotKeys.join(", ")}. Pick a matching time slot.` },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      booking_code,
      client_name: body.client_name ?? null,
      client_email: body.client_email,
      client_phone: body.client_phone ?? null,
      event_date: body.event_date,
      event_slot_key,
      event_type: body.event_type ?? null,
      package_name,
      package_id: body.package_id ?? null,
      status: createStatus,
      total_cents,
      deposit_cents: body.deposit_cents ?? null,
      balance_cents: body.balance_cents ?? null,
      special_requirements: body.special_requirements ?? null,
      notes: [body.notes, pkg_notes].filter(Boolean).join("\n\n") || null,
      enquiry_id: body.enquiry_id ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase
    .from("date_holds")
    .update({ released_at: new Date().toISOString() })
    .eq("hold_date", body.event_date)
    .is("released_at", null);
  await writeAuditLog(supabase, user, {
    action: "create",
    entity_type: "booking",
    entity_id: data.id,
    booking_id: data.id,
    summary: `Created booking ${data.booking_code} ${data.client_name || data.client_email} · ${data.event_date}`,
    payload_after: {
      id: data.id,
      booking_code: data.booking_code,
      client_name: data.client_name,
      event_date: data.event_date,
      status: data.status,
      total_cents: data.total_cents,
    },
  });
  return NextResponse.json(data);
}
