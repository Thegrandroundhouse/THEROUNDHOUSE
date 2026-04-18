import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// When MAINTENANCE_MODE=1, show maintenance page except for /maintenance and /admin-login
const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "1";

export function middleware(request: NextRequest) {
  if (!MAINTENANCE_MODE) return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (path === "/maintenance" || path === "/admin-login" || path.startsWith("/admin")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
  matcher: ["/((?!_next|api|favicon|.*\\..*).*)"],
};
