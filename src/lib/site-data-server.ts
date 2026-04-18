import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type ContentMap = Record<string, string | null>;
export type ImagesMap = Record<string, { url: string | null; alt_text: string | null }>;

export async function getSiteContent(): Promise<ContentMap> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from("site_content").select("key, value").order("key");
  if (error) return {};
  const map: ContentMap = {};
  for (const row of data ?? []) {
    map[row.key] = row.value ?? null;
  }
  return map;
}

export async function getSiteImages(): Promise<ImagesMap> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from("site_images").select("key, url, alt_text").order("sort_order");
  if (error) return {};
  const map: ImagesMap = {};
  for (const row of data ?? []) {
    map[row.key] = { url: row.url ?? null, alt_text: row.alt_text ?? null };
  }
  return map;
}
