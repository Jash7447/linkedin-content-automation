/**
 * Shared upload rules. Used by both the client (pre-validate for fast UX) and
 * the server (authoritative validation). Never trust the client alone.
 */

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_EXCEL_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed MIME types mapped to the document_kind stored in the DB. */
export const ALLOWED_PDF_MIME = "application/pdf" as const;

/** Common MIME types browsers send for .xlsx / .xls files. */
export const ALLOWED_EXCEL_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/octet-stream", // some browsers for .xlsx
] as const;

export type UploadValidationError = { ok: false; error: string };
export type UploadValidationOk = { ok: true };
export type UploadValidationResult = UploadValidationOk | UploadValidationError;

/** Validate a PDF upload by MIME type and size. */
export function validatePdfUpload(
  mimeType: string,
  sizeBytes: number,
): UploadValidationResult {
  if (mimeType !== ALLOWED_PDF_MIME) {
    return { ok: false, error: "Only PDF files are allowed." };
  }
  if (sizeBytes <= 0) {
    return { ok: false, error: "File is empty." };
  }
  if (sizeBytes > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: `File is too large. Maximum size is ${Math.floor(
        MAX_PDF_BYTES / (1024 * 1024),
      )} MB.`,
    };
  }
  return { ok: true };
}

/**
 * Validate an Excel upload. Browsers are inconsistent with .xlsx MIME types,
 * so we accept a known set OR fall back to the .xlsx/.xls file extension.
 */
export function validateExcelUpload(
  mimeType: string,
  sizeBytes: number,
  filename: string,
): UploadValidationResult {
  const extOk = /\.(xlsx|xls)$/i.test(filename);
  const mimeOk = (ALLOWED_EXCEL_MIMES as readonly string[]).includes(mimeType);

  if (!mimeOk && !extOk) {
    return { ok: false, error: "Only Excel (.xlsx/.xls) files are allowed." };
  }
  if (sizeBytes <= 0) {
    return { ok: false, error: "File is empty." };
  }
  if (sizeBytes > MAX_EXCEL_BYTES) {
    return {
      ok: false,
      error: `File is too large. Maximum size is ${Math.floor(
        MAX_EXCEL_BYTES / (1024 * 1024),
      )} MB.`,
    };
  }
  return { ok: true };
}
