import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: before, error: fetchErr } = await supabase.from("date_holds").select("*").eq("id", id).single();
  if (fetchErr || !before) return NextResponse.json({ error: "Hold not found" }, { status: 404 });

  const u: Record<string, unknown> = {};
  if (body.released === true) u.released_at = new Date().toISOString();
  if (body.note !== undefined) u.note = body.note;
  if (body.expires_at !== undefined) u.expires_at = body.expires_at;
  const { data, error } = await supabase.from("date_holds").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.released === true && before.enquiry_id) {
    const enquiryId = before.enquiry_id as string;
    await supabase
      .from("reminders")
      .delete()
      .eq("enquiry_id", enquiryId)
      .eq("done", false)
      .like("title", "Hold expires —%");
    const { data: enq } = await supabase.from("enquiries").select("name").eq("id", enquiryId).single();
    const name = enq?.name?.trim() || "Lead";
    const holdDate = before.hold_date as string;
    const followUp = new Date();
    followUp.setTime(followUp.getTime() + 60 * 60 * 1000);
    await supabase.from("reminders").insert({
      created_by: user.id,
      title: `Hold released — follow up ${name}`,
      body: `Soft hold on ${holdDate} was released. Re-check availability and contact the lead.`,
      remind_at: followUp.toISOString(),
      enquiry_id: enquiryId,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { error } = await supabase.from("date_holds").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
