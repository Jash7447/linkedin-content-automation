import "server-only";

/**
 * Server-only secrets. The `server-only` import above makes any attempt to
 * import this module from a Client Component fail at build time, preventing
 * accidental secret leakage into the browser bundle.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local (see .env.local.example).`,
    );
  }
  return value;
}

/** Supabase service-role key — full database access, bypasses RLS. */
export const serverEnv = {
  supabaseServiceRoleKey: required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
} as const;

/**
 * Task-scoped Gemini API keys.
 *
 * Keys are resolved per task so one task cannot exhaust another's free-tier
 * quota (see docs/ROADMAP.md). Add new tasks here without touching call sites.
 */
export type GeminiTask = "analysis" | "drafting";

const geminiKeyEnvNames: Record<GeminiTask, string> = {
  analysis: "GEMINI_API_KEY_ANALYSIS",
  drafting: "GEMINI_API_KEY_DRAFTING",
};

/** Lazily resolve a Gemini key by task so missing keys only fail when used. */
export function getGeminiApiKey(task: GeminiTask): string {
  const name = geminiKeyEnvNames[task];
  return required(name, process.env[name]);
}
