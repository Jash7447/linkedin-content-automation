import { redirect } from "next/navigation";

import { signOut } from "./login/actions";
import UploadDocument from "./components/UploadDocument";
import RetryExtraction from "./components/RetryExtraction";
import AnalyzedDocument from "./components/AnalyzedDocument";
import type { AnalysisContent } from "@/lib/analysis";
import { createClient } from "@/lib/supabase/server";

type DocumentRow = {
  id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
  created_at: string;
};

type AnalysisRow = {
  id: string;
  document_id: string;
  summary: string;
  content: AnalysisContent;
};

export type VersionView = {
  id: string;
  version_number: number;
  post_text: string;
  mermaid_source: string | null;
  review_status: string;
};

export type DraftView = {
  id: string;
  title: string;
  current_version_id: string | null;
  versions: VersionView[]; // all versions, newest first
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: middleware already redirects unauthenticated users, but
  // enforce it here too so the page never renders without a verified session.
  if (!user) {
    redirect("/login");
  }

  // RLS restricts all of these to the current user's own rows.
  const { data: documents } = await supabase
    .from("documents")
    .select("id, original_filename, size_bytes, status, created_at")
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  const docs = documents ?? [];

  // Full analyses for these documents.
  const analysisByDoc = new Map<string, AnalysisRow>();
  if (docs.length > 0) {
    const { data: analyses } = await supabase
      .from("analyses")
      .select("id, document_id, summary, content")
      .in(
        "document_id",
        docs.map((d) => d.id),
      )
      .returns<AnalysisRow[]>();
    for (const a of analyses ?? []) {
      analysisByDoc.set(a.document_id, a);
    }
  }

  // Existing drafts (with their current version) grouped by source analysis.
  const draftsByAnalysis = new Map<string, DraftView[]>();
  const { data: drafts } = await supabase
    .from("drafts")
    .select(
      "id, title, source_analysis_id, current_version_id, draft_versions(id, post_text, mermaid_source, review_status, version_number)",
    )
    .order("created_at", { ascending: false });

  for (const d of drafts ?? []) {
    const row = d as unknown as {
      id: string;
      title: string;
      source_analysis_id: string | null;
      current_version_id: string | null;
      draft_versions: VersionView[] | null;
    };
    if (!row.source_analysis_id) continue;

    const versions = (row.draft_versions ?? [])
      .slice()
      .sort((a, b) => b.version_number - a.version_number); // newest first

    if (versions.length === 0) continue;

    const view: DraftView = {
      id: row.id,
      title: row.title,
      current_version_id: row.current_version_id,
      versions,
    };
    const list = draftsByAnalysis.get(row.source_analysis_id) ?? [];
    list.push(view);
    draftsByAnalysis.set(row.source_analysis_id, list);
  }

  const statusLabel: Record<string, string> = {
    uploaded: "Uploaded",
    processing: "Analyzing…",
    ready: "Analyzed",
    failed: "Analysis failed",
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            LinkedIn Content Workspace
            <span className="brand__badge">Phase 1</span>
          </span>
          <div className="user-chip">
            <span className="user-chip__email">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="button button--secondary button--small"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="app-main">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Upload a research paper (PDF), analyze it, and generate a LinkedIn
          draft you can review before publishing.
        </p>

        <div className="dashboard-grid">
          <section className="card" aria-labelledby="upload-heading">
            <h2 className="card__title" id="upload-heading">
              Upload a document
            </h2>
            <p className="card__hint">
              Add a research paper as a PDF. Excel import comes later.
            </p>

            <UploadDocument />

            {docs.length === 0 ? (
              <div className="empty-state" role="status">
                <span className="empty-state__icon" aria-hidden="true">
                  📄
                </span>
                <p className="empty-state__text">
                  No documents yet. Upload a PDF to get started.
                </p>
              </div>
            ) : (
              <ul className="doc-list">
                {docs.map((doc) => {
                  const analysis = analysisByDoc.get(doc.id);
                  const existingDrafts = analysis
                    ? draftsByAnalysis.get(analysis.id) ?? []
                    : [];
                  return (
                    <li key={doc.id} className="doc-item">
                      <div className="doc-item__top">
                        <span className="doc-item__name">
                          {doc.original_filename}
                        </span>
                        <span className="doc-item__meta">
                          {formatBytes(doc.size_bytes)} ·{" "}
                          {statusLabel[doc.status] ?? doc.status}
                          {doc.status === "failed" ? (
                            <RetryExtraction documentId={doc.id} />
                          ) : null}
                        </span>
                      </div>

                      {doc.status === "ready" && analysis ? (
                        <AnalyzedDocument
                          analysisId={analysis.id}
                          summary={analysis.summary}
                          content={analysis.content}
                          existingDrafts={existingDrafts}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="drafts-heading">
            <h2 className="card__title" id="drafts-heading">
              Drafts awaiting review
            </h2>
            <p className="card__hint">
              Generated drafts appear under their source paper. Review and
              versioning tools are the next step.
            </p>
            {(() => {
              const all = Array.from(draftsByAnalysis.values()).flat();
              const pending = all.filter((d) => {
                const current =
                  d.versions.find((v) => v.id === d.current_version_id) ??
                  d.versions[0];
                return current?.review_status === "pending";
              }).length;
              if (all.length === 0) {
                return (
                  <div className="empty-state" role="status">
                    <span className="empty-state__icon" aria-hidden="true">
                      📝
                    </span>
                    <p className="empty-state__text">
                      No drafts yet. Generate a draft from an analyzed paper.
                    </p>
                  </div>
                );
              }
              return (
                <p className="draft-tally">
                  {all.length} draft{all.length === 1 ? "" : "s"} total
                  {pending > 0 ? ` · ${pending} pending review` : ""}.
                </p>
              );
            })()}
          </section>
        </div>

        <p className="note">
          Upload, analysis, and draft generation are live. Draft editing,
          versioning, and approve/reject are the next Phase 1 step.
        </p>
      </main>
    </>
  );
}
