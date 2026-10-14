import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

export default defineConfig({
  test: {
    // Node environment; our units are pure/server-side.
    environment: "node",
    // Load .env (so the RLS integration test can read Supabase keys).
    env: loadDotEnv(),
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

/** Minimal .env loader so tests can access Supabase credentials. */
function loadDotEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // .env absent (e.g. CI without secrets) — integration tests will skip.
  }
  return out;
}
