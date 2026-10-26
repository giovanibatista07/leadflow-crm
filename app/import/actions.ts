"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PermissionError, requirePermission } from "@/lib/auth/permissions";
import {
  applyMapping,
  escapeFormulaInjection,
  MAX_IMPORT_ROWS,
  parseDelimitedText,
  sniffTabularFile,
  suggestMapping,
  type ColumnMapping,
  type LeadField,
} from "@/lib/import/csv";
import { dedupeRows, type DedupeInput } from "@/lib/import/dedupe";
import { importFormSchema, leadImportRowSchema } from "@/lib/validation/import";

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

/** Client-side parsing drives the mapping screen; this just looks up a saved mapping to prefill it. */
export async function previewMapping(formData: FormData): Promise<MappingPreviewResult> {
  let user;
  try {
    user = await requireImporter();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const headersJson = formData.get("headers");
  const sampleRowJson = formData.get("sampleRow");
  const source = formData.get("source");
  if (typeof headersJson !== "string" || typeof source !== "string") {
    return { error: "Invalid input" };
  }

  const headers: string[] = JSON.parse(headersJson);
  const sampleRow: Record<string, string> | null =
    typeof sampleRowJson === "string" ? JSON.parse(sampleRowJson) : null;

  const existing = source.trim()
    ? await prisma.importMapping.findUnique({
        where: { companyId_source: { companyId: user.companyId, source: source.trim() } },
      })
    : null;

  return {
    headers,
    sampleRow,
    suggested: suggestMapping(headers),
    saved: existing ? (existing.mapping as ColumnMapping) : null,
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

  const mappingJson = formData.get("mapping");
  if (typeof mappingJson !== "string") {
    return { error: "Invalid column mapping" };
  }
  let mapping: ColumnMapping;
  try {
    mapping = JSON.parse(mappingJson);
  } catch {
    return { error: "Invalid column mapping" };
  }
  if (!mapping.firstName && !mapping.lastName) {
    return { error: "Map at least the name column" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniff = sniffTabularFile(buffer);
  if (!sniff.ok) {
    return { error: sniff.reason };
  }

  const text = buffer.toString("utf-8");
  const { rows, errors, delimiter } = parseDelimitedText(text);

  if (errors.length > 0 && rows.length === 0) {
    return { error: "Could not read this file as CSV/TSV" };
  }
  if (rows.length === 0) {
    return { error: "No rows found in file" };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: `File has more than the ${MAX_IMPORT_ROWS}-row import limit` };
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
        const rowNumber = index + 2; // +1 for header row, +1 for 1-indexing
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

  const batch = await prisma.$transaction(async (tx) => {
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
        sourceType: delimiter === "\t" ? "TSV" : "CSV",
        sourceRef: file.name,
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

    return createdBatch;
  }, { timeout: 20000 });

  // The file is never written to disk -- it's processed entirely in memory
  // and discarded when this request ends, which satisfies "delete uploaded
  // files after import" more strongly than writing-then-unlinking would.
  void batch;

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

export type { LeadField };
