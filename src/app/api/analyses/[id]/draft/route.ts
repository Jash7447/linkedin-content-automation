import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateDraft } from "@/lib/drafting";

/**
 * POST /api/analyses/[id]/draft
 *
 * Generates a LinkedIn draft from one of the user's analyses. Synchronous so
 * the client receives the generated post. RLS ensures the analysis belongs to
 * the caller.
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

  const result = await generateDraft(supabase, {
    analysisId: id,
    userId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    { draftId: result.draftId, versionId: result.versionId },
    { status: 201 },
  );
}
