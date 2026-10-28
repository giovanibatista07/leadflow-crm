import type { Prisma } from "@/lib/generated/prisma/client";
import type { LeadFilters } from "@/lib/validation/search";

/**
 * Builds the Prisma where-clause for SPEC.md's search/filters, layered on
 * top of whatever visibility scoping the caller already applies (company,
 * own-leads, etc). Pure and independently testable -- the DB-touching
 * query itself lives in the page.
 */
export function buildLeadWhere(
  base: Prisma.LeadWhereInput,
  filters: LeadFilters,
): Prisma.LeadWhereInput {
  const clauses: Prisma.LeadWhereInput[] = [base];

  if (filters.q) {
    clauses.push({
      OR: [
        { firstName: { contains: filters.q, mode: "insensitive" } },
        { lastName: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q, mode: "insensitive" } },
        { sport: { contains: filters.q, mode: "insensitive" } },
        { position: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.status) {
    clauses.push({ status: filters.status });
  }
  if (filters.step != null) {
    clauses.push({ currentStep: filters.step });
  }
  if (filters.advisorId) {
    clauses.push({ assignedAdvisorId: filters.advisorId });
  }
  if (filters.closerId) {
    clauses.push({ assignedCloserId: filters.closerId });
  }
  if (filters.source) {
    clauses.push({ source: { contains: filters.source, mode: "insensitive" } });
  }
  if (filters.dueAfter) {
    const date = new Date(filters.dueAfter);
    if (!Number.isNaN(date.getTime())) {
      clauses.push({ nextDueAt: { gte: date } });
    }
  }
  if (filters.dueBefore) {
    const date = new Date(filters.dueBefore);
    if (!Number.isNaN(date.getTime())) {
      clauses.push({ nextDueAt: { lte: date } });
    }
  }

  return { AND: clauses };
}
