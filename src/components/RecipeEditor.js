'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_SPECIFIC_GRAVITY } from '@/lib/quote-math';

export default function RecipeEditor({ recipeId = null }) {
  const router = useRouter();
  const [oils, setOils] = useState([]);
  const [name, setName] = useState('');
  const [sg, setSg] = useState(String(DEFAULT_SPECIFIC_GRAVITY));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ ingredient_id: '', percentage: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/ingredients').then((r) => r.json()).then(setOils);
    if (recipeId) {
      fetch(`/api/recipes/${recipeId}`).then((r) => r.json()).then((r) => {
        setName(r.name);
        setSg(String(r.specific_gravity));
        setNotes(r.notes);
        setLines(r.ingredients.map((i) => ({ ingredient_id: String(i.ingredient_id), percentage: String(i.percentage) })));
      });
    }
  }, [recipeId]);

  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.percentage || 0), 0), [lines]);
  const totalOk = Math.abs(total - 100) < 0.001;

  const costPerLb = useMemo(() => {
    return lines.reduce((s, l) => {
      const oil = oils.find((o) => o.id === Number(l.ingredient_id));
      return s + (oil ? (Number(l.percentage || 0) / 100) * oil.cost_per_lb : 0);
    }, 0);
  }, [lines, oils]);

  function setLine(idx, patch) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      name,
      specific_gravity: Number(sg),
      notes,
      ingredients: lines
        .filter((l) => l.ingredient_id)
        .map((l) => ({ ingredient_id: Number(l.ingredient_id), percentage: Number(l.percentage) })),
    };
    const res = await fetch(recipeId ? `/api/recipes/${recipeId}` : '/api/recipes', {
      method: recipeId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Save failed');
      return;
    }
    router.push('/recipes');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-3xl">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Recipe name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Specific gravity</span>
          <input type="number" step="any" min="0.1" value={sg} onChange={(e) => setSg(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2" />
          <span className="mt-1 block text-xs text-gray-500">Water = 1.0; most oils ≈ 0.91. Used to derive fill weight.</span>
        </label>
        <label className="text-sm sm:col-span-3">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2" />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-navy">Oils</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${totalOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Total: {total.toFixed(2)}%
          </span>
        </div>
        {lines.map((l, idx) => (
          <div key={idx} className="mb-2 flex items-center gap-2">
            <select value={l.ingredient_id} onChange={(e) => setLine(idx, { ingredient_id: e.target.value })}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" required>
              <option value="">Select oil…</option>
              {oils.map((o) => (
                <option key={o.id} value={o.id}>{o.name} (${o.cost_per_lb.toFixed(2)}/lb)</option>
              ))}
            </select>
            <input type="number" step="any" min="0" max="100" placeholder="%" value={l.percentage}
              onChange={(e) => setLine(idx, { percentage: e.target.value })}
              className="w-24 rounded border border-gray-300 px-3 py-2 text-right text-sm" required />
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
          Blended oil cost at current prices: <span className="font-semibold text-navy">${costPerLb.toFixed(4)}/lb</span>
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={busy || !totalOk}
          className="rounded bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? 'Saving…' : recipeId ? 'Update recipe' : 'Create recipe'}
        </button>
        {!totalOk && <span className="self-center text-sm text-red-600">Percentages must total exactly 100% to save.</span>}
      </div>
    </form>
  );
}
