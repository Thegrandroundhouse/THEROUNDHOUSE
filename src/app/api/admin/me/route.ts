import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

/** Current signed-in admin/staff display for topbar. */
export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!p || (p.role !== "admin" && p.role !== "staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: st } = await supabase.from("staff").select("display_name, role").eq("user_id", user.id).maybeSingle();
  const fullName = st?.display_name?.trim() || user.email?.split("@")[0] || "User";
  return NextResponse.json({
    email: user.email,
    displayName: fullName,
    role: p.role,
    staffRole: st?.role ?? null,
  });
}
