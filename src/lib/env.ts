/**
 * Centralized environment variable access.
 *
 * Two layers:
 *  - `publicEnv`  : values safe to expose to the browser (NEXT_PUBLIC_*).
 *  - `serverEnv`  : secrets that must NEVER reach the client. This module half
 *                   is guarded by `server-only` so importing it from a Client
 *                   Component is a build-time error.
 *
 * Why split the file? Client components can import `publicEnv` without pulling
 * in the `server-only` guard. Server code imports `serverEnv` for secrets.
 */

/** Throw a clear error instead of silently shipping `undefined` to a client. */
function required(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local (see .env.local.example).`,
    );
  }
  return value;
}

/**
 * Public configuration — safe for the browser.
 *
 * Next.js inlines NEXT_PUBLIC_* at build time, so these must be referenced by
 * their full literal name (no dynamic property access) to be statically
 * replaced in client bundles.
 */
export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
