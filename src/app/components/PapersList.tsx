"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PaperView = {
  id: string;
  sheet_name: string;
  row_number: number;
  detected_title: string | null;
  detected_link: string | null;
  document_id: string | null;
  raw_cells: Record<string, unknown>;
};

export type PdfOption = { id: string; original_filename: string };

export default function PapersList({
  papers,
  pdfOptions,
}: {
  papers: PaperView[];
  pdfOptions: PdfOption[];
}) {
  if (papers.length === 0) return null;

  return (
    <div className="papers">
      <h3 className="papers__heading">Imported papers ({papers.length})</h3>
      <ul className="paper-list">
        {papers.map((p) => (
          <PaperItem key={p.id} paper={p} pdfOptions={pdfOptions} />
        ))}
      </ul>
    </div>
  );
}

function PaperItem({
  paper,
  pdfOptions,
}: {
  paper: PaperView;
  pdfOptions: PdfOption[];
}) {
  const router = useRouter();
  const [showCells, setShowCells] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function associate(documentId: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/papers/${paper.id}/associate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not associate.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    paper.detected_title ??
    `(no title detected) — ${paper.sheet_name} row ${paper.row_number}`;

  return (
    <li className="paper-item">
      <div className="paper-item__main">
        <span className="paper-item__title">{title}</span>
        <span className="paper-item__meta">
          {paper.sheet_name} · row {paper.row_number}
        </span>
      </div>

      {paper.detected_link ? (
        <a
          className="paper-item__link"
          href={paper.detected_link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {paper.detected_link}
        </a>
      ) : (
        <span className="paper-item__nolink">No link detected</span>
      )}

      <div className="paper-item__assoc">
        <label className="field__label" htmlFor={`assoc-${paper.id}`}>
          Associated PDF
        </label>
        <select
          id={`assoc-${paper.id}`}
          className="field__input"
          value={paper.document_id ?? ""}
          disabled={busy || pdfOptions.length === 0}
          onChange={(e) => associate(e.target.value || null)}
        >
          <option value="">— none —</option>
          {pdfOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.original_filename}
            </option>
          ))}
        </select>
        {pdfOptions.length === 0 ? (
          <span className="paper-item__hint">Upload a PDF to associate.</span>
        ) : null}
      </div>

      {error ? <p className="analyzed__error">{error}</p> : null}

      <button
        type="button"
        className="button button--secondary button--small"
        onClick={() => setShowCells((s) => !s)}
        aria-expanded={showCells}
      >
        {showCells ? "Hide row data" : "Inspect row data"}
      </button>
      {showCells ? (
        <table className="cell-table">
          <tbody>
            {Object.entries(paper.raw_cells).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </li>
  );
}
