import { dedupeHeaders } from "@/lib/import/csv";

/** Accepts a full Google Sheets URL or a bare spreadsheet ID. */
export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(trimmed);
  if (urlMatch?.[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export type SheetData = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Converts a 2D values grid (first row = headers) into the shared import row shape. */
export function gridToRows(values: unknown[][]): SheetData {
  const headerRow = values[0] ?? [];
  const headers = dedupeHeaders(headerRow.map((cell) => String(cell ?? "").trim()));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < values.length; i++) {
    const rawRow = values[i] ?? [];
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const text = String(rawRow[index] ?? "").trim();
      record[header] = text;
      if (text) hasValue = true;
    });
    if (hasValue) rows.push(record);
  }

  return { headers: headers.filter(Boolean), rows };
}
