/**
 * Pure, dependency-free heuristics for interpreting loosely-structured
 * spreadsheet rows. Kept separate from the `xlsx` reader so it is easy to unit
 * test and reason about.
 *
 * The importer must NOT assume fixed column names (ROADMAP requirement). These
 * helpers make best-effort guesses and are explicit about low confidence.
 */

export type Cells = Record<string, unknown>;

const LINK_HEADER_HINTS = ["link", "url", "pdf", "doi", "arxiv", "href"];
const TITLE_HEADER_HINTS = ["title", "paper", "name", "article"];

const URL_RE = /\bhttps?:\/\/[^\s"')]+/i;
const ARXIV_RE = /\barxiv\.org\/\S+|arxiv:\s*\d{4}\.\d{4,5}/i;
const DOI_RE = /\b10\.\d{4,9}\/\S+/i;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Detect a link in a row. Strategy:
 *  1. Prefer a cell whose HEADER looks link-like (url/link/pdf/doi/arxiv) and
 *     whose value contains a URL/arxiv/doi pattern.
 *  2. Otherwise, scan all cells for the first URL/arxiv/doi match.
 * Returns null if nothing link-like is found.
 */
export function detectLink(cells: Cells): string | null {
  // Pass 1: header-hinted columns.
  for (const [key, value] of Object.entries(cells)) {
    const header = norm(key);
    if (LINK_HEADER_HINTS.some((h) => header.includes(h))) {
      const text = asString(value);
      const m =
        text.match(URL_RE) ?? text.match(ARXIV_RE) ?? text.match(DOI_RE);
      if (m) return m[0];
      // A bare arxiv id or doi with no scheme still counts if the header is explicit.
      if (text.length > 0 && (header.includes("doi") || header.includes("arxiv"))) {
        return text;
      }
    }
  }
  // Pass 2: scan every cell for a URL-like value.
  for (const value of Object.values(cells)) {
    const text = asString(value);
    const m = text.match(URL_RE) ?? text.match(ARXIV_RE) ?? text.match(DOI_RE);
    if (m) return m[0];
  }
  return null;
}

/**
 * Detect a title in a row. Strategy:
 *  1. Prefer a cell whose header looks title-like.
 *  2. Otherwise pick the longest non-link text cell (titles tend to be the
 *     longest free text), ignoring obvious URLs and very short values.
 * Returns null if nothing suitable is found.
 */
export function detectTitle(cells: Cells): string | null {
  // Pass 1: header-hinted columns.
  for (const [key, value] of Object.entries(cells)) {
    const header = norm(key);
    if (TITLE_HEADER_HINTS.some((h) => header.includes(h))) {
      const text = asString(value);
      if (text.length > 0) return text;
    }
  }
  // Pass 2: longest non-URL text cell of reasonable length.
  let best: string | null = null;
  for (const value of Object.values(cells)) {
    const text = asString(value);
    if (text.length < 8) continue;
    if (URL_RE.test(text) || ARXIV_RE.test(text) || DOI_RE.test(text)) continue;
    if (!best || text.length > best.length) best = text;
  }
  return best;
}

/**
 * Whether a row is effectively empty (all cells blank). Blank rows are skipped
 * during import.
 */
export function isBlankRow(cells: Cells): boolean {
  return Object.values(cells).every((v) => asString(v).length === 0);
}

/**
 * Build a stable header list from a raw first row. Empty header cells become
 * "Column N" so no data is silently dropped.
 */
export function buildHeaders(firstRow: unknown[]): string[] {
  return firstRow.map((h, i) => {
    const text = asString(h);
    return text.length > 0 ? text : `Column ${i + 1}`;
  });
}

/**
 * Decide whether the first row looks like a HEADER row (labels) vs. data.
 * Heuristic: a header row has mostly short, non-URL, non-numeric text cells.
 */
export function looksLikeHeaderRow(firstRow: unknown[]): boolean {
  const cells = firstRow.map(asString).filter((t) => t.length > 0);
  if (cells.length === 0) return false;
  let labelish = 0;
  for (const c of cells) {
    const isUrl = URL_RE.test(c);
    const isNumeric = /^\d+(\.\d+)?$/.test(c);
    const isShort = c.length <= 40;
    if (!isUrl && !isNumeric && isShort) labelish++;
  }
  // Majority of non-empty cells look like labels.
  return labelish >= Math.ceil(cells.length * 0.6);
}
