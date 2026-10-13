import { after, NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { analyzeDocument } from "@/lib/analysis";
import { ALLOWED_PDF_MIME, validatePdfUpload } from "@/lib/uploads";

/**
 * POST /api/documents/upload
 *
 * Accepts a multipart/form-data body with a single `file` field (PDF).
 * Flow: authenticate -> validate type/size (server is authoritative) ->
 * store bytes in the private "documents" bucket at {user_id}/{id}.pdf ->
 * insert a documents row. RLS also enforces ownership as defense in depth.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field." },
      { status: 400 },
    );
  }

  // Authoritative server-side validation.
  const validation = validatePdfUpload(file.type, file.size);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Pre-generate the row id so we can derive a stable storage path.
  const documentId = crypto.randomUUID();
  const storagePath = `${user.id}/${documentId}.pdf`;

  // Upload bytes to the private bucket.
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: ALLOWED_PDF_MIME,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // Insert the metadata row.
  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      user_id: user.id,
      kind: "pdf",
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: ALLOWED_PDF_MIME,
      size_bytes: file.size,
      status: "uploaded",
    })
    .select("id, original_filename, size_bytes, status, created_at")
    .single();

  if (insertError) {
    // Roll back the stored file so we don't leave orphaned bytes.
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: `Could not save document: ${insertError.message}` },
      { status: 500 },
    );
  }

  // Kick off analysis after the response is sent, so the user isn't blocked.
  // Not a durable job: if the function ends early or analysis fails, the
  // document is left 'processing'/'failed' and the user can retry.
  after(async () => {
    await analyzeDocument(supabase, {
      documentId,
      userId: user.id,
      storagePath,
    });
  });

  return NextResponse.json({ document: inserted }, { status: 201 });
}
