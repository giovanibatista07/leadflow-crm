import path from "node:path";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Vercel-specific Prisma bug, confirmed via a temporary diagnostic route:
// the generated client bakes in an absolute `output` path computed at
// BUILD time (Vercel's build container uses /vercel/path0/...), but the
// deployed function actually runs from a different absolute path
// (/var/task/...). Every location Prisma's own engine-binary search
// tries is wrong as a result, even though the binary is correctly bundled
// and sitting right there at <cwd>/lib/generated/prisma/. Setting this
// env var skips Prisma's own (broken) search entirely -- it's checked
// first, before any path-guessing runs. Only applies on Vercel; local
// dev (Windows, no PRISMA_QUERY_ENGINE_LIBRARY set) keeps working as-is.
if (process.env.VERCEL && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    process.cwd(),
    "lib/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node",
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
