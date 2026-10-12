export default function DashboardPage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            LinkedIn Content Workspace
            <span className="brand__badge">Phase 1</span>
          </span>
        </div>
      </header>

      <main className="app-main">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Upload a research paper, analyze it, and generate a LinkedIn draft you
          can review before publishing. This is the application foundation —
          upload and analysis are not wired up yet.
        </p>

        <div className="dashboard-grid">
          <section className="card" aria-labelledby="upload-heading">
            <h2 className="card__title" id="upload-heading">
              Upload a document
            </h2>
            <p className="card__hint">
              Add a research paper (PDF) or import paper metadata from Excel.
            </p>
            <div className="empty-state" role="status">
              <span className="empty-state__icon" aria-hidden="true">
                📄
              </span>
              <p className="empty-state__text">
                No documents yet. Upload a PDF or Excel file to get started.
              </p>
              <button type="button" className="button" disabled aria-disabled="true">
                Upload document
                <span className="sr-only"> (coming soon)</span>
              </button>
            </div>
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
          Foundation only: authentication, document processing, AI analysis, and
          draft versioning are implemented in later Phase 1 steps.
        </p>
      </main>
    </>
  );
}
