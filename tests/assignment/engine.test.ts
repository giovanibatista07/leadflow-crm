import { describe, expect, it } from "vitest";
import { distributeRoundRobin, groupByAssignee, pickLeastLoaded } from "@/lib/assignment/engine";

describe("pickLeastLoaded", () => {
  it("returns null for no candidates", () => {
    expect(pickLeastLoaded([])).toBeNull();
  });

  it("picks the candidate with the lowest count", () => {
    const result = pickLeastLoaded([
      { id: "a", count: 3 },
      { id: "b", count: 1 },
      { id: "c", count: 2 },
    ]);
    expect(result).toBe("b");
  });

  it("breaks ties by id", () => {
    const result = pickLeastLoaded([
      { id: "z", count: 1 },
      { id: "a", count: 1 },
    ]);
    expect(result).toBe("a");
  });
});

describe("distributeRoundRobin", () => {
  it("returns an empty map with no candidates", () => {
    expect(distributeRoundRobin(["lead1"], []).size).toBe(0);
  });

  it("spreads leads evenly across advisors starting from zero load", () => {
    const assignments = distributeRoundRobin(
      ["l1", "l2", "l3", "l4"],
      [
        { id: "a", count: 0 },
        { id: "b", count: 0 },
      ],
    );
    const counts = new Map<string, number>();
    for (const advisorId of assignments.values()) {
      counts.set(advisorId, (counts.get(advisorId) ?? 0) + 1);
    }
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(2);
  });

  it("accounts for existing load so new leads go to the least-busy advisor first", () => {
    const assignments = distributeRoundRobin(
      ["l1", "l2"],
      [
        { id: "a", count: 5 },
        { id: "b", count: 0 },
      ],
    );
    // Both new leads should go to "b" before "a" catches up.
    expect(assignments.get("l1")).toBe("b");
    expect(assignments.get("l2")).toBe("b");
  });

  it("assigns one lead to each candidate in a single pass", () => {
    const assignments = distributeRoundRobin(
      ["l1", "l2", "l3"],
      [
        { id: "a", count: 0 },
        { id: "b", count: 0 },
        { id: "c", count: 0 },
      ],
    );
    expect(new Set(assignments.values()).size).toBe(3);
  });
});

describe("groupByAssignee", () => {
  it("groups lead ids by their assigned advisor", () => {
    const grouped = groupByAssignee(
      new Map([
        ["l1", "a"],
        ["l2", "a"],
        ["l3", "b"],
      ]),
    );
    expect(grouped.get("a")).toEqual(["l1", "l2"]);
    expect(grouped.get("b")).toEqual(["l3"]);
  });
});
