import ExcelJS from "exceljs";

const VBA_PROJECT_MARKER = Buffer.from("xl/vbaProject.bin", "ascii");

/**
 * .xlsm (macro-enabled) is the same zip/OOXML container as .xlsx, just with
 * a VBA project part added. That part's zip entry name is stored as plain
 * ASCII in the archive regardless of compression, so a raw byte search is
 * enough to reject it (CLAUDE.md: "reject macro-enabled Excel files").
 */
export function isMacroEnabledWorkbook(buffer: Buffer): boolean {
  return buffer.includes(VBA_PROJECT_MARKER);
}

/**
 * Cell values only -- never a formula's source text, a hyperlink's target
 * URL, or anything else that isn't the plain value a person would read in
 * the cell (SPEC.md: "never formulas, macros or links").
 */
function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);

  if ("error" in value) return "";
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("hyperlink" in value) return typeof value.text === "string" ? value.text : "";
  if ("result" in value || "formula" in value || "sharedFormula" in value) {
    return cellToText(
      (value as ExcelJS.CellFormulaValue | ExcelJS.CellSharedFormulaValue)
        .result as ExcelJS.CellValue,
    );
  }
  return "";
}

export type ParsedExcel = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Reads only the first sheet (SPEC.md: "only the first sheet's cell values are read"). */
export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { headers: [], rows: [] };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToText(cell.value).trim();
  });

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;

    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const text = cellToText(row.getCell(index + 1).value);
      record[header] = text;
      if (text) hasValue = true;
    });

    if (hasValue) rows.push(record);
  }

  return { headers: headers.filter(Boolean), rows };
}
