import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Public API: returns all site_images (key, url, alt_text) for the frontend. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json([]);
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("site_images").select("key, url, alt_text").order("sort_order");
  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}
