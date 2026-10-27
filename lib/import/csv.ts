import Papa from "papaparse";

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMPORT_ROWS = 5000;

export const LEAD_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "sport",
  "position",
  "location",
  "notes",
] as const;

export type LeadField = (typeof LEAD_FIELDS)[number];

export type ColumnMapping = Partial<Record<LeadField, string>>;

export type ImportFileKind = "xlsx" | "text";

export type SniffResult = { ok: true; kind: ImportFileKind } | { ok: false; reason: string };

/**
 * Checked by content, not extension (CLAUDE.md). A zip/OOXML file ("PK"
 * local file header) is treated as a candidate .xlsx -- the caller still
 * needs to reject it if it turns out to be macro-enabled. A legacy .xls
 * (OLE2 signature) isn't supported: ExcelJS, the library CLAUDE.md
 * specifies, can only read the modern .xlsx format. Anything else must be
 * plain CSV/TSV text; genuinely binary data contains null bytes that text
 * never would.
 */
export function sniffImportFile(buffer: Buffer): SniffResult {
  if (buffer.length === 0) {
    return { ok: false, reason: "The file is empty" };
  }
  if (buffer.length > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, reason: `File is larger than the ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB limit` };
  }

  const head = buffer.subarray(0, 8);
  if (head[0] === 0x50 && head[1] === 0x4b) {
    return { ok: true, kind: "xlsx" };
  }
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) {
    return {
      ok: false,
      reason: "Legacy .xls files aren't supported -- please save as .xlsx, .csv or .tsv",
    };
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  if (sample.includes(0)) {
    return { ok: false, reason: "This file contains binary data, not plain text, CSV/TSV or .xlsx" };
  }

  return { ok: true, kind: "text" };
}

/** Prevents formula injection (CLAUDE.md): a leading =, +, - or @ opens a formula in spreadsheet apps. */
export function escapeFormulaInjection(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_SUGGESTIONS: Record<LeadField, string[]> = {
  firstName: ["firstname", "first", "fname"],
  lastName: ["lastname", "last", "lname", "surname"],
  email: ["email", "emailaddress", "e-mail"],
  phone: ["phone", "phonenumber", "mobile", "cell", "telephone"],
  sport: ["sport"],
  position: ["position", "role", "title"],
  location: ["location", "city", "address"],
  notes: ["notes", "note", "comment", "comments"],
};

/** Best-effort header -> field guesses, shown as defaults on the mapping screen. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of LEAD_FIELDS) {
    const candidates = HEADER_SUGGESTIONS[field];
    const match = headers.find((h) => candidates.includes(normalizeHeader(h)));
    if (match) {
      mapping[field] = match;
    }
  }
  return mapping;
}

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
  delimiter: string;
};

export function parseDelimitedText(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.map((e) => `Row ${e.row ?? "?"}: ${e.message}`),
    delimiter: result.meta.delimiter,
  };
}

export type MappedLeadRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sport: string;
  position: string;
  location: string;
  notes: string;
};

export function applyMapping(row: Record<string, string>, mapping: ColumnMapping): MappedLeadRow {
  const get = (field: LeadField) => {
    const column = mapping[field];
    return column ? (row[column] ?? "").trim() : "";
  };

  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    email: get("email"),
    phone: get("phone"),
    sport: get("sport"),
    position: get("position"),
    location: get("location"),
    notes: get("notes"),
  };
}
