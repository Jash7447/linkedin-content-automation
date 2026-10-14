"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AnalysisContent } from "@/lib/analysis";
import type { DraftView } from "../page";
import DraftCard from "./DraftCard";

export default function AnalyzedDocument({
  analysisId,
  summary,
  content,
  existingDrafts,
}: {
  analysisId: string;
  summary: string;
  content: AnalysisContent;
  existingDrafts: DraftView[];
}) {
  const router = useRouter();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/analyses/${analysisId}/draft`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Draft generation failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="analyzed">
      {summary ? <p className="doc-item__summary">{summary}</p> : null}

      <div className="analyzed__actions">
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => setShowAnalysis((s) => !s)}
          aria-expanded={showAnalysis}
        >
          {showAnalysis ? "Hide analysis" : "View analysis"}
        </button>
        <button
          type="button"
          className="button button--enabled button--small"
          onClick={generate}
          disabled={generating}
        >
          {generating ? "Generating…" : "Generate draft"}
        </button>
      </div>

      {error ? <p className="analyzed__error">{error}</p> : null}

      {showAnalysis ? (
        <div className="analysis-detail">
          {content.title ? (
            <p>
              <strong>Title:</strong> {content.title}
            </p>
          ) : null}
          {content.problem ? (
            <p>
              <strong>Problem:</strong> {content.problem}
            </p>
          ) : null}
          {content.method ? (
            <p>
              <strong>Method:</strong> {content.method}
            </p>
          ) : null}
          {content.results ? (
            <p>
              <strong>Results:</strong> {content.results}
            </p>
          ) : null}
          {content.contributions?.length ? (
            <>
              <p>
                <strong>Contributions:</strong>
              </p>
              <ul>
                {content.contributions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          ) : null}
          {content.takeaways?.length ? (
            <>
              <p>
                <strong>Takeaways:</strong>
              </p>
              <ul>
                {content.takeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {existingDrafts.length > 0 ? (
        <div className="draft-list">
          {existingDrafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
