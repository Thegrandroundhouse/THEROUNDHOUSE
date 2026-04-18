"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const REGISTER_DISABLED =
  typeof process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER !== "undefined" &&
  (process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER === "1" ||
    String(process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER).toLowerCase() === "true");

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (REGISTER_DISABLED) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) router.replace("/admin");
        });
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (REGISTER_DISABLED) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/register-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim().slice(0, 100) || null,
          setup_key: setupKey,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || `Registration failed (${res.status}). Try again or check server logs.`,
        });
        setLoading(false);
        return;
      }
      setMessage({ type: "ok", text: data.message || "Admin created. Redirecting to sign in…" });
      setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1500);
    } catch {
      setMessage({ type: "error", text: "Network error. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  if (REGISTER_DISABLED) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Registration closed</h1>
          <p className="auth-sub">
            Public admin registration is turned off for this deployment. Use an account your administrator created, or sign in
            below.
          </p>
          <p className="auth-message error" style={{ marginTop: "1rem" }}>
            If you need access, an existing admin can add you under <strong>Admin → Staff</strong>.
          </p>
          <Link href="/login" className="btn btn-primary auth-submit" style={{ display: "inline-block", textAlign: "center", marginTop: "1rem", textDecoration: "none" }}>
            Sign in
          </Link>
          <p className="auth-footer">
            <Link href="/admin-login">Staff login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Register admin</h1>
        <p className="auth-sub">First admin only — requires <code className="auth-code">ADMIN_SETUP_KEY</code> from your server env.</p>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-row">
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="e.g. Site admin"
              maxLength={100}
            />
          </div>
          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@venue.com"
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="form-row">
            <label htmlFor="setupKey">Admin setup key</label>
            <input
              id="setupKey"
              name="setupKey"
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              required
              autoComplete="off"
              placeholder="Same value as ADMIN_SETUP_KEY"
              aria-describedby="setupKey-hint"
            />
            <small id="setupKey-hint" className="auth-hint">
              Must match <code>ADMIN_SETUP_KEY</code> in <code>.env.local</code> (8+ characters). Remove or disable this page after the first admin exists.
            </small>
          </div>
          {message && (
            <p className={`auth-message ${message.type}`} role="alert">
              {message.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Creating admin…" : "Create admin account"}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
