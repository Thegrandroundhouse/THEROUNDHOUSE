import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const supabase = auth.supabase;
  const body = await request.json();
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.done === "boolean") u.done = body.done;
  if (typeof body.title === "string") u.title = body.title.trim();
  if (body.body !== undefined) u.body = body.body === null || body.body === "" ? null : String(body.body).trim();
  if (body.remind_at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(body.remind_at))) u.remind_at = body.remind_at;
  const { data, error } = await supabase.from("reminders").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const { error } = await auth.supabase.from("reminders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
