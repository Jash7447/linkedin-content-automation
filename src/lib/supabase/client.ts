"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * Supabase client for use in Client Components (browser).
 *
 * Uses only the public URL + anon key. The anon key is safe to expose; access
 * is governed by Row-Level Security on the database.
 */
export function createClient() {
  return createBrowserClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
