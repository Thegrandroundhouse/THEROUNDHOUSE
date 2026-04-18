import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Public API: returns site_content as key-value map for the front-end.
 * No auth required (read-only). Used by home page etc. to show admin-edited copy.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({}, { status: 200 });
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("site_content").select("key, value").order("key");
  if (error) return NextResponse.json({}, { status: 200 });
  const map: Record<string, string | null> = {};
  for (const row of data || []) {
    map[row.key] = row.value ?? null;
  }
  return NextResponse.json(map);
}
