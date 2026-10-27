export type CadenceStepLike = { order: number; waitDays: number | null };

/** The next step's order, or null when `fromOrder` is the last step (end of sequence). */
export function getNextStepOrder(steps: CadenceStepLike[], fromOrder: number): number | null {
  const next = steps.find((s) => s.order === fromOrder + 1);
  return next ? next.order : null;
}

/** A lead is on its cadence's last step when no step follows it. */
export function isLastStep(steps: CadenceStepLike[], order: number): boolean {
  return getNextStepOrder(steps, order) === null;
}

/** `waitDays` is the wait *before* the next step; null means there is no next step to schedule. */
export function computeDueDate(from: Date, waitDays: number | null): Date | null {
  if (waitDays == null) return null;
  const due = new Date(from);
  due.setDate(due.getDate() + waitDays);
  return due;
}
