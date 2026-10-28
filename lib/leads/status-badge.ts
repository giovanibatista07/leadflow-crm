const STATUS_BADGE_CLASS: Record<string, string> = {
  NEW: "badge-slate",
  IN_SEQUENCE: "badge-brand",
  QUALIFIED: "badge-amber",
  WITH_CLOSER: "badge-amber",
  WON: "badge-green",
  LOST: "badge-red",
  UNRESPONSIVE: "badge-slate",
  DO_NOT_CONTACT: "badge-red",
};

export function statusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS[status] ?? "badge-slate";
}
