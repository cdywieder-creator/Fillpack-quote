'use client';

import { useMemo, useState } from 'react';
import { money } from '@/lib/quote-math';

// Closures have to share the bottle's neck finish, which both descriptions and
// SKUs carry as e.g. "24/410" — "24/410 Black Screw Cap (24/410BSC)".
const NECK = /(\d{2,3})\/(\d{3})/;
export const neckFinish = (p) => `${p.description || ''}`.match(NECK)?.[0] ?? null;

// Types whose fit depends on the bottle's neck.
const CLOSURE_TYPES = new Set(['cap', 'pump']);

// Component catalogues run to hundreds of SKUs once a BOM is imported, so the
// picker is search-first: chosen components stay pinned at the top and the
// browsable list is filtered by type and free text.
export default function PackagingPicker({ packaging, selected, setSelected, sizeOz, quantity }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [fitOnly, setFitOnly] = useState(true);

  const types = useMemo(() => {
    const counts = new Map();
    for (const p of packaging) counts.set(p.type, (counts.get(p.type) || 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [packaging]);

  const chosen = packaging.filter((p) => selected[p.id]);

  // The neck to match against comes from whichever bottle or jar is chosen.
  const requiredNeck = useMemo(() => {
    for (const p of chosen) {
      if (CLOSURE_TYPES.has(p.type)) continue;
      const n = neckFinish(p);
      if (n) return n;
    }
    return null;
  }, [chosen]);

  const fits = (p) => !requiredNeck || !CLOSURE_TYPES.has(p.type) || neckFinish(p) === requiredNeck;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packaging.filter((p) => {
      if (selected[p.id]) return false;
      if (type !== 'all' && p.type !== type) return false;
      if (fitOnly && !fits(p)) return false;
      if (!q) return true;
      return `${p.type} ${p.description} ${p.size_compatibility}`.toLowerCase().includes(q);
    });
  }, [packaging, selected, type, query, fitOnly, requiredNeck]);

  // Matching closures, then components tagged with the chosen size, then the rest.
  const ranked = useMemo(() => {
    const tag = sizeOz ? String(sizeOz) : null;
    const rank = (p) => {
      if (requiredNeck && CLOSURE_TYPES.has(p.type) && neckFinish(p) === requiredNeck) return 0;
      if (tag && p.size_compatibility && (p.size_compatibility.includes(tag) || /all/i.test(p.size_compatibility))) return 1;
      return 2;
    };
    return [...matches].sort((a, b) => rank(a) - rank(b));
  }, [matches, sizeOz, requiredNeck]);

  const hiddenByFit = useMemo(
    () => (requiredNeck && fitOnly ? packaging.filter((p) => !selected[p.id] && CLOSURE_TYPES.has(p.type) && !fits(p)).length : 0),
    [packaging, selected, requiredNeck, fitOnly]
  );

  const add = (id) => setSelected({ ...selected, [id]: 1 });
  const remove = (id) => {
    const next = { ...selected };
    delete next[id];
    setSelected(next);
  };

  const qty = Number(quantity) || 0;
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
              <div className="flex items-start gap-2 sm:items-center">
                <span className="w-14 shrink-0 pt-0.5 text-xs font-semibold uppercase text-brand sm:w-16 sm:pt-0">{p.type}</span>
                <span className="min-w-0 flex-1 break-anywhere sm:truncate" title={p.description}>{p.description}</span>
                <span className="hidden whitespace-nowrap text-gray-500 sm:inline">
                  ${Number(p.unit_cost).toFixed(4)} × {qty.toLocaleString()} = <span className="font-medium text-navy">{money(p.unit_cost * qty)}</span>
                </span>
                <button type="button" onClick={() => remove(p.id)}
                  className="-mr-1 shrink-0 rounded px-2 py-0.5 text-red-600 hover:bg-red-50"
                  aria-label={`Remove ${p.description}`}>
                  ✕
                </button>
              </div>
              <p className="mt-1 pl-14 text-xs text-gray-500 sm:hidden">
                ${Number(p.unit_cost).toFixed(4)} × {qty.toLocaleString()} = <span className="font-medium text-navy">{money(p.unit_cost * qty)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {requiredNeck && (
        <p className="mb-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Neck finish <span className="font-semibold">{requiredNeck}</span> — caps and pumps that fit are marked
          <span className="mx-1 rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-700">fits</span>
          and listed first.
          {hiddenByFit > 0 && <> {hiddenByFit} that do not fit are hidden.</>}
        </p>
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
        {requiredNeck && (
          <button type="button" onClick={() => setFitOnly((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              fitOnly ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {fitOnly ? `only ${requiredNeck}` : `all necks`}
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
        {ranked.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400">
            {packaging.length === 0 ? 'No packaging components defined yet.' : 'Nothing matches that search.'}
          </p>
        ) : (
          ranked.map((p) => {
            const isFit = requiredNeck && CLOSURE_TYPES.has(p.type) && neckFinish(p) === requiredNeck;
            return (
              <button
                key={p.id} type="button" onClick={() => add(p.id)}
                className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-3 text-left text-sm last:border-0 hover:bg-gray-50 sm:py-2"
              >
                <span className="w-14 shrink-0 text-xs font-semibold uppercase text-gray-400 sm:w-16">{p.type}</span>
                <span className="min-w-0 flex-1 truncate" title={p.description}>{p.description}</span>
                {isFit && (
                  <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">fits</span>
                )}
                <span className="shrink-0 text-gray-500">${Number(p.unit_cost).toFixed(4)}</span>
              </button>
            );
          })
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {ranked.length} shown{query || type !== 'all' || (requiredNeck && fitOnly) ? ' (filtered)' : ''} · {chosen.length} selected
      </p>
    </div>
  );
}
