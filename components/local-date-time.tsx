"use client";

/**
 * Renders a UTC-stored date in the viewer's own time zone (CLAUDE.md:
 * "Store dates in UTC; show them in the user's time zone"). Must run
 * client-side -- formatting on the server would use the server's zone,
 * not the person actually looking at the page.
 */
export function LocalDateTime({ iso }: { iso: string | Date }) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return <span>{date.toLocaleString()}</span>;
}
