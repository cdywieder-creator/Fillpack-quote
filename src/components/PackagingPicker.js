'use client';

import { useMemo, useState } from 'react';

// Component catalogues run to hundreds of SKUs once a BOM is imported, so the
// picker is search-first: chosen components stay pinned at the top and the
// browsable list is filtered by type and free text rather than rendered whole.
export default function PackagingPicker({ packaging, selected, setSelected, sizeOz }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const types = useMemo(() => {
    const counts = new Map();
    for (const p of packaging) counts.set(p.type, (counts.get(p.type) || 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [packaging]);

  const chosen = packaging.filter((p) => selected[p.id]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packaging.filter((p) => {
      if (selected[p.id]) return false;
      if (type !== 'all' && p.type !== type) return false;
      if (!q) return true;
      return `${p.type} ${p.description} ${p.size_compatibility}`.toLowerCase().includes(q);
    });
  }, [packaging, selected, type, query]);

  // Components tagged with a size are surfaced first once a size is chosen.
  const ranked = useMemo(() => {
    if (!sizeOz) return matches;
    const tag = String(sizeOz);
    return [...matches].sort((a, b) => {
      const fit = (p) => (p.size_compatibility && (p.size_compatibility.includes(tag) || /all/i.test(p.size_compatibility)) ? 0 : 1);
      return fit(a) - fit(b);
    });
  }, [matches, sizeOz]);

  const add = (id) => setSelected({ ...selected, [id]: '1' });
  const remove = (id) => {
    const next = { ...selected };
    delete next[id];
    setSelected(next);
  };

  const pill = (active) =>
    `rounded-full px-3 py-1 text-xs font-medium capitalize ${
      active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div>
      {chosen.length === 0 ? (
        <p className="mb-3 rounded border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-400">
          No components selected yet — search below and click to add.
        </p>
      ) : (
        <ul className="mb-3 space-y-1">
          {chosen.map((p) => (
            <li key={p.id} className="rounded border border-brand bg-orange-50 px-3 py-2 text-sm">
              {/* Stacked on phones so the description is not truncated to nothing. */}
              <div className="flex items-start gap-2 sm:items-center">
                <span className="w-14 shrink-0 pt-0.5 text-xs font-semibold uppercase text-brand sm:w-16 sm:pt-0">{p.type}</span>
                <span className="min-w-0 flex-1 break-anywhere sm:truncate" title={p.description}>{p.description}</span>
                <button type="button" onClick={() => remove(p.id)}
                  className="-mr-1 shrink-0 rounded px-2 py-0.5 text-red-600 hover:bg-red-50 sm:order-last"
                  aria-label={`Remove ${p.description}`}>
                  ✕
                </button>
                <span className="hidden text-gray-500 sm:inline">${Number(p.unit_cost).toFixed(4)}</span>
                <label className="hidden items-center gap-1 text-xs text-gray-500 sm:flex">
                  ×
                  <input
                    type="number" min="1" step="1" value={selected[p.id]}
                    onChange={(e) => setSelected({ ...selected, [p.id]: e.target.value })}
                    className="w-14 rounded border border-gray-300 px-1 py-0.5 text-right"
                    title="Quantity per unit"
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center gap-3 pl-14 sm:hidden">
                <span className="text-gray-500">${Number(p.unit_cost).toFixed(4)}</span>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  qty ×
                  <input
                    type="number" min="1" step="1" value={selected[p.id]}
                    onChange={(e) => setSelected({ ...selected, [p.id]: e.target.value })}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
                    title="Quantity per unit"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components…"
          className="min-w-48 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => setType('all')} className={pill(type === 'all')}>
          all ({packaging.length})
        </button>
        {types.map(([t, n]) => (
          <button key={t} type="button" onClick={() => setType(t)} className={pill(type === t)}>
            {t} ({n})
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
        {ranked.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400">
            {packaging.length === 0 ? 'No packaging components defined yet.' : 'Nothing matches that search.'}
          </p>
        ) : (
          ranked.map((p) => (
            <button
              key={p.id} type="button" onClick={() => add(p.id)}
              className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-3 text-left text-sm last:border-0 hover:bg-gray-50 sm:py-2"
            >
              <span className="w-14 shrink-0 text-xs font-semibold uppercase text-gray-400 sm:w-16">{p.type}</span>
              <span className="min-w-0 flex-1 truncate" title={p.description}>{p.description}</span>
              {p.size_compatibility && <span className="hidden text-xs text-gray-400 sm:inline">{p.size_compatibility}</span>}
              <span className="shrink-0 text-gray-500">${Number(p.unit_cost).toFixed(4)}</span>
            </button>
          ))
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {ranked.length} shown{query || type !== 'all' ? ' (filtered)' : ''} · {chosen.length} selected
      </p>
    </div>
  );
}
