import type { SupabaseClient } from "@supabase/supabase-js";

const PREFIX = "TGRH-";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I to avoid confusion
const SUFFIX_LEN = 5;

function randomSuffix(): string {
  let s = "";
  for (let i = 0; i < SUFFIX_LEN; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

/** Generate a unique booking code TGRH-XXXXX (10 chars). */
export function generateBookingCode(): string {
  return PREFIX + randomSuffix();
}

/** Return a booking code that does not yet exist. */
export async function reserveUniqueBookingCode(supabase: SupabaseClient, maxAttempts = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateBookingCode();
    const { data } = await supabase.from("bookings").select("id").eq("booking_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate unique booking code");
}
