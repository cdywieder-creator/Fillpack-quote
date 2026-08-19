'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SPECIFIC_GRAVITY } from '@/lib/quote-math';

// Create a recipe without leaving the quote builder. Rendered outside the quote
// <form> by its parent, since HTML forbids nested forms.
export default function RecipeQuickCreate({ onCreated, onClose }) {
  const [oils, setOils] = useState([]);
  const [name, setName] = useState('');
  const [lines, setLines] = useState([{ ingredient_id: '', percentage: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/ingredients').then((r) => r.json()).then(setOils);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.percentage || 0), 0), [lines]);
  const totalOk = Math.abs(total - 100) < 0.001;

  const costPerLb = useMemo(
    () =>
      lines.reduce((s, l) => {
        const oil = oils.find((o) => o.id === Number(l.ingredient_id));
        return s + (oil ? (Number(l.percentage || 0) / 100) * oil.cost_per_lb : 0);
      }, 0),
    [lines, oils]
  );

  const setLine = (idx, patch) => setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  // Split the remaining percentage evenly across lines that have an oil chosen.
  function balance() {
    const filled = lines.filter((l) => l.ingredient_id);
    if (filled.length === 0) return;
    const each = Math.floor((100 / filled.length) * 10000) / 10000;
    let remainder = Math.round((100 - each * filled.length) * 10000) / 10000;
    let first = true;
    setLines(
      lines.map((l) => {
        if (!l.ingredient_id) return l;
        const pct = first ? Math.round((each + remainder) * 10000) / 10000 : each;
        first = false;
        return { ...l, percentage: String(pct) };
      })
    );
  }

  async function submit() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        specific_gravity: DEFAULT_SPECIFIC_GRAVITY,
        notes: '',
        ingredients: lines
          .filter((l) => l.ingredient_id)
          .map((l) => ({ ingredient_id: Number(l.ingredient_id), percentage: Number(l.percentage) })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'Could not create recipe');
      return;
    }
    onCreated(data);
  }

  const canSave = name.trim() && totalOk && !busy && lines.some((l) => l.ingredient_id);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 p-3 sm:p-4">
      <div className="mt-4 mb-4 w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl sm:mt-8 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">New recipe</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100" aria-label="Close">
            ✕
          </button>
        </div>

        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {oils.length === 0 && (
          <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No oils defined yet — add ingredients before building a recipe.
          </p>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Recipe name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </label>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Oils</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={balance} className="text-xs font-medium text-brand hover:underline">
                Split evenly
              </button>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${totalOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {total.toFixed(2)}%
              </span>
            </div>
          </div>

          {lines.map((l, idx) => (
            <div key={idx} className="mb-2 flex items-center gap-2">
              <select value={l.ingredient_id} onChange={(e) => setLine(idx, { ingredient_id: e.target.value })}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select oil…</option>
                {oils.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} (${o.cost_per_lb.toFixed(2)}/lb)</option>
                ))}
              </select>
              <input type="number" step="any" min="0" max="100" placeholder="%" value={l.percentage}
                onChange={(e) => setLine(idx, { percentage: e.target.value })}
                className="w-24 rounded border border-gray-300 px-3 py-2 text-right text-sm" />
              <span className="text-sm text-gray-500">%</span>
              <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                disabled={lines.length === 1}
                className="rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-30">
                ✕
              </button>
            </div>
          ))}

          <button type="button" onClick={() => setLines([...lines, { ingredient_id: '', percentage: '' }])}
            className="mt-1 text-sm font-medium text-brand hover:underline">
            + Add oil
          </button>

          <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
            Blended oil cost: <span className="font-semibold text-navy">${costPerLb.toFixed(2)}/lb</span>
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={submit} disabled={!canSave}
            className="flex-1 rounded bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 sm:flex-none">
            {busy ? 'Creating…' : 'Create & use'}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 rounded border border-gray-300 px-4 py-2.5 text-sm sm:flex-none">
            Cancel
          </button>
          {!totalOk && <span className="w-full text-sm text-red-600 sm:w-auto">Percentages must total 100%.</span>}
        </div>
      </div>
    </div>
  );
}
