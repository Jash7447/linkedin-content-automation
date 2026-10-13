import { redirect } from "next/navigation";

import { signOut } from "./login/actions";
import UploadDocument from "./components/UploadDocument";
import RetryExtraction from "./components/RetryExtraction";
import { createClient } from "@/lib/supabase/server";

type DocumentRow = {
  id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
  created_at: string;
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

  // RLS restricts this to the current user's own documents.
  const { data: documents } = await supabase
    .from("documents")
    .select("id, original_filename, size_bytes, status, created_at")
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  const docs = documents ?? [];

  // Fetch analysis summaries for these documents (RLS-scoped). Presence of a
  // row means the document has been analyzed.
  const summaries = new Map<string, string>();
  if (docs.length > 0) {
    const { data: analyses } = await supabase
      .from("analyses")
      .select("document_id, summary")
      .in(
        "document_id",
        docs.map((d) => d.id),
      )
      .returns<{ document_id: string; summary: string }[]>();
    for (const a of analyses ?? []) {
      summaries.set(a.document_id, a.summary);
    }
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
                  const summary = summaries.get(doc.id);
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
                      {doc.status === "ready" && summary ? (
                        <p className="doc-item__summary">{summary}</p>
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
              Generated drafts appear here for you to edit, approve, or reject.
            </p>
            <div className="empty-state" role="status">
              <span className="empty-state__icon" aria-hidden="true">
                📝
              </span>
              <p className="empty-state__text">
                No drafts awaiting review. Analyze a paper to generate your first
                draft.
              </p>
            </div>
          </section>
        </div>

        <p className="note">
          Upload and AI analysis are live. LinkedIn draft generation and draft
          versioning are implemented in later Phase 1 steps.
        </p>
      </main>
    </>
  );
}
