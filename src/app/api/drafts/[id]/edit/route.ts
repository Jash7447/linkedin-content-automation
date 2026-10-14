import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createEditedVersion } from "@/lib/drafting";

/**
 * POST /api/drafts/[id]/edit
 * Body: { postText: string, mermaidSource?: string | null }
 * Creates a NEW immutable version from user-edited content (pending review).
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

  let body: { postText?: string; mermaidSource?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await createEditedVersion(supabase, {
    draftId: id,
    userId: user.id,
    postText: body.postText ?? "",
    mermaidSource: body.mermaidSource ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    { versionId: result.versionId, versionNumber: result.versionNumber },
    { status: 201 },
  );
}
