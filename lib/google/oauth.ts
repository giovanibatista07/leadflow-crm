import "server-only";
import { google } from "googleapis";

// Narrowest scopes (CLAUDE.md): drive.file only grants access to files the
// user explicitly opens/creates through this app, never their whole Drive.
export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function buildAuthUrl(state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SHEETS_SCOPES,
    state,
  });
}
