import { describe, it, expect } from "vitest";

import {
  validatePdfUpload,
  MAX_PDF_BYTES,
  ALLOWED_PDF_MIME,
} from "@/lib/uploads";

describe("validatePdfUpload", () => {
  it("accepts a valid PDF under the size limit", () => {
    expect(validatePdfUpload(ALLOWED_PDF_MIME, 1024)).toEqual({ ok: true });
  });

  it("accepts a PDF exactly at the size limit", () => {
    expect(validatePdfUpload(ALLOWED_PDF_MIME, MAX_PDF_BYTES)).toEqual({
      ok: true,
    });
  });

  it("rejects a non-PDF MIME type", () => {
    const r = validatePdfUpload("image/png", 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/only pdf/i);
  });

  it("rejects an empty file", () => {
    const r = validatePdfUpload(ALLOWED_PDF_MIME, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);
  });

  it("rejects a file over the size limit", () => {
    const r = validatePdfUpload(ALLOWED_PDF_MIME, MAX_PDF_BYTES + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/i);
  });

  it("rejects an empty MIME type", () => {
    const r = validatePdfUpload("", 1024);
    expect(r.ok).toBe(false);
  });
});
