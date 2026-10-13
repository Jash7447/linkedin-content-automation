"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryExtraction({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function retry() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/retry`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Retry failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="retry">
      <button
        type="button"
        className="button button--secondary button--small"
        onClick={retry}
        disabled={busy}
      >
        {busy ? "Retrying…" : "Retry"}
      </button>
      {error ? <span className="retry__error">{error}</span> : null}
    </span>
  );
}
