import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { reviewVersion } from "@/lib/review";

/**
 * POST /api/versions/[id]/review
 * Body: { decision: "approved" | "rejected" }
 * Applies the decision to this EXACT version id.
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

  let body: { decision?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json(
      { error: "decision must be 'approved' or 'rejected'." },
      { status: 400 },
    );
  }

  const result = await reviewVersion(supabase, {
    versionId: id,
    decision: body.decision,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
