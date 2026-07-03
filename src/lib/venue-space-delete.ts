import type { SupabaseClient } from "@supabase/supabase-js";

export function venueSpaceDeleteErrorMessage(raw: string): string {
  if (raw.includes("booking_spaces_space_id_fkey")) {
    return "This hall is still linked to one or more bookings. Remove it from those bookings first, or try again — the system should unlink them automatically.";
  }
  return raw;
}

/** Unlink a hall from bookings and enquiries so venue_spaces can be deleted. */
export async function unlinkVenueSpace(
  supabase: SupabaseClient,
  spaceId: string,
): Promise<{ bookingLinks: number; bookingLegacy: number }> {
  const { count: bookingLinks } = await supabase
    .from("booking_spaces")
    .select("*", { count: "exact", head: true })
    .eq("space_id", spaceId);

  const { count: bookingLegacy } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("space_id", spaceId);

  const { error: unlinkErr } = await supabase.from("booking_spaces").delete().eq("space_id", spaceId);
  if (unlinkErr) throw new Error(unlinkErr.message);

  await supabase.from("bookings").update({ space_id: null }).eq("space_id", spaceId);

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, preferred_space_ids")
    .contains("preferred_space_ids", [spaceId]);

  for (const e of enquiries ?? []) {
    const current = (e.preferred_space_ids as string[] | null) ?? [];
    const next = current.filter((id) => id !== spaceId);
    await supabase
      .from("enquiries")
      .update({ preferred_space_ids: next.length ? next : null })
      .eq("id", e.id);
  }

  return {
    bookingLinks: bookingLinks ?? 0,
    bookingLegacy: bookingLegacy ?? 0,
  };
}
