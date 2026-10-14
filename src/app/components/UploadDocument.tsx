"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ALLOWED_PDF_MIME,
  MAX_PDF_BYTES,
  MAX_EXCEL_BYTES,
  validatePdfUpload,
  validateExcelUpload,
} from "@/lib/uploads";

type Status = "idle" | "uploading" | "success" | "error";

export default function UploadDocument() {
  const router = useRouter();
  const pdfRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function handlePdf(file: File) {
    const pre = validatePdfUpload(file.type, file.size);
    if (!pre.ok) {
      setStatus("error");
      setMessage(pre.error);
      return;
    }
    await send(file, "/api/documents/upload", `Uploaded ${file.name}.`);
    if (pdfRef.current) pdfRef.current.value = "";
  }

  async function handleExcel(file: File) {
    const pre = validateExcelUpload(file.type, file.size, file.name);
    if (!pre.ok) {
      setStatus("error");
      setMessage(pre.error);
      return;
    }
    await send(file, "/api/papers/import", null);
    if (xlsxRef.current) xlsxRef.current.value = "";
  }

  async function send(file: File, url: string, successMsg: string | null) {
    setStatus("uploading");
    setMessage(`Processing ${file.name}…`);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(url, { method: "POST", body });
      const data = (await res.json()) as {
        error?: string;
        imported?: number;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Request failed.");
        return;
      }
      setStatus("success");
      setMessage(
        successMsg ??
          `Imported ${data.imported ?? 0} paper${data.imported === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  const busy = status === "uploading";

  return (
    <div className="upload">
      <div className="upload__buttons">
        <input
          ref={pdfRef}
          type="file"
          accept={`${ALLOWED_PDF_MIME},.pdf`}
          className="sr-only"
          id="pdf-file"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handlePdf(f);
          }}
        />
        <label
          htmlFor="pdf-file"
          className="button button--enabled"
          aria-disabled={busy}
        >
          {busy ? "Working…" : "Upload PDF"}
        </label>

        <input
          ref={xlsxRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          id="xlsx-file"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleExcel(f);
          }}
        />
        <label
          htmlFor="xlsx-file"
          className="button button--secondary"
          aria-disabled={busy}
        >
          Import Excel
        </label>
      </div>

      <p className="upload__hint">
        PDF up to {Math.floor(MAX_PDF_BYTES / (1024 * 1024))} MB · Excel
        (.xlsx/.xls) up to {Math.floor(MAX_EXCEL_BYTES / (1024 * 1024))} MB.
      </p>

      {message ? (
        <p
          className={
            status === "error" ? "upload__msg upload__msg--error" : "upload__msg"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
