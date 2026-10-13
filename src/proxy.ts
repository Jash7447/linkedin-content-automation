import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 "proxy" convention (formerly "middleware").
 *
 * Runs on every matched request to refresh the Supabase auth session and
 * enforce route protection. See src/lib/supabase/middleware.ts.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Run on all request paths except:
   *  - _next/static (build assets)
   *  - _next/image (image optimization)
   *  - favicon.ico and common static image types
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
