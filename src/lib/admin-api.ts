import { createClient } from "@supabase/supabase-js";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { NextResponse } from "next/server";

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function requireAdmin(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const supabase = getAdminClient();
  if (!supabase) return { error: NextResponse.json({ error: "Not configured" }, { status: 500 }) };
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!p || (p.role !== "admin" && p.role !== "staff")) {
    return {
      error: NextResponse.json(
        { error: "Admin or staff access required. If you have access, try signing out and back in." },
        { status: 403 },
      ),
    };
  }
  return { user, supabase };
}
