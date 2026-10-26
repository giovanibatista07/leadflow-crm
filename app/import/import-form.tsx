"use client";

import { useState } from "react";
import Papa from "papaparse";
import { LEAD_FIELDS, type ColumnMapping } from "@/lib/import/csv";
import { importLeads, previewMapping, type ImportResult } from "./actions";

const FIELD_LABELS: Record<(typeof LEAD_FIELDS)[number], string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  sport: "Sport",
  position: "Position",
  location: "Location",
  notes: "Notes",
};

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function loadHeaders(selectedFile: File, currentSource: string) {
    setError(null);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 1,
      complete: async (parsed) => {
        const fileHeaders = parsed.meta.fields ?? [];
        setHeaders(fileHeaders);

        const formData = new FormData();
        formData.set("headers", JSON.stringify(fileHeaders));
        formData.set("sampleRow", JSON.stringify(parsed.data[0] ?? null));
        formData.set("source", currentSource);

        const preview = await previewMapping(formData);
        if ("error" in preview) {
          setError(preview.error);
          return;
        }
        setMapping({ ...preview.suggested, ...(preview.saved ?? {}) });
      },
      error: () => setError("Could not read that file"),
    });
  }

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setResult(null);
    if (selectedFile) {
      void loadHeaders(selectedFile, source);
    }
  }

  function handleSourceBlur() {
    if (file) {
      void loadHeaders(file, source);
    }
  }

  async function handleImport() {
    if (!file) {
      setError("Choose a file first");
      return;
    }
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("source", source);
    formData.set("mapping", JSON.stringify(mapping));

    const outcome = await importLeads(formData);
    setPending(false);

    if ("error" in outcome) {
      setError(outcome.error);
    } else {
      setResult(outcome);
    }
  }

  return (
    <div>
      <label>
        Source (e.g. Indeed, LinkedIn)
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onBlur={handleSourceBlur}
        />
      </label>
      <label>
        File (CSV or TSV)
        <input
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
      </label>

      {headers.length > 0 && (
        <fieldset>
          <legend>Column mapping</legend>
          {LEAD_FIELDS.map((field) => (
            <label key={field} style={{ display: "block" }}>
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
          <button type="button" onClick={handleImport} disabled={pending}>
            {pending ? "Importing..." : "Import"}
          </button>
        </fieldset>
      )}

      {error && <p role="alert">{error}</p>}

      {result && "success" in result && (
        <div>
          <h2>Import summary</h2>
          <p>Total rows in file: {result.totalRows}</p>
          <p>Imported: {result.imported}</p>
          <p>Skipped as duplicates: {result.duplicatesSkipped}</p>
          <p>Flagged invalid: {result.flaggedInvalid}</p>
          {result.invalidSamples.length > 0 && (
            <ul>
              {result.invalidSamples.map((sample) => (
                <li key={sample}>{sample}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
