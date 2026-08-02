'use client';

import { useEffect, useState } from 'react';
import CsvImport from '@/components/CsvImport';
import { LB_PER_KG } from '@/lib/quote-math';

const empty = { name: '', cost_per_lb: '', supplier: '', notes: '' };

export default function IngredientsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [unit, setUnit] = useState('lb');
  const [error, setError] = useState('');

  const load = () => fetch('/api/ingredients').then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const toLb = (v) => (unit === 'kg' ? Number(v) / LB_PER_KG : Number(v));
  const fromLb = (v) => (unit === 'kg' ? Number(v) * LB_PER_KG : Number(v));

  async function save(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, cost_per_lb: toLb(form.cost_per_lb) };
    const res = await fetch(editingId ? `/api/ingredients/${editingId}` : '/api/ingredients', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Save failed');
      return;
    }
    setForm(empty);
    setEditingId(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this ingredient?')) return;
    await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      cost_per_lb: fromLb(item.cost_per_lb).toFixed(4),
      supplier: item.supplier,
      notes: item.notes,
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Ingredients (Oils)</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Show costs per
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
            <option value="lb">lb</option>
            <option value="kg">kg</option>
          </select>
        </label>
      </div>

      <CsvImport
        target="ingredients"
        extraControls="costUnit"
        fields={[
          { key: 'name', label: 'Name', required: true },
          { key: 'cost', label: 'Cost', required: true },
          { key: 'code', label: 'Code / SKU' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'notes', label: 'Notes' },
        ]}
        buildRow={(row, { costUnit }) => ({ ...row, cost_unit: costUnit })}
        onDone={load}
      />

      <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input placeholder="Oil name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm" required />
        <input placeholder={`Cost per ${unit} *`} type="number" step="any" min="0" value={form.cost_per_lb}
          onChange={(e) => setForm({ ...form, cost_per_lb: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm" required />
        <input placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(empty); }}
              className="rounded border border-gray-300 px-3 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      </form>

      {/* Mobile: cards with full-width tap targets for edit/delete. */}
      <div className="mt-4 space-y-3 md:hidden">
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
            No ingredients yet — add one above or import a CSV.
          </p>
        )}
        {items.map((i) => (
          <div key={i.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="break-anywhere font-medium text-navy">{i.name}</span>
              <span className="shrink-0 font-semibold">${fromLb(i.cost_per_lb).toFixed(4)}<span className="text-xs font-normal text-gray-400">/{unit}</span></span>
            </div>
            {(i.supplier || i.notes) && (
              <p className="mt-1 break-anywhere text-sm text-gray-500">
                {[i.supplier, i.notes].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
              <button onClick={() => startEdit(i)}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-brand">Edit</button>
              <button onClick={() => remove(i.id)}
                className="flex-1 rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 text-right">Cost / {unit}</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No ingredients yet — add one above or import a CSV.</td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{i.name}</td>
                <td className="px-4 py-2 text-right">${fromLb(i.cost_per_lb).toFixed(4)}</td>
                <td className="px-4 py-2 text-gray-600">{i.supplier}</td>
                <td className="px-4 py-2 text-gray-600">{i.notes}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(i)} className="mr-2 text-brand hover:underline">Edit</button>
                  <button onClick={() => remove(i.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
