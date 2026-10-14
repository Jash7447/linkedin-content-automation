/**
 * Lightweight, dependency-free Mermaid source validation.
 *
 * Used server-side BEFORE storing LLM-generated Mermaid, so we never persist
 * obviously-broken diagram source. This is a cheap structural sanity check,
 * not a full parse (the full `mermaid` parser is browser/DOM-oriented).
 * Authoritative validation happens client-side at render time via
 * `mermaid.parse()` before `mermaid.render()`.
 */

// Diagram type keywords Mermaid source may start with (first non-empty line).
const DIAGRAM_HEADERS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "quadrantChart",
  "gitGraph",
  "C4Context",
];

const MAX_MERMAID_CHARS = 4000;

export type MermaidCheck =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Structurally validate Mermaid source. Returns ok:false with a reason if the
 * source is empty, too long, or does not begin with a recognized diagram type.
 */
export function validateMermaidSource(source: string): MermaidCheck {
  const trimmed = source.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Mermaid source is empty." };
  }
  if (trimmed.length > MAX_MERMAID_CHARS) {
    return { ok: false, error: "Mermaid source is too long." };
  }

  // First meaningful line (skip blank lines and %% comments / init directives).
  const firstLine = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("%%"));

  if (!firstLine) {
    return { ok: false, error: "Mermaid source has no diagram declaration." };
  }

  const startsWithKnownHeader = DIAGRAM_HEADERS.some(
    (h) => firstLine === h || firstLine.startsWith(h + " ") || firstLine.startsWith(h + "\t"),
  );

  if (!startsWithKnownHeader) {
    return {
      ok: false,
      error: `Unrecognized Mermaid diagram type: "${firstLine.slice(0, 40)}".`,
    };
  }

  // Balanced brackets/parens as a cheap smoke test.
  const pairs: [string, string][] = [
    ["[", "]"],
    ["(", ")"],
    ["{", "}"],
  ];
  for (const [open, close] of pairs) {
    const opens = trimmed.split(open).length - 1;
    const closes = trimmed.split(close).length - 1;
    if (opens !== closes) {
      return {
        ok: false,
        error: `Unbalanced '${open}${close}' in Mermaid source.`,
      };
    }
  }

  return { ok: true };
}
