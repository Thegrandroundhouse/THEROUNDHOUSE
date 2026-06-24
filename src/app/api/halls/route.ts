import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin-api";
import { listVenueHalls } from "@/lib/booking-halls";

/** Public list of bookable halls (contact form, etc.). */
export async function GET() {
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json([]);
  const halls = await listVenueHalls(supabase);
  return NextResponse.json(halls.map((h) => ({ id: h.id, name: h.name, slug: h.slug, capacity: h.capacity })));
}
