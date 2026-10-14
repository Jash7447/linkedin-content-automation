import "server-only";

import * as XLSX from "xlsx";

import {
  buildHeaders,
  detectLink,
  detectTitle,
  isBlankRow,
  looksLikeHeaderRow,
  type Cells,
} from "@/lib/excel-detect";

export type ParsedPaperRow = {
  sheetName: string;
  rowNumber: number; // 1-based row number in the sheet (data row)
  rawCells: Cells;
  detectedTitle: string | null;
  detectedLink: string | null;
};

/**
 * Parse an .xlsx buffer into paper rows across all sheets. Tolerant of
 * loosely-structured sheets:
 *  - no fixed column names (headers detected, else "Column N"),
 *  - preserves sheet name + row number,
 *  - keeps every original cell in rawCells,
 *  - best-effort title/link detection (may be null).
 *
 * Blank rows are skipped. Returns an empty array if the workbook has no data.
 */
export function parseWorkbook(buffer: ArrayBuffer): ParsedPaperRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const out: ParsedPaperRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    // Array-of-arrays: raw grid, blank cells preserved as "".
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (grid.length === 0) continue;

    const firstRow = grid[0] ?? [];
    const hasHeader = looksLikeHeaderRow(firstRow);
    const headers = hasHeader
      ? buildHeaders(firstRow)
      : firstRow.map((_, i) => `Column ${i + 1}`);

    const dataStart = hasHeader ? 1 : 0;

    for (let r = dataStart; r < grid.length; r++) {
      const row = grid[r] ?? [];
      const cells: Cells = {};
      const width = Math.max(headers.length, row.length);
      for (let c = 0; c < width; c++) {
        const key = headers[c] ?? `Column ${c + 1}`;
        cells[key] = row[c] ?? "";
      }

      if (isBlankRow(cells)) continue;

      out.push({
        sheetName,
        // Report the spreadsheet row number (1-based, counting the header).
        rowNumber: r + 1,
        rawCells: cells,
        detectedTitle: detectTitle(cells),
        detectedLink: detectLink(cells),
      });
    }
  }

  return out;
}
