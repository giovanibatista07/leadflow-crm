import { describe, expect, it } from "vitest";
import { parseLeadFilters } from "@/lib/validation/search";

describe("parseLeadFilters", () => {
  it("drops empty-string params", () => {
    expect(parseLeadFilters({ q: "", status: undefined })).toEqual({});
  });

  it("keeps valid values", () => {
    expect(parseLeadFilters({ q: "jamie", status: "QUALIFIED" })).toEqual({
      q: "jamie",
      status: "QUALIFIED",
    });
  });

  it("drops an invalid status rather than throwing", () => {
    expect(parseLeadFilters({ status: "NOT_A_STATUS" })).toEqual({});
  });

  it("coerces step to a number", () => {
    expect(parseLeadFilters({ step: "3" })).toEqual({ step: 3 });
  });

  it("drops only the invalid field, keeping the rest", () => {
    expect(parseLeadFilters({ q: "jamie", status: "NOT_A_STATUS" })).toEqual({ q: "jamie" });
  });
});
