import { describe, expect, it } from "vitest";
import { createCadenceStepSchema } from "@/lib/validation/cadence";

const base = {
  cadenceId: "11111111-1111-4111-8111-111111111111",
  order: "1",
  actionType: "EMAIL",
  assignedRoleId: "22222222-2222-4222-8222-222222222222",
};

describe("createCadenceStepSchema", () => {
  it("accepts a full step", () => {
    const parsed = createCadenceStepSchema.safeParse({
      ...base,
      waitDays: "2",
      defaultTime: "09:30",
      templateText: "Hi {{firstName}}",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.waitDays).toBe(2);
      expect(parsed.data.defaultTime).toBe("09:30");
    }
  });

  it("treats an empty waitDays as the end of the sequence (undefined)", () => {
    const parsed = createCadenceStepSchema.safeParse({ ...base, waitDays: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.waitDays).toBeUndefined();
    }
  });

  it("rejects a malformed default time", () => {
    const parsed = createCadenceStepSchema.safeParse({ ...base, defaultTime: "9am" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid action type", () => {
    const parsed = createCadenceStepSchema.safeParse({ ...base, actionType: "FAX" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a step order below 1", () => {
    const parsed = createCadenceStepSchema.safeParse({ ...base, order: "0" });
    expect(parsed.success).toBe(false);
  });
});
