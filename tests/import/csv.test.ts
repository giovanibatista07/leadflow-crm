import { describe, expect, it } from "vitest";
import {
  applyMapping,
  dedupeHeaders,
  escapeFormulaInjection,
  MAX_IMPORT_FILE_BYTES,
  normalizeHeader,
  parseDelimitedText,
  sniffImportFile,
  splitFullName,
  suggestMapping,
} from "@/lib/import/csv";

describe("splitFullName", () => {
  it("splits on the first space", () => {
    expect(splitFullName("Jamie Rivera")).toEqual({ firstName: "Jamie", lastName: "Rivera" });
  });

  it("puts the remainder in lastName for a multi-word name", () => {
    expect(splitFullName("Mary Jane Watson")).toEqual({
      firstName: "Mary",
      lastName: "Jane Watson",
    });
  });

  it("repeats a single word as both first and last name", () => {
    expect(splitFullName("Cher")).toEqual({ firstName: "Cher", lastName: "Cher" });
  });

  it("trims and collapses extra whitespace", () => {
    expect(splitFullName("  Jamie   Rivera  ")).toEqual({ firstName: "Jamie", lastName: "Rivera" });
  });
});

describe("dedupeHeaders", () => {
  it("leaves unique headers unchanged", () => {
    expect(dedupeHeaders(["Name", "Email"])).toEqual(["Name", "Email"]);
  });

  it("suffixes repeated headers so every name is unique", () => {
    expect(dedupeHeaders(["Instagram Leads", "Email", "Instagram Leads"])).toEqual([
      "Instagram Leads",
      "Email",
      "Instagram Leads (2)",
    ]);
  });

  it("handles three or more repeats", () => {
    expect(dedupeHeaders(["A", "A", "A"])).toEqual(["A", "A (2)", "A (3)"]);
  });
});

describe("parseDelimitedText with duplicate headers", () => {
  it("keeps both columns' data instead of the second overwriting the first", () => {
    const { headers, rows } = parseDelimitedText(
      "first_name,Instagram Leads,Instagram Leads\nJamie,handle1,handle2\n",
    );
    expect(headers).toEqual(["first_name", "Instagram Leads", "Instagram Leads (2)"]);
    expect(rows[0]).toEqual({
      first_name: "Jamie",
      "Instagram Leads": "handle1",
      "Instagram Leads (2)": "handle2",
    });
  });
});

describe("sniffImportFile", () => {
  it("rejects an empty file", () => {
    const result = sniffImportFile(Buffer.from(""));
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = sniffImportFile(Buffer.alloc(MAX_IMPORT_FILE_BYTES + 1, "a"));
    expect(result.ok).toBe(false);
  });

  it("recognizes a zip/xlsx file by its PK magic bytes as a candidate .xlsx", () => {
    const result = sniffImportFile(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(result).toEqual({ ok: true, kind: "xlsx" });
  });

  it("rejects a legacy .xls file by its OLE2 magic bytes", () => {
    const result = sniffImportFile(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    expect(result.ok).toBe(false);
  });

  it("rejects binary data containing null bytes", () => {
    const result = sniffImportFile(Buffer.from([0x61, 0x00, 0x62]));
    expect(result.ok).toBe(false);
  });

  it("accepts plain CSV text", () => {
    const result = sniffImportFile(Buffer.from("first_name,last_name\nJamie,Rivera\n"));
    expect(result).toEqual({ ok: true, kind: "text" });
  });

  it("accepts plain TSV text", () => {
    const result = sniffImportFile(Buffer.from("first_name\tlast_name\nJamie\tRivera\n"));
    expect(result).toEqual({ ok: true, kind: "text" });
  });
});

describe("escapeFormulaInjection", () => {
  it.each(["=SUM(A1:A2)", "+1234", "-1234", "@mention"])(
    "prefixes a value starting with a formula character: %s",
    (value) => {
      expect(escapeFormulaInjection(value)).toBe(`'${value}`);
    },
  );

  it("leaves ordinary text untouched", () => {
    expect(escapeFormulaInjection("Jamie Rivera")).toBe("Jamie Rivera");
  });
});

describe("normalizeHeader", () => {
  it("lowercases and strips non-alphanumeric characters", () => {
    expect(normalizeHeader(" First Name ")).toBe("firstname");
    expect(normalizeHeader("E-Mail")).toBe("email");
  });
});

describe("suggestMapping", () => {
  it("matches common header variants to lead fields", () => {
    const mapping = suggestMapping(["First Name", "Last Name", "E-Mail", "Phone Number"]);
    expect(mapping.firstName).toBe("First Name");
    expect(mapping.lastName).toBe("Last Name");
    expect(mapping.email).toBe("E-Mail");
    expect(mapping.phone).toBe("Phone Number");
  });

  it("leaves a field unmapped when no header matches", () => {
    const mapping = suggestMapping(["Something Unrelated"]);
    expect(mapping.firstName).toBeUndefined();
  });
});

describe("parseDelimitedText", () => {
  it("parses headers and rows", () => {
    const { headers, rows, errors } = parseDelimitedText(
      "first_name,last_name,email\nJamie,Rivera,jamie@example.com\n",
    );
    expect(headers).toEqual(["first_name", "last_name", "email"]);
    expect(rows).toEqual([{ first_name: "Jamie", last_name: "Rivera", email: "jamie@example.com" }]);
    expect(errors).toEqual([]);
  });

  it("skips empty lines", () => {
    const { rows } = parseDelimitedText("a,b\n1,2\n\n3,4\n");
    expect(rows).toHaveLength(2);
  });
});

describe("applyMapping", () => {
  it("extracts mapped columns and trims values", () => {
    const row = { "First Name": " Jamie ", "E-Mail": "jamie@example.com" };
    const mapped = applyMapping(row, { firstName: "First Name", email: "E-Mail" });
    expect(mapped.firstName).toBe("Jamie");
    expect(mapped.email).toBe("jamie@example.com");
    expect(mapped.phone).toBe("");
  });

  it("splits a mapped Full name column into first/last", () => {
    const row = { Name: "Jamie Rivera", Email: "jamie@example.com" };
    const mapped = applyMapping(row, { fullName: "Name", email: "Email" });
    expect(mapped.firstName).toBe("Jamie");
    expect(mapped.lastName).toBe("Rivera");
  });

  it("prefers fullName over individually mapped first/last columns", () => {
    const row = { Name: "Jamie Rivera", "First Name": "Ignored" };
    const mapped = applyMapping(row, { fullName: "Name", firstName: "First Name" });
    expect(mapped.firstName).toBe("Jamie");
  });

  it("returns an empty string for an unmapped field", () => {
    const mapped = applyMapping({ a: "1" }, {});
    expect(mapped.notes).toBe("");
  });
});
