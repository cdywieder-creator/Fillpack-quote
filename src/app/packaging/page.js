'use client';

import { useEffect, useState } from 'react';
import CsvImport from '@/components/CsvImport';

const TYPES = ['bottle', 'cap', 'pump', 'label', 'box', 'other'];
const empty = { type: 'bottle', description: '', size_compatibility: '', unit_cost: '', supplier: '', notes: '' };

export default function PackagingPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => fetch('/api/packaging').then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(editingId ? `/api/packaging/${editingId}` : '/api/packaging', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
    if (!confirm('Delete this component?')) return;
    await fetch(`/api/packaging/${id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      description: item.description,
      size_compatibility: item.size_compatibility,
      unit_cost: String(item.unit_cost),
      supplier: item.supplier,
      notes: item.notes,
    });
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy">Packaging Components</h1>

      <CsvImport
        target="packaging"
        fields={[
          { key: 'type', label: 'Type' },
          { key: 'description', label: 'Description', required: true },
          { key: 'size_compatibility', label: 'Size compat.' },
          { key: 'unit_cost', label: 'Unit cost', required: true },
          { key: 'supplier', label: 'Supplier' },
          { key: 'notes', label: 'Notes' },
        ]}
        onDone={load}
      />

      <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-7">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm">
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input placeholder='Description * (e.g. "16 oz PET Boston Round")' value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm sm:col-span-2" required />
        <input placeholder='Sizes (e.g. "8,16 oz" or "all")' value={form.size_compatibility}
          onChange={(e) => setForm({ ...form, size_compatibility: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Unit cost *" type="number" step="any" min="0" value={form.unit_cost}
          onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm" required />
        <input placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
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

      {/* Mobile: cards. */}
      <div className="mt-4 space-y-3 md:hidden">
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
            No packaging yet — add one above or import a CSV.
          </p>
        )}
        {items.map((i) => (
          <div key={i.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase text-brand">{i.type}</span>
                <p className="break-anywhere font-medium text-navy">{i.description}</p>
              </div>
              <span className="shrink-0 font-semibold">${Number(i.unit_cost).toFixed(4)}</span>
            </div>
            {(i.size_compatibility || i.supplier) && (
              <p className="mt-1 break-anywhere text-sm text-gray-500">
                {[i.size_compatibility, i.supplier].filter(Boolean).join(' · ')}
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
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Sizes</th>
              <th className="px-4 py-2 text-right">Unit cost</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No packaging yet — add one above or import a CSV.</td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 capitalize text-gray-600">{i.type}</td>
                <td className="px-4 py-2 font-medium">{i.description}</td>
                <td className="px-4 py-2 text-gray-600">{i.size_compatibility}</td>
                <td className="px-4 py-2 text-right">${Number(i.unit_cost).toFixed(4)}</td>
                <td className="px-4 py-2 text-gray-600">{i.supplier}</td>
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
