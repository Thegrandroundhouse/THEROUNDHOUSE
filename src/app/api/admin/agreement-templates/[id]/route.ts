import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { AGREEMENT_SYSTEM_SLUGS, AGREEMENT_LOCKED_PLACEHOLDERS } from "@/lib/agreement-templates-constants";

function enforceLockedPlaceholders(original: string, submitted: string): string {
  let out = submitted;
  for (const tok of AGREEMENT_LOCKED_PLACEHOLDERS) {
    if (!original.includes(tok)) continue;
    if (!out.includes(tok)) out = `${out.trimEnd()}\n\n${tok}`;
  }
  return out;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("agreement_templates").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...data, is_system: AGREEMENT_SYSTEM_SLUGS.has(data.slug) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if (body.is_preferred === true) {
    await supabase.from("agreement_templates").update({ is_preferred: false }).neq("slug", "");
  }
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) u.name = String(body.name);
  if (body.body !== undefined) u.body = String(body.body);
  if (body.custom_fields !== undefined) u.custom_fields = body.custom_fields;
  if (body.is_preferred !== undefined) u.is_preferred = !!body.is_preferred;
  if (body.sort_order !== undefined) u.sort_order = Number(body.sort_order);
  if (body.body !== undefined) {
    const { data: cur } = await supabase.from("agreement_templates").select("body, slug").eq("id", id).single();
    if (cur && AGREEMENT_SYSTEM_SLUGS.has(cur.slug)) {
      u.body = enforceLockedPlaceholders(String(cur.body || ""), String(body.body));
    }
  }

  const { data, error } = await supabase.from("agreement_templates").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "agreement_template",
    entity_id: id,
    summary: `Updated agreement template ${data.name}`,
  });
  return NextResponse.json({ ...data, is_system: AGREEMENT_SYSTEM_SLUGS.has(data.slug) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: row } = await supabase.from("agreement_templates").select("slug").eq("id", id).maybeSingle();
  if (row && AGREEMENT_SYSTEM_SLUGS.has(row.slug)) {
    return NextResponse.json({ error: "Library templates cannot be deleted. Duplicate to customize." }, { status: 403 });
  }
  const { error } = await supabase.from("agreement_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "delete",
    entity_type: "agreement_template",
    entity_id: id,
    summary: `Deleted agreement template`,
  });
  return NextResponse.json({ ok: true });
}
