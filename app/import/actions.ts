"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PermissionError, requirePermission } from "@/lib/auth/permissions";
import {
  applyMapping,
  dedupeHeaders,
  escapeFormulaInjection,
  MAX_IMPORT_ROWS,
  parseDelimitedText,
  sniffImportFile,
  suggestMapping,
  type ColumnMapping,
  type LeadField,
} from "@/lib/import/csv";
import { dedupeRows, type DedupeInput } from "@/lib/import/dedupe";
import { isMacroEnabledWorkbook, parseExcelBuffer } from "@/lib/import/excel";
import { importFormSchema, leadImportRowSchema } from "@/lib/validation/import";
import { extractSpreadsheetId, fetchSheetData } from "@/lib/google/sheets";
import { getValidAccessToken } from "@/lib/google/token";
import type { CurrentUser } from "@/lib/auth/session";

export type MappingPreviewResult =
  | { error: string }
  | { headers: string[]; sampleRow: Record<string, string> | null; suggested: ColumnMapping; saved: ColumnMapping | null };

async function requireImporter() {
  const user = await getCurrentUser();
  if (!user) {
    throw new PermissionError("Not signed in");
  }
  requirePermission(user, "import_leads");
  return user;
}

type ParsedImport =
  | { error: string }
  | { headers: string[]; rows: Record<string, string>[]; sourceType: "CSV" | "TSV" | "EXCEL" };

/** Shared by the mapping preview and the real import: one trusted parse per file. */
async function parseImportBuffer(buffer: Buffer): Promise<ParsedImport> {
  const sniff = sniffImportFile(buffer);
  if (!sniff.ok) {
    return { error: sniff.reason };
  }

  if (sniff.kind === "xlsx") {
    if (isMacroEnabledWorkbook(buffer)) {
      return { error: "Macro-enabled Excel files (.xlsm) aren't allowed" };
    }
    const { headers, rows } = await parseExcelBuffer(buffer);
    return { headers, rows, sourceType: "EXCEL" };
  }

  const text = buffer.toString("utf-8");
  const { headers, rows, errors, delimiter } = parseDelimitedText(text);
  if (errors.length > 0 && rows.length === 0) {
    return { error: "Could not read this file as CSV/TSV" };
  }
  return { headers, rows, sourceType: delimiter === "\t" ? "TSV" : "CSV" };
}

async function lookUpSavedMapping(companyId: string, source: string) {
  const trimmed = source.trim();
  if (!trimmed) return null;
  const existing = await prisma.importMapping.findUnique({
    where: { companyId_source: { companyId, source: trimmed } },
  });
  return existing ? (existing.mapping as ColumnMapping) : null;
}

/**
 * For CSV/TSV the browser already parsed headers with Papa Parse to drive
 * the mapping screen; this just looks up a saved mapping to prefill it.
 * For Excel there's no reasonable client-side parser, so the file itself
 * is sent here and parsed server-side (the only parse that's trusted
 * either way -- the real import re-parses from scratch regardless).
 */
