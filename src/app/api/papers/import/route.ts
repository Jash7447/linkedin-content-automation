import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { validateExcelUpload } from "@/lib/uploads";
import { parseWorkbook } from "@/lib/excel";

/**
 * POST /api/papers/import
 *
 * multipart/form-data with a `file` field (.xlsx/.xls). Flow:
 *  authenticate -> validate -> store the Excel as an 'excel' document ->
 *  parse rows (tolerant of messy sheets) -> bulk-insert papers.
 *
 * The stored file is retained so the import is auditable; parsing happens from
 * the in-memory buffer (no re-download needed).
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
    return NextResponse.json({ error: "Missing 'file' field." }, { status: 400 });
  }

  const validation = validateExcelUpload(file.type, file.size, file.name);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();

  // Parse first so we fail fast on an unreadable workbook before storing.
  let rows;
  try {
    rows = parseWorkbook(buffer);
  } catch {
    return NextResponse.json(
      { error: "Could not read the Excel file. Is it a valid .xlsx/.xls?" },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No data rows found in the spreadsheet." },
      { status: 400 },
    );
  }

  // Store the Excel file as an 'excel' document.
  const documentId = crypto.randomUUID();
  const storagePath = `${user.id}/${documentId}.xlsx`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { error: docError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: user.id,
    kind: "excel",
    original_filename: file.name,
    storage_path: storagePath,
    mime_type:
      file.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: file.size,
    status: "ready",
  });
  if (docError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: `Could not save document: ${docError.message}` },
      { status: 500 },
    );
  }

  // Bulk-insert the parsed paper rows.
  const paperRows = rows.map((r) => ({
    user_id: user.id,
    source_document_id: documentId,
    workbook_name: file.name,
    sheet_name: r.sheetName,
    row_number: r.rowNumber,
    raw_cells: r.rawCells,
    detected_title: r.detectedTitle,
    detected_link: r.detectedLink,
  }));

  const { error: papersError, count } = await supabase
    .from("papers")
    .insert(paperRows, { count: "exact" });

  if (papersError) {
    return NextResponse.json(
      { error: `Could not save papers: ${papersError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { imported: count ?? paperRows.length },
    { status: 201 },
  );
}
