import { describe, it, expect } from "vitest";

import { validateMermaidSource } from "@/lib/mermaid";

describe("validateMermaidSource", () => {
  it("accepts a simple flowchart", () => {
    expect(validateMermaidSource("flowchart TD\n A --> B").ok).toBe(true);
  });

  it("accepts graph LR", () => {
    expect(validateMermaidSource("graph LR\n A-->B").ok).toBe(true);
  });

  it("accepts a sequenceDiagram", () => {
    expect(
      validateMermaidSource("sequenceDiagram\n Alice->>Bob: hi").ok,
    ).toBe(true);
  });

  it("skips leading comments/blank lines before the header", () => {
    const src = "%% a comment\n\nflowchart TD\n A --> B";
    expect(validateMermaidSource(src).ok).toBe(true);
  });

  it("rejects empty source", () => {
    const r = validateMermaidSource("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);
  });

  it("rejects an unrecognized diagram type", () => {
    const r = validateMermaidSource("notadiagram foo\n A --> B");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unrecognized/i);
  });

  it("rejects unbalanced brackets", () => {
    const r = validateMermaidSource("flowchart TD\n A[Start --> B");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unbalanced/i);
  });

  it("rejects source exceeding the max length", () => {
    const huge = "flowchart TD\n" + "A-->B\n".repeat(2000);
    const r = validateMermaidSource(huge);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/i);
  });

  it("rejects source with no diagram declaration (only comments)", () => {
    const r = validateMermaidSource("%% only a comment");
    expect(r.ok).toBe(false);
  });
});
