"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REGISTER_DISABLED =
  typeof process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER !== "undefined" &&
  (process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER === "1" ||
    String(process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER).toLowerCase() === "true");

export default function LoginPage() {
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
      setMessage({
        type: "error",
        text: "Sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      });
      setLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const msg = error.message?.toLowerCase().includes("invalid")
          ? "Invalid email or password."
          : error.message || "Sign-in failed.";
        setMessage({ type: "error", text: msg });
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">The Grand Roundhouse Admin</p>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
              autoComplete="current-password"
            />
          </div>
          {message && (
            <p className={`auth-message ${message.type}`} role="alert">
              {message.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-footer">
          {REGISTER_DISABLED ? (
            <>Need access? Ask an admin to add you under Staff.</>
          ) : (
            <>
              First admin? <Link href="/register">Register with setup key</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
