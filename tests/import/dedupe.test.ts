import { describe, expect, it } from "vitest";
import { dedupeRows, type DedupeInput } from "@/lib/import/dedupe";

function row(overrides: Partial<DedupeInput> = {}): DedupeInput {
  return {
    rowNumber: 1,
    firstName: "Jamie",
    lastName: "Rivera",
    email: "",
    phone: "",
    sport: "",
    position: "",
    location: "",
    notes: "",
    ...overrides,
  };
}

describe("dedupeRows", () => {
  it("inserts rows with no overlap", () => {
    const result = dedupeRows(
      [row({ rowNumber: 1, email: "a@example.com" }), row({ rowNumber: 2, email: "b@example.com" })],
      new Set(),
      new Set(),
    );
    expect(result.toInsert).toHaveLength(2);
    expect(result.duplicateInFile).toHaveLength(0);
    expect(result.duplicateInDb).toHaveLength(0);
  });

  it("flags a row whose email already exists in the database", () => {
    const result = dedupeRows(
      [row({ rowNumber: 1, email: "existing@example.com" })],
      new Set(["existing@example.com"]),
      new Set(),
    );
    expect(result.toInsert).toHaveLength(0);
    expect(result.duplicateInDb).toHaveLength(1);
  });

  it("flags a row whose phone already exists in the database", () => {
    const result = dedupeRows(
      [row({ rowNumber: 1, phone: "555-0101" })],
      new Set(),
      new Set(["555-0101"]),
    );
    expect(result.duplicateInDb).toHaveLength(1);
  });

  it("flags the second occurrence of a duplicate email within the file, keeping the first", () => {
    const result = dedupeRows(
      [
        row({ rowNumber: 1, email: "same@example.com" }),
        row({ rowNumber: 2, email: "same@example.com" }),
      ],
      new Set(),
      new Set(),
    );
    expect(result.toInsert).toHaveLength(1);
    expect(result.toInsert[0]?.rowNumber).toBe(1);
    expect(result.duplicateInFile).toHaveLength(1);
    expect(result.duplicateInFile[0]?.rowNumber).toBe(2);
  });

  it("is case-insensitive and trims whitespace when matching email", () => {
    const result = dedupeRows(
      [row({ rowNumber: 1, email: "  Same@Example.com  " })],
      new Set(["same@example.com"]),
      new Set(),
    );
    expect(result.duplicateInDb).toHaveLength(1);
  });

  it("database duplicates take priority over in-file duplicates", () => {
    const result = dedupeRows(
      [
        row({ rowNumber: 1, email: "dup@example.com" }),
        row({ rowNumber: 2, email: "dup@example.com" }),
      ],
      new Set(["dup@example.com"]),
      new Set(),
    );
    expect(result.duplicateInDb).toHaveLength(2);
    expect(result.duplicateInFile).toHaveLength(0);
  });
});
