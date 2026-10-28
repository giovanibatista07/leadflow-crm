import { describe, expect, it } from "vitest";
import { decideCalendarAction } from "@/lib/calendar/engine";

describe("decideCalendarAction", () => {
  it("books a new event for CALL_BACK_LATER with a scheduled time", () => {
    const start = new Date("2026-02-01T14:30:00.000Z");
    const action = decideCalendarAction("CALL_BACK_LATER", start, false);
    expect(action).toEqual({ kind: "upsert", start });
  });

  it("reschedules (upserts) even when an event already exists", () => {
    const start = new Date("2026-02-01T14:30:00.000Z");
    const action = decideCalendarAction("CALL_BACK_LATER", start, true);
    expect(action).toEqual({ kind: "upsert", start });
  });

  it("does nothing for CALL_BACK_LATER with no scheduled time", () => {
    expect(decideCalendarAction("CALL_BACK_LATER", undefined, false)).toEqual({ kind: "none" });
  });

  it("cancels an existing event when the lead is Qualified", () => {
    expect(decideCalendarAction("QUALIFIED", undefined, true)).toEqual({ kind: "cancel" });
  });

  it("cancels an existing event when the lead is marked not interested", () => {
    expect(decideCalendarAction("NOT_INTERESTED", undefined, true)).toEqual({ kind: "cancel" });
  });

  it("does nothing on Qualified/Not interested when there's no event to cancel", () => {
    expect(decideCalendarAction("QUALIFIED", undefined, false)).toEqual({ kind: "none" });
    expect(decideCalendarAction("NOT_INTERESTED", undefined, false)).toEqual({ kind: "none" });
  });

  it("does nothing for NO_ANSWER", () => {
    expect(decideCalendarAction("NO_ANSWER", undefined, true)).toEqual({ kind: "none" });
  });
});
