import { describe, expect, it } from "vitest";
import { computeDueDate, getNextStepOrder, isLastStep } from "@/lib/cadence/engine";

const steps = [
  { order: 1, waitDays: 1 },
  { order: 2, waitDays: 1 },
  { order: 3, waitDays: null },
];

describe("getNextStepOrder", () => {
  it("returns the following step's order", () => {
    expect(getNextStepOrder(steps, 1)).toBe(2);
  });

  it("returns null past the last step", () => {
    expect(getNextStepOrder(steps, 3)).toBeNull();
  });

  it("returns null for a gap in step numbering", () => {
    expect(getNextStepOrder(steps, 5)).toBeNull();
  });
});

describe("isLastStep", () => {
  it("is false for a step with a follow-up", () => {
    expect(isLastStep(steps, 2)).toBe(false);
  });

  it("is true for the final step", () => {
    expect(isLastStep(steps, 3)).toBe(true);
  });
});

describe("computeDueDate", () => {
  it("adds waitDays to the given date", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const due = computeDueDate(from, 2);
    expect(due?.toISOString()).toBe("2026-01-03T00:00:00.000Z");
  });

  it("returns null when there's no wait (end of sequence)", () => {
    expect(computeDueDate(new Date(), null)).toBeNull();
  });

  it("returns the same date for a zero-day wait", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(computeDueDate(from, 0)?.toISOString()).toBe(from.toISOString());
  });
});
