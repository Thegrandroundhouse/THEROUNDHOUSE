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
  const { data, error } = await supabase.from("staff").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** Create staff: Supabase Auth user + profile role + staff row. They can sign in at /admin-login with email/password. */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const display_name = body.display_name ? String(body.display_name).trim() : null;
  const role = (body.role === "admin" ? "admin" : "staff") as "admin" | "staff";
  const profileRole = role === "admin" ? "admin" : "staff";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: display_name ? { display_name } : undefined,
  });

  if (authError) {
    const msg = authError.message || "Could not create account";
    if (msg.includes("already") || authError.status === 422) {
      return NextResponse.json({ error: "That email is already registered. Use a different email or reset password in Supabase." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const newUser = authData.user;
  if (!newUser?.id) {
    return NextResponse.json({ error: "User was not created" }, { status: 500 });
  }

  const userId = newUser.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: profileRole, display_name: display_name ?? null, email })
    .eq("id", userId);

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const phone = body.phone ? String(body.phone).trim() || null : null;
  const job_title = body.job_title ? String(body.job_title).trim() || null : null;
  const notes = body.notes ? String(body.notes).trim() || null : null;

  const insertPayload = {
    user_id: userId,
    email,
    display_name,
    role,
    is_active: true,
    phone,
    job_title,
    notes,
  };
  let { data: inserted, error: staffError } = await supabase.from("staff").insert(insertPayload).select().single();
  if (staffError?.message?.includes("column") && (staffError.message.includes("phone") || staffError.message.includes("does not exist"))) {
    const { user_id, email: em, display_name: dn, role: r, is_active: ia } = insertPayload;
    const retry = await supabase.from("staff").insert({ user_id, email: em, display_name: dn, role: r, is_active: ia }).select().single();
    inserted = retry.data;
    staffError = retry.error;
  }
  if (staffError || !inserted) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: staffError?.message || "Staff insert failed — run migration 014_staff_profile_fields.sql" }, { status: 500 });
  }
  return NextResponse.json(inserted);
}
