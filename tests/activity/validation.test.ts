import { describe, expect, it } from "vitest";
import { logActivitySchema } from "@/lib/validation/activity";

const leadId = "11111111-1111-4111-8111-111111111111";

describe("logActivitySchema", () => {
  it("accepts NO_ANSWER with no notes or scheduledAt", () => {
    const parsed = logActivitySchema.safeParse({ leadId, type: "CALL", outcome: "NO_ANSWER" });
    expect(parsed.success).toBe(true);
  });

  it("requires a reason for NOT_INTERESTED", () => {
    const parsed = logActivitySchema.safeParse({ leadId, type: "CALL", outcome: "NOT_INTERESTED" });
    expect(parsed.success).toBe(false);
  });

  it("accepts NOT_INTERESTED with a reason", () => {
    const parsed = logActivitySchema.safeParse({
      leadId,
      type: "CALL",
      outcome: "NOT_INTERESTED",
      notes: "Not in the market right now",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires a scheduled time for CALL_BACK_LATER", () => {
    const parsed = logActivitySchema.safeParse({ leadId, type: "CALL", outcome: "CALL_BACK_LATER" });
    expect(parsed.success).toBe(false);
  });

  it("accepts CALL_BACK_LATER with a scheduled time", () => {
    const parsed = logActivitySchema.safeParse({
      leadId,
      type: "CALL",
      outcome: "CALL_BACK_LATER",
      scheduledAt: "2026-02-01T14:30:00.000Z",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scheduledAt).toBeInstanceOf(Date);
    }
  });

  it("rejects an invalid outcome", () => {
    const parsed = logActivitySchema.safeParse({ leadId, type: "CALL", outcome: "GHOSTED" });
    expect(parsed.success).toBe(false);
  });
});
