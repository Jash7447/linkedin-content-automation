import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/papers/[id]/associate
 * Body: { documentId: string | null }
 *
 * Associates a paper with an uploaded PDF document (or clears it when null).
 * Correctable: can be called again to change the association. Validates that
 * the target document belongs to the user and is a PDF. RLS enforces ownership.
 */
export async function POST(
  request: NextRequest,
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

  let body: { documentId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const documentId = body.documentId ?? null;

  // If associating (not clearing), verify the target is the user's own PDF.
  if (documentId !== null) {
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, kind")
      .eq("id", documentId)
      .single();
    if (error || !doc) {
      return NextResponse.json(
        { error: "Target document not found." },
        { status: 404 },
      );
    }
    if (doc.kind !== "pdf") {
      return NextResponse.json(
        { error: "A paper can only be associated with a PDF document." },
        { status: 400 },
      );
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("papers")
    .update({ document_id: documentId })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
