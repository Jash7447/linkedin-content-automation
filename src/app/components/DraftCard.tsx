"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { DraftView, VersionView } from "../page";
import MermaidDiagram from "./MermaidDiagram";

export default function DraftCard({ draft }: { draft: DraftView }) {
  const router = useRouter();
  const current =
    draft.versions.find((v) => v.id === draft.current_version_id) ??
    draft.versions[0];
  const history = draft.versions.filter((v) => v.id !== current.id);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(current.post_text);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  async function call(url: string, body?: unknown) {
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error.");
      return false;
    }
  }

  async function saveEdit() {
    setBusy("edit");
    const ok = await call(`/api/drafts/${draft.id}/edit`, { postText: text });
    if (ok) setEditing(false);
    setBusy("");
  }

  async function regenerate() {
    setBusy("regenerate");
    await call(`/api/drafts/${draft.id}/regenerate`);
    setBusy("");
  }

  async function review(decision: "approved" | "rejected") {
    setBusy(decision);
    await call(`/api/versions/${current.id}/review`, { decision });
    setBusy("");
  }

  return (
    <article className="draft">
      <div className="draft__head">
        <span className="draft__title">{draft.title}</span>
        <span className={`draft__status draft__status--${current.review_status}`}>
          v{current.version_number} · {current.review_status}
        </span>
      </div>

      {editing ? (
        <div className="draft__edit">
          <textarea
            className="draft__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
          />
          <div className="draft__actions">
            <button
              type="button"
              className="button button--enabled button--small"
              onClick={saveEdit}
              disabled={busy === "edit"}
            >
              {busy === "edit" ? "Saving…" : "Save as new version"}
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => {
                setEditing(false);
                setText(current.post_text);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <pre className="draft__text">{current.post_text}</pre>
          {current.mermaid_source ? (
            <MermaidDiagram source={current.mermaid_source} />
          ) : null}

          <div className="draft__actions">
            <button
              type="button"
              className="button button--enabled button--small"
              onClick={() => review("approved")}
              disabled={busy !== "" || current.review_status === "approved"}
            >
              {current.review_status === "approved" ? "Approved" : "Approve"}
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => review("rejected")}
              disabled={busy !== "" || current.review_status === "rejected"}
            >
              {current.review_status === "rejected" ? "Rejected" : "Reject"}
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => {
                setText(current.post_text);
                setEditing(true);
              }}
              disabled={busy !== ""}
            >
              Edit
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={regenerate}
              disabled={busy !== ""}
            >
              {busy === "regenerate" ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </>
      )}

      {error ? <p className="analyzed__error">{error}</p> : null}

      {history.length > 0 ? (
        <div className="draft__history">
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => setShowHistory((s) => !s)}
            aria-expanded={showHistory}
          >
            {showHistory
              ? "Hide history"
              : `Version history (${history.length})`}
          </button>
          {showHistory ? (
            <ul className="version-list">
              {history.map((v) => (
                <HistoryItem key={v.id} version={v} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function HistoryItem({ version }: { version: VersionView }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="version-item">
      <button
        type="button"
        className="version-item__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        v{version.version_number} · {version.review_status}
      </button>
      {open ? <pre className="draft__text">{version.post_text}</pre> : null}
    </li>
  );
}
