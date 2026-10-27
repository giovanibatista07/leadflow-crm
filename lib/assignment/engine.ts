export type LoadCandidate = { id: string; count: number };

/**
 * Load-based round robin (SPEC.md "spread leads evenly across active
 * advisors"): always hands the next lead to whoever currently has the
 * fewest, rather than a blind cursor that drifts out of balance when
 * advisors are added, removed, or reactivated. Ties break on id so the
 * result is deterministic.
 */
export function pickLeastLoaded(candidates: LoadCandidate[]): string | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) =>
    c.count < best.count || (c.count === best.count && c.id < best.id) ? c : best,
  ).id;
}

/** Distributes leadIds across candidates evenly, honoring each candidate's starting load. */
export function distributeRoundRobin(
  leadIds: string[],
  candidates: LoadCandidate[],
): Map<string, string> {
  const assignments = new Map<string, string>();
  if (candidates.length === 0) return assignments;

  const counts = new Map(candidates.map((c) => [c.id, c.count]));
  for (const leadId of leadIds) {
    const current = candidates.map((c) => ({ id: c.id, count: counts.get(c.id) ?? 0 }));
    const chosen = pickLeastLoaded(current);
    if (!chosen) continue;
    assignments.set(leadId, chosen);
    counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
  }
  return assignments;
}

/** Groups a leadId -> assigneeId map the other way, for one updateMany per assignee. */
export function groupByAssignee(assignments: Map<string, string>): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const [leadId, assigneeId] of assignments) {
    const existing = grouped.get(assigneeId);
    if (existing) {
      existing.push(leadId);
    } else {
      grouped.set(assigneeId, [leadId]);
    }
  }
  return grouped;
}
