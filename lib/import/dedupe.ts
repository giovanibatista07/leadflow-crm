import type { MappedLeadRow } from "./csv";

export type DedupeInput = MappedLeadRow & { rowNumber: number };

export type DedupeResult = {
  toInsert: DedupeInput[];
  duplicateInFile: DedupeInput[];
  duplicateInDb: DedupeInput[];
};

function key(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Duplicate check against both the file and the existing database
 * (SPEC.md section 9), keyed on email or phone. A row matching an earlier
 * row in the same file, or an existing lead in the company, is flagged
 * rather than inserted.
 */
export function dedupeRows(
  rows: DedupeInput[],
  existingEmails: ReadonlySet<string>,
  existingPhones: ReadonlySet<string>,
): DedupeResult {
  const toInsert: DedupeInput[] = [];
  const duplicateInFile: DedupeInput[] = [];
  const duplicateInDb: DedupeInput[] = [];

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (const row of rows) {
    const emailKey = key(row.email);
    const phoneKey = key(row.phone);

    const inDb =
      (emailKey && existingEmails.has(emailKey)) || (phoneKey && existingPhones.has(phoneKey));
    if (inDb) {
      duplicateInDb.push(row);
      continue;
    }

    const inFile = (emailKey && seenEmails.has(emailKey)) || (phoneKey && seenPhones.has(phoneKey));
    if (inFile) {
      duplicateInFile.push(row);
      continue;
    }

    if (emailKey) seenEmails.add(emailKey);
    if (phoneKey) seenPhones.add(phoneKey);
    toInsert.push(row);
  }

  return { toInsert, duplicateInFile, duplicateInDb };
}
