import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildAuthUrl } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // The user's own id is enough state to tie the callback back to them;
  // the callback re-checks the live session regardless.
  const url = buildAuthUrl(user.id);
  return NextResponse.redirect(url);
}
