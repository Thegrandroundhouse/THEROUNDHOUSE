import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getBookingSlotsConfig,
  getSlotCountsForDate,
  isWholeDaySlotKey,
  slotAvailabilityForDate,
} from "@/lib/booking-slots";
import { hallAvailabilityForDate, listVenueHalls, loadCalendarBlocks } from "@/lib/booking-halls";
import {
  isDateFullyManuallyBlocked,
  loadActiveDateHolds,
  mergeCalendarBlocks,
} from "@/lib/public-calendar-availability";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Public: availability per slot + per hall for one date (contact page). */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ enabled: false, slots: [], halls: [] });
  const config = await getBookingSlotsConfig(supabase);

  const hallsList = await listVenueHalls(supabase);
  const allHallIds = hallsList.map((h) => h.id);
  const [manualBlocks, holds] = await Promise.all([
    loadCalendarBlocks(supabase, date, date),
    loadActiveDateHolds(supabase, date, date),
  ]);
  const holdBlocks = holds
    .filter((h) => isWholeDaySlotKey(h.event_slot_key))
    .map((h) => ({ date: h.date, space_id: h.space_id }));
  const blocks = mergeCalendarBlocks(manualBlocks, holdBlocks);
  const dateManuallyBlocked = isDateFullyManuallyBlocked(blocks, date, allHallIds);
  const halls = await hallAvailabilityForDate(supabase, date, blocks);
  const availableHallNames = halls.filter((h) => h.selectable).map((h) => h.name);
  const unavailableHallNames = halls.filter((h) => !h.selectable).map((h) => h.name);

  if (!config.enabled || !config.slots.length) {
    const { hasWholeDay, counts } = await getSlotCountsForDate(supabase, date);
    const anyBooking = hasWholeDay || Object.values(counts).some((n) => n > 0);
    const closed = dateManuallyBlocked || (anyBooking && availableHallNames.length === 0);
    return NextResponse.json({
      enabled: false,
      maxPerSlot: 1,
      slots: [],
      halls,
      availableHallNames,
      unavailableHallNames,
      dateFullyBooked: closed,
      dateManuallyBlocked,
      wholeDayAvailable: !closed && availableHallNames.length > 0 && config.allowWholeDay !== false,
      allowWholeDay: config.allowWholeDay !== false,
      wholeDayLabel: config.wholeDayLabel,
      hasWholeDayBooking: hasWholeDay,
    });
  }

  if (dateManuallyBlocked) {
    return NextResponse.json({
      enabled: true,
      maxPerSlot: config.maxPerSlot,
      slots: config.slots.map((s) => ({
        ...s,
        available: false,
        booked: config.maxPerSlot,
        max: config.maxPerSlot,
      })),
      halls,
      availableHallNames,
      unavailableHallNames,
      dateFullyBooked: true,
      dateManuallyBlocked: true,
      wholeDayAvailable: false,
      allowWholeDay: config.allowWholeDay !== false,
      wholeDayLabel: config.wholeDayLabel,
      hasWholeDayBooking: false,
    });
  }

  const slots = await slotAvailabilityForDate(supabase, date, config);
  const dateFullyBooked = slots.every((s) => !s.available) || availableHallNames.length === 0;
  const { hasWholeDay, counts } = await getSlotCountsForDate(supabase, date);
  const anySlotBooking = Object.values(counts).some((n) => n > 0);
  const anySlotHold = holds.some((h) => !isWholeDaySlotKey(h.event_slot_key));
  const wholeDayAvailable =
    config.allowWholeDay !== false &&
    !hasWholeDay &&
    !anySlotBooking &&
    !anySlotHold &&
    !dateFullyBooked &&
    unavailableHallNames.length === 0;
  return NextResponse.json({
    enabled: true,
    maxPerSlot: config.maxPerSlot,
    slots,
    halls,
    availableHallNames,
    unavailableHallNames,
    dateFullyBooked,
    dateManuallyBlocked: false,
    wholeDayAvailable,
    allowWholeDay: config.allowWholeDay !== false,
    wholeDayLabel: config.wholeDayLabel,
    hasWholeDayBooking: hasWholeDay,
  });
}
