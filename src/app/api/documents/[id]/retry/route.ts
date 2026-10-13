import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { analyzeDocument } from "@/lib/analysis";

/**
 * POST /api/documents/[id]/retry
 *
 * Re-runs analysis for one of the user's documents (e.g. after a previous
 * 'failed'). Runs synchronously so the client gets the outcome and can
 * refresh. RLS ensures the document must belong to the caller.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Load the document (RLS limits this to the caller's own rows).
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, user_id, storage_path")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const result = await analyzeDocument(supabase, {
    documentId: doc.id,
    userId: doc.user_id,
    storagePath: doc.storage_path,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
