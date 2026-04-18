"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/admin-login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} className={`admin-sidebar-btn admin-sidebar-btn--signout ${className}`.trim()}>
      Sign out
    </button>
  );
}
