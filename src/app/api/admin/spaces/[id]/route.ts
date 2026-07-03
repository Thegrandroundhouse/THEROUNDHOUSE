import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { unlinkVenueSpace, venueSpaceDeleteErrorMessage } from "@/lib/venue-space-delete";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(_request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("venue_spaces").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const u: Record<string, unknown> = {};
  if (body.name != null) u.name = body.name;
  if (body.slug != null) u.slug = body.slug;
  if (body.capacity !== undefined) u.capacity = body.capacity;
  if (body.sort_order != null) u.sort_order = body.sort_order;
  const { data, error } = await supabase.from("venue_spaces").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: hall } = await supabase.from("venue_spaces").select("id, name").eq("id", id).maybeSingle();
  if (!hall) return NextResponse.json({ error: "Hall not found" }, { status: 404 });

  try {
    const unlinked = await unlinkVenueSpace(supabase, id);
    const { error } = await supabase.from("venue_spaces").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: venueSpaceDeleteErrorMessage(error.message) }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      unlinked_bookings: unlinked.bookingLinks + unlinked.bookingLegacy,
    });
  } catch (e) {
    return NextResponse.json(
      { error: venueSpaceDeleteErrorMessage(e instanceof Error ? e.message : "Could not delete hall") },
      { status: 500 },
    );
  }
}
