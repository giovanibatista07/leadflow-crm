export type ActivityOutcomeForCalendar = "NO_ANSWER" | "QUALIFIED" | "NOT_INTERESTED" | "CALL_BACK_LATER";

export type CalendarAction =
  | { kind: "none" }
  | { kind: "upsert"; start: Date }
  | { kind: "cancel" };

/**
 * Pure decision logic for SPEC.md's calendar sync: "Meetings and call-backs
 * booked in the CRM are created as calendar events... Rescheduling or
 * cancelling in the CRM updates the event." Only CALL_BACK_LATER books a
 * specific date/time in this app, so it's the only outcome that creates or
 * reschedules an event; moving the lead out of the active cadence cancels
 * whatever was booked.
 */
export function decideCalendarAction(
  outcome: ActivityOutcomeForCalendar,
  scheduledAt: Date | undefined,
  hasExistingEvent: boolean,
): CalendarAction {
  if (outcome === "CALL_BACK_LATER" && scheduledAt) {
    return { kind: "upsert", start: scheduledAt };
  }
  if ((outcome === "QUALIFIED" || outcome === "NOT_INTERESTED") && hasExistingEvent) {
    return { kind: "cancel" };
  }
  return { kind: "none" };
}
