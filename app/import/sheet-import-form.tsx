"use client";

import { useState } from "react";
import { LEAD_FIELDS, type ColumnMapping } from "@/lib/import/csv";
import { importFromSheet, previewSheetMapping, type ImportResult } from "./actions";

const FIELD_LABELS: Record<(typeof LEAD_FIELDS)[number], string> = {
  fullName: "Full name (splits into first/last automatically)",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  sport: "Sport",
  position: "Position",
  location: "Location",
  notes: "Notes",
};

export function SheetImportForm() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [source, setSource] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function loadPreview() {
    if (!sheetUrl.trim()) {
      setError("Paste a Google Sheets link first");
      return;
    }
    setLoadingPreview(true);
    setError(null);
    const formData = new FormData();
    formData.set("sheetUrl", sheetUrl);
    formData.set("source", source);
    const preview = await previewSheetMapping(formData);
    setLoadingPreview(false);
    if ("error" in preview) {
      setError(preview.error);
      return;
    }
    setHeaders(preview.headers);
    setMapping({ ...preview.suggested, ...(preview.saved ?? {}) });
  }

  async function handleImport() {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("sheetUrl", sheetUrl);
    formData.set("source", source);
    formData.set("mapping", JSON.stringify(mapping));
    const outcome = await importFromSheet(formData);
    setPending(false);
    if ("error" in outcome) {
      setError(outcome.error);
    } else {
      setResult(outcome);
    }
  }

  return (
    <div className="card space-y-3">
      <h2>Import from Google Sheets</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          Source (e.g. Indeed, LinkedIn)
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label>
          Google Sheets link
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />
        </label>
      </div>
      <button type="button" onClick={loadPreview} disabled={loadingPreview}>
        {loadingPreview ? "Loading..." : "Load columns"}
      </button>

      {headers.length > 0 && (
        <fieldset className="space-y-2">
          <legend>Column mapping</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEAD_FIELDS.map((field) => (
              <label key={field}>
                {FIELD_LABELS[field]}
                <select
                  value={mapping[field] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                  }
                >
                  <option value="">(none)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button type="button" onClick={handleImport} disabled={pending} className="mt-2">
            {pending ? "Importing..." : "Import"}
          </button>
        </fieldset>
      )}

      {error && <p role="alert" className="form-error">{error}</p>}

      {result && "success" in result && (
        <div className="form-success space-y-1">
          <h3>Import summary</h3>
          <p>Total rows: {result.totalRows}</p>
          <p>Imported: {result.imported}</p>
          <p>Skipped as duplicates: {result.duplicatesSkipped}</p>
          <p>Flagged invalid: {result.flaggedInvalid}</p>
        </div>
      )}
    </div>
  );
}
