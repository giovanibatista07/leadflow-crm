import { describe, expect, it } from "vitest";
import { extractSpreadsheetId, gridToRows } from "@/lib/google/sheets-parse";

describe("extractSpreadsheetId", () => {
  it("extracts the ID from a full Sheets URL", () => {
    const id = extractSpreadsheetId(
      "https://docs.google.com/spreadsheets/d/1AbCDeFGhiJKlmnOPQrstuVWXyz12345678/edit#gid=0",
    );
    expect(id).toBe("1AbCDeFGhiJKlmnOPQrstuVWXyz12345678");
  });

  it("accepts a bare spreadsheet ID", () => {
    const id = extractSpreadsheetId("1AbCDeFGhiJKlmnOPQrstuVWXyz12345678");
    expect(id).toBe("1AbCDeFGhiJKlmnOPQrstuVWXyz12345678");
  });

  it("rejects something that is neither", () => {
    expect(extractSpreadsheetId("not a sheet link")).toBeNull();
  });
});

describe("gridToRows", () => {
  it("converts a values grid into headers + row records", () => {
    const result = gridToRows([
      ["First Name", "Email"],
      ["Jamie", "jamie@example.com"],
    ]);
    expect(result.headers).toEqual(["First Name", "Email"]);
    expect(result.rows).toEqual([{ "First Name": "Jamie", Email: "jamie@example.com" }]);
  });

  it("skips rows that are entirely empty", () => {
    const result = gridToRows([["First Name"], ["Jamie"], [], ["Morgan"]]);
    expect(result.rows).toHaveLength(2);
  });

  it("handles a short row missing trailing cells", () => {
    const result = gridToRows([
      ["First Name", "Email"],
      ["Jamie"],
    ]);
    expect(result.rows).toEqual([{ "First Name": "Jamie", Email: "" }]);
  });
});
