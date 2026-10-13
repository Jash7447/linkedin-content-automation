"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ALLOWED_PDF_MIME,
  MAX_PDF_BYTES,
  validatePdfUpload,
} from "@/lib/uploads";

type Status = "idle" | "uploading" | "success" | "error";

export default function UploadDocument() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleFile(file: File) {
    // Fast client-side pre-check; the server re-validates authoritatively.
    const pre = validatePdfUpload(file.type, file.size);
    if (!pre.ok) {
      setStatus("error");
      setMessage(pre.error);
      return;
    }

    setStatus("uploading");
    setMessage(`Uploading ${file.name}…`);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body,
      });

      const data = (await res.json()) as {
        error?: string;
        document?: { original_filename: string };
      };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Upload failed.");
        return;
      }

      setStatus("success");
      setMessage(`Uploaded ${data.document?.original_filename ?? file.name}.`);
      // Refresh the server component so the new document appears in the list.
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Network error during upload.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="upload">
      <input
        ref={inputRef}
        type="file"
        accept={`${ALLOWED_PDF_MIME},.pdf`}
        className="sr-only"
        id="document-file"
        disabled={status === "uploading"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <label
        htmlFor="document-file"
        className="button button--enabled"
        aria-disabled={status === "uploading"}
      >
        {status === "uploading" ? "Uploading…" : "Upload PDF"}
      </label>

      <p className="upload__hint">
        PDF only, up to {Math.floor(MAX_PDF_BYTES / (1024 * 1024))} MB.
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
