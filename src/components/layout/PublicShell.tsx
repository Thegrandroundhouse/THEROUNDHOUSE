"use client";

import { usePathname } from "next/navigation";
import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";
import { GrandHeader } from "./GrandHeader";
import { GrandFooter } from "./GrandFooter";
import { MobilePublicBottomNav } from "./MobilePublicBottomNav";

const ADMIN_PREFIXES = ["/admin", "/admin-login", "/login", "/register"];

function isAdminRoute(pathname: string) {
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (isAdminRoute(pathname)) return <>{children}</>;

  return (
    <SWRConfig value={swrConfig}>
      <GrandHeader />
      <div className="grand-mobile-tabbar-pad">
        <main id="main-content">{children}</main>
        <GrandFooter />
      </div>
      <MobilePublicBottomNav />
    </SWRConfig>
  );
}
