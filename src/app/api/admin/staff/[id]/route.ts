import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data, error } = await supabase.from("staff").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data: row } = await supabase.from("staff").select("user_id").eq("id", id).single();

  // Optional: change password (requires user_id)
  if (body.password !== undefined) {
    if (!row?.user_id) return NextResponse.json({ error: "No login linked — cannot change password." }, { status: 400 });
    const password = String(body.password || "");
    const password_confirm = String(body.password_confirm ?? "");
    if (password !== password_confirm) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    const { error: pwdError } = await supabase.auth.admin.updateUserById(row.user_id, { password });
    if (pwdError) return NextResponse.json({ error: pwdError.message }, { status: 400 });
  }

  const allowed = ["display_name", "role", "is_active", "phone", "job_title", "notes"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
  if (body.role !== undefined && row?.user_id) {
    const profileRole = body.role === "admin" ? "admin" : "staff";
    await supabase.from("profiles").update({ role: profileRole }).eq("id", row.user_id);
  }
  const { data, error } = await supabase.from("staff").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data: row } = await supabase.from("staff").select("user_id").eq("id", id).single();
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (row?.user_id) {
    await supabase.auth.admin.deleteUser(row.user_id);
  }
  return NextResponse.json({ ok: true });
}
