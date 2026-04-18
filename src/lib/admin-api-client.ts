"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-side: get auth headers for admin API calls.
 * Call this before fetch to /api/admin/* so the server can verify the session.
 */
export async function getAdminAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  if (!supabase) return {};
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Fetch an admin API route with the current user's token.
 * Use instead of fetch() for all /api/admin/* calls from the admin UI.
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAdminAuthHeaders();
  const headers = new Headers(options.headers);
  if (authHeaders && typeof authHeaders === "object" && "Authorization" in authHeaders) {
    headers.set("Authorization", (authHeaders as Record<string, string>).Authorization);
  }
  return fetch(url, { ...options, headers });
}
