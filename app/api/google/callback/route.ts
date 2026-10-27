import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createOAuthClient, GOOGLE_SHEETS_SCOPES } from "@/lib/google/oauth";
import { encryptTokens } from "@/lib/google/crypto";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/import?google=error", request.url));
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    await prisma.googleConnection.upsert({
      where: { userId: user.id },
      create: {
        companyId: user.companyId,
        userId: user.id,
        scopes: GOOGLE_SHEETS_SCOPES,
        encryptedTokens: encryptTokens(JSON.stringify(tokens)),
      },
      update: {
        scopes: GOOGLE_SHEETS_SCOPES,
        encryptedTokens: encryptTokens(JSON.stringify(tokens)),
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "google_connected",
        targetType: "google_connection",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/import?google=error", request.url));
  }

  return NextResponse.redirect(new URL("/import?google=connected", request.url));
}
