"use client";

import { useEffect, useId, useState } from "react";

/**
 * Client-side Mermaid renderer. Validates by actually parsing/rendering via
 * the mermaid library; on any error it falls back to showing the raw source
 * (never throws into the page). Mermaid is imported dynamically so it stays
 * out of the server bundle.
 */
export default function MermaidDiagram({ source }: { source: string }) {
  const id = useId().replace(/:/g, "_");
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        // parse() throws on invalid source.
        await mermaid.parse(source);
        const { svg } = await mermaid.render(`m_${id}`, source);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  if (failed) {
    return (
      <pre className="mermaid-fallback" aria-label="Diagram source">
        {source}
      </pre>
    );
  }

  if (!svg) {
    return <p className="mermaid-loading">Rendering diagram…</p>;
  }

  // svg is produced by mermaid from our own validated source.
  return (
    <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
