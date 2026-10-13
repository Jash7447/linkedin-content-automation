import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Refresh the Supabase auth session on every request and keep auth cookies in
 * sync between the browser and server.
 *
 * This runs in middleware (Edge runtime). It must:
 *  1. Read request cookies to load the current session.
 *  2. Call `getUser()` to trigger a token refresh when needed.
 *  3. Write any updated cookies onto the response so the browser gets them.
 *
 * It also performs route protection: unauthenticated users hitting a protected
 * route are redirected to /login; signed-in users on /login are sent to /.
 *
 * IMPORTANT: do not run code between creating the client and calling getUser(),
 * and always return the `supabaseResponse` object as-is (per Supabase SSR docs)
 * so cookies are not dropped.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session. Use getUser() (not getSession()) because it
  // revalidates the token with the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login";

  // Unauthenticated user on a protected route -> redirect to /login.
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user visiting /login -> send to the dashboard.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
