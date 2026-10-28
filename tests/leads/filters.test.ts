import { describe, expect, it } from "vitest";
import { buildLeadWhere } from "@/lib/leads/filters";

const base = { companyId: "company-1" };

describe("buildLeadWhere", () => {
  it("returns just the base scope when no filters are set", () => {
    const where = buildLeadWhere(base, {});
    expect(where).toEqual({ AND: [base] });
  });

  it("adds a case-insensitive OR search across name/email/phone/sport/position", () => {
    const where = buildLeadWhere(base, { q: "jamie" });
    expect(where).toEqual({
      AND: [
        base,
        {
          OR: [
            { firstName: { contains: "jamie", mode: "insensitive" } },
            { lastName: { contains: "jamie", mode: "insensitive" } },
            { email: { contains: "jamie", mode: "insensitive" } },
            { phone: { contains: "jamie", mode: "insensitive" } },
            { sport: { contains: "jamie", mode: "insensitive" } },
            { position: { contains: "jamie", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("filters by status, step, advisor, closer and source together", () => {
    const where = buildLeadWhere(base, {
      status: "IN_SEQUENCE",
      step: 2,
      advisorId: "advisor-1",
      closerId: "closer-1",
      source: "Indeed",
    });
    expect(where).toEqual({
      AND: [
        base,
        { status: "IN_SEQUENCE" },
        { currentStep: 2 },
        { assignedAdvisorId: "advisor-1" },
        { assignedCloserId: "closer-1" },
        { source: { contains: "Indeed", mode: "insensitive" } },
      ],
    });
  });

  it("filters by a due-date range", () => {
    const where = buildLeadWhere(base, {
      dueAfter: "2026-01-01",
      dueBefore: "2026-01-31",
    });
    expect(where).toEqual({
      AND: [base, { nextDueAt: { gte: new Date("2026-01-01") } }, { nextDueAt: { lte: new Date("2026-01-31") } }],
    });
  });

  it("ignores an unparseable due date instead of throwing", () => {
    const where = buildLeadWhere(base, { dueAfter: "not-a-date" });
    expect(where).toEqual({ AND: [base] });
  });
});
