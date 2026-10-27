import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { isMacroEnabledWorkbook, parseExcelBuffer } from "@/lib/import/excel";

describe("isMacroEnabledWorkbook", () => {
  it("detects the vbaProject.bin zip entry name", () => {
    const buffer = Buffer.concat([
      Buffer.from("PK"),
      Buffer.from("...xl/vbaProject.bin..."),
    ]);
    expect(isMacroEnabledWorkbook(buffer)).toBe(true);
  });

  it("is false for a buffer without that marker", () => {
    const buffer = Buffer.from("PK...xl/worksheets/sheet1.xml...");
    expect(isMacroEnabledWorkbook(buffer)).toBe(false);
  });
});

async function buildWorkbookBuffer(
  fill: (sheet: ExcelJS.Worksheet) => void,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");
  fill(sheet);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parseExcelBuffer", () => {
  it("reads headers and plain values from the first sheet", async () => {
    const buffer = await buildWorkbookBuffer((sheet) => {
      sheet.addRow(["first_name", "last_name", "email"]);
      sheet.addRow(["Jamie", "Rivera", "jamie@example.com"]);
    });

    const result = await parseExcelBuffer(buffer);
    expect(result.headers).toEqual(["first_name", "last_name", "email"]);
    expect(result.rows).toEqual([
      { first_name: "Jamie", last_name: "Rivera", email: "jamie@example.com" },
    ]);
  });

  it("reads a formula cell's cached result, never the formula text", async () => {
    const buffer = await buildWorkbookBuffer((sheet) => {
      sheet.addRow(["notes"]);
      sheet.getCell("A2").value = { formula: "1+1", result: "computed-result" };
    });

    const result = await parseExcelBuffer(buffer);
    expect(result.rows[0]?.notes).toBe("computed-result");
  });

  it("reads a hyperlink cell's display text, never the link target", async () => {
    const buffer = await buildWorkbookBuffer((sheet) => {
      sheet.addRow(["notes"]);
      sheet.getCell("A2").value = { text: "Visible label", hyperlink: "https://evil.example" };
    });

    const result = await parseExcelBuffer(buffer);
    expect(result.rows[0]?.notes).toBe("Visible label");
  });

  it("skips rows that are entirely empty", async () => {
    const buffer = await buildWorkbookBuffer((sheet) => {
      sheet.addRow(["first_name"]);
      sheet.addRow(["Jamie"]);
      sheet.addRow([]);
      sheet.addRow(["Morgan"]);
    });

    const result = await parseExcelBuffer(buffer);
    expect(result.rows).toHaveLength(2);
  });

  it("only reads the first sheet", async () => {
    const workbook = new ExcelJS.Workbook();
    const first = workbook.addWorksheet("First");
    first.addRow(["first_name"]);
    first.addRow(["Jamie"]);
    const second = workbook.addWorksheet("Second");
    second.addRow(["first_name"]);
    second.addRow(["ShouldNotAppear"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await parseExcelBuffer(buffer);
    expect(result.rows).toEqual([{ first_name: "Jamie" }]);
  });
});
