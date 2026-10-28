import { NextResponse } from "next/server";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * TEMPORARY -- diagnosing the production-only "Prisma Client could not
 * locate the Query Engine" crash (signup/#28-#31). Lists what's actually
 * on disk in each location Prisma's own error message says it searched,
 * so the next fix is based on the real deployed filesystem instead of
 * another guess. Delete this route once the real fix is confirmed.
 *
 * Returns only directory listings (filenames), never file contents or
 * env var values.
 */
function listDir(dir: string): string[] | string {
  try {
    return readdirSync(dir);
  } catch (e) {
    return `ERROR: ${(e as Error).message}`;
  }
}

export async function GET() {
  const candidates = [
    process.cwd(),
    path.join(process.cwd(), "lib", "generated", "prisma"),
    path.join(process.cwd(), ".next", "server", "chunks"),
    "/vercel/path0",
    "/vercel/path0/lib/generated",
    "/vercel/path0/lib/generated/prisma",
    "/var/task",
    "/var/task/.next/server/chunks",
    __dirname,
  ];

  const result: Record<string, string[] | string> = {};
  for (const dir of candidates) {
    result[dir] = existsSync(dir) ? listDir(dir) : "DOES NOT EXIST";
  }

  return NextResponse.json({ cwd: process.cwd(), dirname: __dirname, result });
}
