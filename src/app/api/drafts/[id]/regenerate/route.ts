import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { regenerateVersion } from "@/lib/drafting";

/**
 * POST /api/drafts/[id]/regenerate
 * Produces a fresh LLM draft from the draft's source analysis and appends it
 * as a NEW immutable version (pending review).
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

  const result = await regenerateVersion(supabase, {
    draftId: id,
    userId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    { versionId: result.versionId, versionNumber: result.versionNumber },
    { status: 201 },
  );
}