export async function previewMapping(formData: FormData): Promise<MappingPreviewResult> {
  let user;
  try {
    user = await requireImporter();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const source = formData.get("source");
  if (typeof source !== "string") {
    return { error: "Invalid input" };
  }

  let headers: string[];
  let sampleRow: Record<string, string> | null;

  const file = formData.get("file");
  if (file instanceof File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseImportBuffer(buffer);
    if ("error" in parsed) {
      return { error: parsed.error };
    }
    headers = parsed.headers;
    sampleRow = parsed.rows[0] ?? null;
  } else {
    const headersJson = formData.get("headers");
    const sampleRowJson = formData.get("sampleRow");
    if (typeof headersJson !== "string") {
      return { error: "Invalid input" };
    }
    headers = dedupeHeaders(JSON.parse(headersJson));
    sampleRow = typeof sampleRowJson === "string" ? JSON.parse(sampleRowJson) : null;
  }

  return {
    headers,
    sampleRow,
    suggested: suggestMapping(headers),
    saved: await lookUpSavedMapping(user.companyId, source),
  };
}

export type ImportResult =
  | { error: string }
  | {
      success: true;
      totalRows: number;
      imported: number;
      duplicatesSkipped: number;
      flaggedInvalid: number;
      invalidSamples: string[];
    };

/** Shared by every import source (file upload, Google Sheet): validate, dedupe, insert, record. */
async function runImport(
  user: CurrentUser,
  rows: Record<string, string>[],
  source: string,
  mapping: ColumnMapping,
  sourceType: "CSV" | "TSV" | "EXCEL" | "GOOGLE_SHEETS",
  sourceRef: string,
): Promise<ImportResult> {
  if (rows.length === 0) {
    return { error: "No rows found" };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: `More than the ${MAX_IMPORT_ROWS}-row import limit` };
  }

  const validRows: DedupeInput[] = [];
  let flaggedInvalid = 0;
  const invalidSamples: string[] = [];

  rows.forEach((row, index) => {
    const mapped = applyMapping(row, mapping);
    const parsed = leadImportRowSchema.safeParse(mapped);
    if (!parsed.success) {
      flaggedInvalid += 1;
      if (invalidSamples.length < 5) {
        const rowNumber = index + 2;
        invalidSamples.push(`Row ${rowNumber}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      }
      return;
    }
    validRows.push({ ...parsed.data, rowNumber: index + 2 });
  });

  const existingLeads = await prisma.lead.findMany({
    where: { companyId: user.companyId },
    select: { email: true, phone: true },
  });
  const existingEmails = new Set(
    existingLeads.filter((l) => l.email).map((l) => l.email!.trim().toLowerCase()),
  );
  const existingPhones = new Set(
    existingLeads.filter((l) => l.phone).map((l) => l.phone!.trim().toLowerCase()),
  );

  const { toInsert, duplicateInFile, duplicateInDb } = dedupeRows(
    validRows,
    existingEmails,
    existingPhones,
  );

  await prisma.$transaction(
    async (tx) => {
      if (toInsert.length > 0) {
        await tx.lead.createMany({
          data: toInsert.map((row) => ({
            companyId: user.companyId,
            firstName: escapeFormulaInjection(row.firstName),
            lastName: escapeFormulaInjection(row.lastName),
            email: row.email || null,
            phone: escapeFormulaInjection(row.phone) || null,
            source,
            sport: row.sport ? escapeFormulaInjection(row.sport) : null,
            position: row.position ? escapeFormulaInjection(row.position) : null,
            location: row.location ? escapeFormulaInjection(row.location) : null,
            notes: row.notes ? escapeFormulaInjection(row.notes) : null,
          })),
        });
      }

      const createdBatch = await tx.importBatch.create({
        data: {
          companyId: user.companyId,
          uploadedById: user.id,
          sourceType,
          sourceRef,
          rowCount: toInsert.length,
          duplicatesSkipped: duplicateInFile.length + duplicateInDb.length,
        },
      });

      await tx.importMapping.upsert({
        where: { companyId_source: { companyId: user.companyId, source } },
        create: { companyId: user.companyId, source, mapping },
        update: { mapping },
      });

      await tx.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          action: "leads_imported",
          targetType: "import_batch",
          targetId: createdBatch.id,
        },
      });
    },
    { timeout: 20000 },
  );

  revalidatePath("/import");

  return {
    success: true,
    totalRows: rows.length,
    imported: toInsert.length,
    duplicatesSkipped: duplicateInFile.length + duplicateInDb.length,
    flaggedInvalid,
    invalidSamples,
  };
}

function parseMappingField(formData: FormData): ColumnMapping | { error: string } {
  const mappingJson = formData.get("mapping");
  if (typeof mappingJson !== "string") {
    return { error: "Invalid column mapping" };
  }
  try {
    const mapping: ColumnMapping = JSON.parse(mappingJson);
    if (!mapping.fullName && !mapping.firstName && !mapping.lastName) {
      return { error: "Map a name column (either Full name, or First/Last name)" };
    }
    return mapping;
  } catch {
    return { error: "Invalid column mapping" };
  }
}

export async function importLeads(formData: FormData): Promise<ImportResult> {
  let user;
  try {
    user = await requireImporter();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsedForm = importFormSchema.safeParse({ source: formData.get("source") });
  if (!parsedForm.success) {
    return { error: parsedForm.error.issues[0]?.message ?? "Invalid input" };
  }
  const { source } = parsedForm.data;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a file to import" };
  }

  const mapping = parseMappingField(formData);
  if ("error" in mapping) return mapping;

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsedFile = await parseImportBuffer(buffer);
  if ("error" in parsedFile) {
    return { error: parsedFile.error };
  }

  return runImport(user, parsedFile.rows, source, mapping, parsedFile.sourceType, file.name);
}

export type IsGoogleConnectedResult = { connected: boolean };

export async function isGoogleConnected(): Promise<IsGoogleConnectedResult> {
  const user = await getCurrentUser();
  if (!user) return { connected: false };
  const connection = await prisma.googleConnection.findUnique({ where: { userId: user.id } });
  return { connected: Boolean(connection) };
}

/** Same role as previewMapping, for a Google Sheet instead of an uploaded file. */
export async function previewSheetMapping(formData: FormData): Promise<MappingPreviewResult> {
  let user;
  try {
    user = await requireImporter();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const sheetUrl = formData.get("sheetUrl");
  const source = formData.get("source");
  if (typeof sheetUrl !== "string" || typeof source !== "string") {
    return { error: "Invalid input" };
  }

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return { error: "That doesn't look like a Google Sheets link or ID" };
  }

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return { error: "Connect your Google account first" };
  }

  try {
    const { headers, rows } = await fetchSheetData(accessToken, spreadsheetId);
    return {
      headers,
      sampleRow: rows[0] ?? null,
      suggested: suggestMapping(headers),
      saved: await lookUpSavedMapping(user.companyId, source),
    };
  } catch {
    return { error: "Could not read that sheet. Make sure it's shared with your Google account." };
  }
}

export async function importFromSheet(formData: FormData): Promise<ImportResult> {
  let user;
  try {
    user = await requireImporter();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsedForm = importFormSchema.safeParse({ source: formData.get("source") });
  if (!parsedForm.success) {
    return { error: parsedForm.error.issues[0]?.message ?? "Invalid input" };
  }
  const { source } = parsedForm.data;

  const sheetUrl = formData.get("sheetUrl");
  if (typeof sheetUrl !== "string") {
    return { error: "Missing sheet link" };
  }
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return { error: "That doesn't look like a Google Sheets link or ID" };
  }

  const mapping = parseMappingField(formData);
  if ("error" in mapping) return mapping;

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return { error: "Connect your Google account first" };
  }

  let rows: Record<string, string>[];
  try {
    rows = (await fetchSheetData(accessToken, spreadsheetId)).rows;
  } catch {
    return { error: "Could not read that sheet. Make sure it's shared with your Google account." };
  }

  return runImport(user, rows, source, mapping, "GOOGLE_SHEETS", spreadsheetId);
}

export type { LeadField };
