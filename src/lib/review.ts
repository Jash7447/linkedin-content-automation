import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Review a SPECIFIC draft version. Approval/rejection applies to exactly one
 * version id (steering §6): a new version never inherits a prior decision, and
 * only an approved exact version may ever be published later.
 *
 * The immutability DB trigger allows updating review fields (review_status,
 * reviewed_at) while freezing content, so this is safe.
 */
export async function reviewVersion(
  supabase: SupabaseClient,
  params: {
    versionId: string;
    decision: "approved" | "rejected";
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { versionId, decision } = params;

  // RLS ensures the version belongs to the caller.
  const { data, error } = await supabase
    .from("draft_versions")
    .update({
      review_status: decision,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", versionId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Version not found." };
  }

  return { ok: true };
}
