import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS cross-user isolation integration test.
 *
 * Proves the Phase 1 acceptance criterion: "Users cannot access another user's
 * files or drafts." We create two real users, insert a documents row owned by
 * user A, and assert that user B — using their own authenticated (anon-key,
 * RLS-scoped) client — cannot read it, while A can.
 *
 * Requires real Supabase credentials in .env. If absent, the suite skips
 * (so CI without secrets stays green) rather than silently passing a no-op.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasEnv = Boolean(url && anonKey && serviceKey);

// Skip the whole suite (visibly) when credentials are not available.
describe.skipIf(!hasEnv)("RLS cross-user isolation", () => {
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });

  const suffix = Date.now();
  const userA = { email: `rls_a_${suffix}@example.com`, password: "test-pw-12345" };
  const userB = { email: `rls_b_${suffix}@example.com`, password: "test-pw-12345" };

  let userAId = "";
  let userBId = "";
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let insertedDocId = "";

  beforeAll(async () => {
    // Create two confirmed users via the admin API.
    const a = await admin.auth.admin.createUser({
      email: userA.email,
      password: userA.password,
      email_confirm: true,
    });
    const b = await admin.auth.admin.createUser({
      email: userB.email,
      password: userB.password,
      email_confirm: true,
    });
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    userAId = a.data.user!.id;
    userBId = b.data.user!.id;

    // Build RLS-scoped clients (anon key) and sign each user in.
    clientA = createClient(url!, anonKey!, { auth: { persistSession: false } });
    clientB = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const signA = await clientA.auth.signInWithPassword(userA);
    const signB = await clientB.auth.signInWithPassword(userB);
    if (signA.error) throw signA.error;
    if (signB.error) throw signB.error;

    // User A inserts a document row (via their RLS-scoped client).
    const ins = await clientA
      .from("documents")
      .insert({
        user_id: userAId,
        kind: "pdf",
        original_filename: "secret.pdf",
        storage_path: `${userAId}/secret.pdf`,
        mime_type: "application/pdf",
        size_bytes: 123,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    insertedDocId = ins.data.id;
  }, 30_000);

  afterAll(async () => {
    // Deleting the users cascades their documents (FK ON DELETE CASCADE).
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  }, 30_000);

  it("owner (A) can read their own document", async () => {
    const { data, error } = await clientA
      .from("documents")
      .select("id")
      .eq("id", insertedDocId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("other user (B) cannot read A's document", async () => {
    const { data, error } = await clientB
      .from("documents")
      .select("id")
      .eq("id", insertedDocId);
    // RLS returns zero rows (not an error) for rows the user can't see.
    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("other user (B) cannot update A's document", async () => {
    const { data } = await clientB
      .from("documents")
      .update({ original_filename: "hacked.pdf" })
      .eq("id", insertedDocId)
      .select("id");
    // No visible row to update -> zero rows affected.
    expect(data?.length ?? 0).toBe(0);
  });

  it("other user (B) cannot delete A's document", async () => {
    const { data } = await clientB
      .from("documents")
      .delete()
      .eq("id", insertedDocId)
      .select("id");
    expect(data?.length ?? 0).toBe(0);

    // Confirm it still exists for A.
    const check = await clientA
      .from("documents")
      .select("id")
      .eq("id", insertedDocId);
    expect(check.data?.length).toBe(1);
  });
});
