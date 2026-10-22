import { Client } from "pg";

// RLS can only be exercised with a real Postgres connection, as a non-owner,
// non-superuser role -- Prisma Client / the Prisma query engine isn't
// involved here on purpose.

export function adminClient() {
  return new Client({ connectionString: process.env.DATABASE_URL });
}

/**
 * Runs `fn` as a simulated end-user: switches the session to the
 * `authenticated` role and sets `auth.uid()` to `userId`, matching how
 * Supabase's Postgres connection behaves for a logged-in request.
 */
export async function asUser<T>(
  client: Client,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return await fn();
  } finally {
    await client.query("rollback");
  }
}
