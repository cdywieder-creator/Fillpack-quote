'use client';

import { useState } from 'react';
import Papa from 'papaparse';

// Generic CSV import with a header-mapping step, so existing spreadsheets
// (e.g. Product Cost Tracker V3) can be loaded without reformatting.
// fields: [{ key, label, required }]
export default function CsvImport({ target, fields, extraControls = null, buildRow, onDone, unit = 'rows', help = '' }) {
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [costUnit, setCostUnit] = useState('lb');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: ({ data, meta }) => {
        if (!meta.fields || meta.fields.length === 0) {
          setError('Could not read column headers from this file.');
          return;
        }
        setHeaders(meta.fields);
        setRows(data);
        // best-effort auto-mapping by fuzzy header match
        const auto = {};
        for (const f of fields) {
          const hit = meta.fields.find((h) =>
            h.toLowerCase().replace(/[^a-z]/g, '').includes(f.key.replace(/[^a-z]/g, '')) ||
            f.label.toLowerCase().split(' ').some((w) => w.length > 2 && h.toLowerCase().includes(w))
          );
          if (hit) auto[f.key] = hit;
        }
        setMapping(auto);
      },
      error: () => setError('Failed to parse CSV file.'),
    });
    e.target.value = '';
  }

  async function runImport() {
    setBusy(true);
    setError('');
    const mapped = rows.map((r) => {
      const out = {};
      for (const f of fields) {
        const col = mapping[f.key];
        out[f.key] = col ? r[col] : '';
      }
      return buildRow ? buildRow(out, { costUnit }) : out;
    });
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, rows: mapped }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'Import failed');
      return;
    }
    setResult(data);
    setRows([]);
    setHeaders([]);
    onDone?.();
  }

  return (
    <div>
      <button
        onClick={() => { setOpen(!open); setResult(null); setError(''); }}
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Import CSV
      </button>
      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
          {help && <p className="mb-3 text-sm text-gray-600">{help}</p>}
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm" />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && (
            <p className="mt-2 text-sm text-green-700">
              Imported {result.imported} {unit}{result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.
              {result.errors?.length > 0 && (
                <span className="block text-xs text-red-600">{result.errors.join('; ')}</span>
              )}
            </p>
          )}
          {headers.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-600">
                Map your spreadsheet columns ({rows.length} rows found):
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <span className="w-36 shrink-0">
                      {f.label}
                      {f.required && <span className="text-red-500"> *</span>}
                    </span>
                    <select
                      value={mapping[f.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                      className="flex-1 rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {extraControls === 'costUnit' && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <span className="w-36 shrink-0">Cost is per</span>
                  <select value={costUnit} onChange={(e) => setCostUnit(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
                    <option value="lb">pound (lb)</option>
                    <option value="kg">kilogram (kg)</option>
                  </select>
                </label>
              )}
              <button
                onClick={runImport}
                disabled={busy || fields.some((f) => f.required && !mapping[f.key])}
                className="mt-4 rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {busy ? 'Importing…' : `Import ${rows.length} rows`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
