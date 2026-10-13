import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Reads/writes the auth session from the request cookies so the user's session
 * is available on the server. Must be created per-request (cookies() is
 * request-scoped).
 *
 * NOTE: In a pure Server Component, cookie writes are not allowed by Next.js;
 * the try/catch swallows that case. Session refresh/writes happen in
 * middleware (see src/lib/supabase/middleware.ts), so this is safe.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by middleware, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Admin client using the service-role key. Bypasses Row-Level Security.
 *
 * Use ONLY for trusted server-side operations that genuinely require elevated
 * access (e.g. administrative tasks). Never derive user identity from this
 * client — it has no session. Prefer the request-scoped `createClient()` for
 * anything acting on behalf of a signed-in user.
 */
export function createAdminClient() {
  return createSupabaseClient(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
