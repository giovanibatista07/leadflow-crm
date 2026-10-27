import "server-only";
import { google } from "googleapis";
import { createOAuthClient } from "./oauth";
import { gridToRows, type SheetData } from "./sheets-parse";
import { MAX_IMPORT_ROWS } from "@/lib/import/csv";

export { extractSpreadsheetId } from "./sheets-parse";
export type { SheetData };

/** Reads only the first sheet's values -- no formulas or formatting, just displayed values. */
export async function fetchSheetData(accessToken: string, spreadsheetId: string): Promise<SheetData> {
  const auth = createOAuthClient();
  auth.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title;
  if (!firstSheetTitle) {
    return { headers: [], rows: [] };
  }

  const range = `'${firstSheetTitle}'!A1:ZZ${MAX_IMPORT_ROWS + 1}`;
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });

  return gridToRows(result.data.values ?? []);
}
