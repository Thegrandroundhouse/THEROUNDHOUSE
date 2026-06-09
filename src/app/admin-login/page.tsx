"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_APP_NAME, ADMIN_APP_TAGLINE } from "@/lib/venue-constants";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace("/admin");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    if (!supabase) {
      setMessage({ type: "error", text: "Auth is not configured. Add Supabase env vars." });
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ type: "error", text: error.message || "Invalid email or password." });
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Staff sign in</h1>
        <p className="auth-sub">
          {ADMIN_APP_NAME} · {ADMIN_APP_TAGLINE}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-row">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {message && (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          )}
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-footer">
          <Link href="/">Back to site</Link>
        </p>
      </div>
    </div>
  );
}
