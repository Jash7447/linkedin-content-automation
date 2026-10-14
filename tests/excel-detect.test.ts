import { describe, it, expect } from "vitest";

import {
  detectLink,
  detectTitle,
  isBlankRow,
  buildHeaders,
  looksLikeHeaderRow,
} from "@/lib/excel-detect";

describe("detectLink", () => {
  it("prefers a header-hinted URL column", () => {
    expect(
      detectLink({ Title: "A paper", URL: "https://arxiv.org/abs/1234.5678" }),
    ).toBe("https://arxiv.org/abs/1234.5678");
  });

  it("finds a URL in any cell when no header hint", () => {
    expect(detectLink({ a: "see https://example.com/x here" })).toBe(
      "https://example.com/x",
    );
  });

  it("detects a DOI", () => {
    expect(detectLink({ ref: "10.1145/1327452.1327492" })).toContain(
      "10.1145/1327452",
    );
  });

  it("returns null when there is no link", () => {
    expect(detectLink({ Title: "Just a title", Notes: "nothing here" })).toBeNull();
  });
});

describe("detectTitle", () => {
  it("prefers a header-hinted title column", () => {
    expect(
      detectTitle({ Title: "Dynamo: Amazon's KV Store", URL: "http://x.co" }),
    ).toBe("Dynamo: Amazon's KV Store");
  });

  it("falls back to the longest non-URL text cell", () => {
    expect(
      detectTitle({
        col1: "short",
        col2: "A reasonably long descriptive paper title here",
        col3: "https://example.com",
      }),
    ).toBe("A reasonably long descriptive paper title here");
  });

  it("returns null when nothing suitable exists", () => {
    expect(detectTitle({ a: "http://x.co", b: "12" })).toBeNull();
  });
});

describe("isBlankRow", () => {
  it("true for all-empty cells", () => {
    expect(isBlankRow({ a: "", b: "  ", c: null })).toBe(true);
  });
  it("false when any cell has content", () => {
    expect(isBlankRow({ a: "", b: "x" })).toBe(false);
  });
});

describe("buildHeaders", () => {
  it("keeps header text and fills blanks with Column N", () => {
    expect(buildHeaders(["Title", "", "URL"])).toEqual([
      "Title",
      "Column 2",
      "URL",
    ]);
  });
});

describe("looksLikeHeaderRow", () => {
  it("true for a row of short labels", () => {
    expect(looksLikeHeaderRow(["Title", "Authors", "Link", "Year"])).toBe(true);
  });
  it("false for a row containing a URL (data-like)", () => {
    expect(
      looksLikeHeaderRow(["Dynamo paper", "https://arxiv.org/abs/1", "2007"]),
    ).toBe(false);
  });
  it("false for an empty row", () => {
    expect(looksLikeHeaderRow(["", "", ""])).toBe(false);
  });
});
