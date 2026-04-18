import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data, error } = await supabase.from("site_images").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { key, url, alt_text, sort_order } = body;
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (url !== undefined) update.url = url;
  if (alt_text !== undefined) update.alt_text = alt_text;
  if (sort_order !== undefined) update.sort_order = sort_order;
  const { data: existing } = await supabase.from("site_images").select("id").eq("key", key).single();
  if (existing) {
    const { data, error } = await supabase.from("site_images").update(update).eq("key", key).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  const { data, error } = await supabase
    .from("site_images")
    .insert({ key, url: url ?? null, alt_text: alt_text ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
