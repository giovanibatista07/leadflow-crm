import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { sweepDueSteps } from "@/lib/cadence/service";
import { sweepNotifications } from "@/lib/notifications/service";

/** Vercel Cron sends this on every invocation; see vercel.json for the 15-minute schedule. */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await sweepNotifications();
  const dueSteps = await sweepDueSteps();
  return NextResponse.json({ ...dueSteps, notifications });
}
