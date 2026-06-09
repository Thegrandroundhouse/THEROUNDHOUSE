import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { AGREEMENT_SYSTEM_SLUGS } from "@/lib/agreement-templates-constants";
import { ensureBanquetingTemplates } from "@/lib/banqueting-templates-seed";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "agreement";
}

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  await ensureBanquetingTemplates(supabase);
  const { data, error } = await supabase
    .from("agreement_templates")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist"))
      return NextResponse.json({ rows: [], needsMigration: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []).map((r: { slug: string }) => ({
    ...r,
    is_system: AGREEMENT_SYSTEM_SLUGS.has(r.slug),
  }));
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const name = String(body.name || "Agreement").trim();
  let slug = String(body.slug || "").trim() || slugify(name);
  const { data: exists } = await supabase.from("agreement_templates").select("id").eq("slug", slug).maybeSingle();
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;
  const is_preferred = !!body.is_preferred;
  if (is_preferred) {
    await supabase.from("agreement_templates").update({ is_preferred: false }).neq("slug", "");
  }
  const { data, error } = await supabase
    .from("agreement_templates")
    .insert({
      name,
      slug,
      body: String(body.body || ""),
      custom_fields: Array.isArray(body.custom_fields) ? body.custom_fields : [],
      is_preferred,
      sort_order: Number(body.sort_order) || 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    const hint =
      error.message?.includes("row-level security") || error.code === "42501"
        ? " Apply latest Supabase migrations (agreements RLS) or ensure agreement_templates exists."
        : "";
    return NextResponse.json({ error: error.message + hint, code: error.code }, { status: 500 });
  }
  await writeAuditLog(supabase, user, {
    action: "create",
    entity_type: "agreement_template",
    entity_id: data.id,
    summary: `Agreement template: ${data.name}`,
  });
  return NextResponse.json(data);
}
