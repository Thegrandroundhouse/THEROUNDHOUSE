#!/usr/bin/env node
/**
 * Create an admin account directly in Supabase (no browser /register needed).
 *
 * Usage (from project root):
 *   node scripts/create-admin.js --email you@example.com --password "YourPass123" --name "Admin"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  const filePath = path.join(root, name);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = { help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-/g, "_");
      out[key] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function usage() {
  console.log(`
Create an admin login for The Roundhouse CRM.

  node scripts/create-admin.js --email EMAIL --password PASSWORD [--name "Display Name"]

If the email already exists, add --reset-password true to set a new password.

Requires in .env.local:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Then sign in at:
  http://localhost:3000/admin-login
  http://localhost:3000/login
`);
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function ensureAdminProfile(supabase, userId, email, displayName) {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin", display_name: displayName, email })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Profile update failed: ${profileError.message}`);
  }

  const { error: staffError } = await supabase.from("staff").insert({
    user_id: userId,
    email,
    display_name: displayName,
    role: "admin",
    is_active: true,
  });

  if (
    staffError &&
    !staffError.message?.includes("duplicate") &&
    !staffError.message?.includes("unique")
  ) {
    console.warn("Warning: staff row failed (admin user still updated):", staffError.message);
  }
}

function printSuccess(email, password, displayName) {
  console.log("\n✓ Admin account ready.\n");
  console.log("  Email:   ", email);
  console.log("  Password:", password);
  console.log("  Name:    ", displayName);
  console.log("\nSign in at:");
  console.log("  http://localhost:3000/admin-login");
  console.log("  http://localhost:3000/login");
  console.log("\nThen open: http://localhost:3000/admin\n");
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  const email = String(args.email || process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(args.password || process.env.ADMIN_PASSWORD || "");
  const displayName = String(args.name || process.env.ADMIN_NAME || "Admin").trim();
  const resetPassword = args.reset_password === "true" || args.reset_password === "1";

  if (!email || !password) {
    usage();
    console.error("Error: --email and --password are required.\n");
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Error: invalid email address.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Error: password must be at least 8 characters.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Error: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Creating admin: ${email} …`);

  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    if (!resetPassword) {
      console.error(
        `Error: ${email} already exists. Sign in at /admin-login, or run with --reset-password true to set a new password.`,
      );
      process.exit(1);
    }
    console.log(`User exists — resetting password and ensuring admin role…`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });
    if (updateError) {
      console.error("Password reset error:", updateError.message);
      process.exit(1);
    }
    try {
      await ensureAdminProfile(supabase, existing.id, email, displayName);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
    printSuccess(email, password, displayName);
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { display_name: displayName } : undefined,
  });

  if (authError) {
    console.error("Auth error:", authError.message || authError);
    process.exit(1);
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error("Error: user was not created.");
    process.exit(1);
  }

  try {
    await ensureAdminProfile(supabase, userId, email, displayName);
  } catch (err) {
    await supabase.auth.admin.deleteUser(userId);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  printSuccess(email, password, displayName);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
