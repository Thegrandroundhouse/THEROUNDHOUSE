import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin-api";
import { isAdminRegisterDisabled } from "@/lib/production-flags";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_MAX = 100;

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    const m = (err as { message: string }).message;
    if (m.length > 200) return fallback;
    return m;
  }
  return fallback;
}

/**
 * Create the first admin account. Requires ADMIN_SETUP_KEY in env to match the request.
 * Set DISABLE_ADMIN_REGISTER=1 (and NEXT_PUBLIC_DISABLE_ADMIN_REGISTER=1) after bootstrap to block this route.
 */
export async function POST(request: Request) {
  if (isAdminRegisterDisabled()) {
    return NextResponse.json(
      {
        error:
          "Public admin registration is disabled. Sign in if you already have an account, or add staff from Admin → Staff.",
        code: "REGISTER_DISABLED",
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayNameRaw = body.display_name != null ? String(body.display_name).trim() : "";
  const displayName = displayNameRaw ? displayNameRaw.slice(0, DISPLAY_NAME_MAX) : null;
  const setupKey = body.setup_key != null ? String(body.setup_key).trim() : "";

  const expectedKey = process.env.ADMIN_SETUP_KEY;
  if (!expectedKey || expectedKey.length < 8) {
    return NextResponse.json(
      {
        error:
          "Admin registration is not configured. Set ADMIN_SETUP_KEY in .env.local (8+ characters), restart the server, and try again.",
        code: "SETUP_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  if (setupKey !== expectedKey) {
    return NextResponse.json(
      { error: "Setup key does not match. Copy ADMIN_SETUP_KEY from your server env exactly.", code: "INVALID_SETUP_KEY" },
      { status: 403 },
    );
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required.", code: "VALIDATION" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address.", code: "VALIDATION" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required.", code: "VALIDATION" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters.", code: "VALIDATION" }, { status: 400 });
  }
  if (password.length > 128) {
    return NextResponse.json({ error: "Password is too long (max 128 characters).", code: "VALIDATION" }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfiguration: Supabase service role is missing. Check SUPABASE_SERVICE_ROLE_KEY.", code: "SERVER_CONFIG" },
      { status: 500 },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { display_name: displayName } : undefined,
  });

  if (authError) {
    const msg = authError.message || "";
    if (msg.toLowerCase().includes("already") || authError.status === 422) {
      return NextResponse.json(
        {
          error: "That email is already in use. Sign in at /login or use a different email.",
          code: "EMAIL_TAKEN",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: safeErrorMessage(authError, "Could not create account. Check Supabase Auth settings (Email provider enabled)."), code: "AUTH_ERROR" },
      { status: 400 },
    );
  }

  const newUser = authData.user;
  if (!newUser?.id) {
    return NextResponse.json({ error: "Account was not created. Try again or check Supabase logs.", code: "CREATE_FAILED" }, { status: 500 });
  }

  const userId = newUser.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin", display_name: displayName ?? null, email })
    .eq("id", userId);

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      {
        error: `Profile update failed: ${profileError.message}. Ensure migrations are applied (profiles + handle_new_user trigger).`,
        code: "PROFILE_ERROR",
      },
      { status: 500 },
    );
  }

  const staffPayload = {
    user_id: userId,
    email,
    display_name: displayName,
    role: "admin" as const,
    is_active: true,
  };
  const { error: staffError } = await supabase.from("staff").insert(staffPayload);
  if (staffError && !staffError.message?.includes("duplicate") && !staffError.message?.includes("unique")) {
    return NextResponse.json(
      { error: `Staff row failed: ${staffError.message}. Admin user was created; fix staff table or add row manually.`, code: "STAFF_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Admin account created. Sign in at /login or /admin-login.",
  });
}
