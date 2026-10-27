import "server-only";
import { prisma } from "@/lib/db";
import { createOAuthClient } from "./oauth";
import { decryptTokens, encryptTokens } from "./crypto";

type StoredTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

/** Returns a live access token for the user's connected Google account, refreshing if expired. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.googleConnection.findUnique({ where: { userId } });
  if (!connection) return null;

  const tokens: StoredTokens = JSON.parse(decryptTokens(connection.encryptedTokens));

  const isExpired = !tokens.expiry_date || tokens.expiry_date < Date.now() + 60_000;
  if (!isExpired && tokens.access_token) {
    return tokens.access_token;
  }
  if (!tokens.refresh_token) {
    return null;
  }

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: tokens.refresh_token });
  const { credentials } = await client.refreshAccessToken();

  const merged: StoredTokens = { ...tokens, ...credentials };
  await prisma.googleConnection.update({
    where: { userId },
    data: { encryptedTokens: encryptTokens(JSON.stringify(merged)) },
  });

  return merged.access_token ?? null;
}
