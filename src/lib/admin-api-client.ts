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

const STATUS_MESSAGES: Record<number, string> = {
  401: "Your session expired — please sign in again.",
  403: "You don't have permission to do that.",
  404: "That item wasn't found — it may have been deleted.",
  409: "This conflicts with another record — refresh and try again.",
  429: "Too many requests — wait a moment and try again.",
  500: "Something went wrong on our end — try again in a moment.",
  503: "The service is temporarily unavailable — try again shortly.",
};

function looksLikeRawTechnicalError(msg: string): boolean {
  const t = msg.trim();
  if (!t) return true;
  if (t.startsWith("<!DOCTYPE") || t.startsWith("<html") || t.includes("<html")) return true;
  if (/^(PGRST|42P\d{2}|23505|permission denied for|relation .* does not exist)/i.test(t)) return true;
  if (t.length > 280) return true;
  return false;
}

function friendlyMessage(raw: string): string | null {
  const t = raw.trim();
  if (!t || looksLikeRawTechnicalError(t)) return null;
  return t;
}

/**
 * Turn a failed admin API Response into a short, user-friendly message for alerts and banners.
 */
export async function parseAdminError(res: Response, fallback = "Something went wrong"): Promise<string> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof j.error === "string") {
        const msg = friendlyMessage(j.error);
        if (msg) return msg;
      }
      if (typeof j.message === "string") {
        const msg = friendlyMessage(j.message);
        if (msg) return msg;
      }
    } else {
      const text = await res.text();
      const msg = friendlyMessage(text);
      if (msg) return msg;
    }
  } catch {
    /* use status fallback */
  }
  return STATUS_MESSAGES[res.status] ?? fallback;
}
