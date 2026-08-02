'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeQuote, deriveFillWeightLb, money } from '@/lib/quote-math';
import PackagingPicker from '@/components/PackagingPicker';
import RecipeQuickCreate from '@/components/RecipeQuickCreate';

const SIZES = [1, 2, 4, 8, 12, 16, 32];

export default function NewQuotePage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [customer, setCustomer] = useState({ customer_name: '', customer_company: '', customer_email: '' });
  const [recipeId, setRecipeId] = useState('');
  const [sizeChoice, setSizeChoice] = useState('16');
  const [customSize, setCustomSize] = useState('');
  const [fillOverride, setFillOverride] = useState(''); // blank = auto-derived
  const [quantity, setQuantity] = useState('1000');
  const [marginPct, setMarginPct] = useState('40');
  const [method, setMethod] = useState('margin');
  const [selected, setSelected] = useState({}); // packaging_component_id -> qty_per_unit
  const [validityDate, setValidityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showNewRecipe, setShowNewRecipe] = useState(false);
  const [fillingRate, setFillingRate] = useState('');
  const [fillingQty, setFillingQty] = useState('1');

  useEffect(() => {
    fetch('/api/recipes').then((r) => r.json()).then(setRecipes);
    fetch('/api/packaging').then((r) => r.json()).then(setPackaging);
    setValidityDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  }, []);

  const recipe = recipes.find((r) => r.id === Number(recipeId));
  const sizeOz = sizeChoice === 'custom' ? Number(customSize) : Number(sizeChoice);
  const autoFill = recipe && sizeOz > 0 ? deriveFillWeightLb(sizeOz, recipe.specific_gravity) : 0;
  const fillWeightLb = fillOverride !== '' ? Number(fillOverride) : autoFill;

  const selectedComponents = packaging
    .filter((p) => selected[p.id])
    .map((p) => ({ ...p, qty_per_unit: Number(selected[p.id]) || 1 }));

  const totals = useMemo(() => {
    if (!recipe || !(fillWeightLb > 0)) return null;
    return computeQuote({
      fillWeightLb,
      ingredients: recipe.ingredients.map((i) => ({ percentage: i.percentage, costPerLb: i.cost_per_lb })),
      components: selectedComponents.map((c) => ({ unitCost: c.unit_cost, qtyPerUnit: c.qty_per_unit })),
      marginPct: Number(marginPct),
      quantity: Number(quantity),
      method,
      fillingRate: Number(fillingRate || 0),
      fillingQty: Number(fillingQty || 1),
    });
  }, [recipe, fillWeightLb, selectedComponents, marginPct, quantity, method, fillingRate, fillingQty]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...customer,
        recipe_id: Number(recipeId),
        package_size_oz: sizeOz,
        fill_weight_lb: fillWeightLb,
        quantity: Number(quantity),
        filling_rate: Number(fillingRate || 0),
        filling_qty: Number(fillingQty || 1),
        margin_pct: Number(marginPct),
        pricing_method: method,
        validity_date: validityDate,
        notes,
        components: selectedComponents.map((c) => ({ packaging_component_id: c.id, qty_per_unit: c.qty_per_unit })),
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Failed to create quote');
      return;
    }
    router.push(`/quotes/${data.id}`);
  }

  const inputCls = 'w-full rounded border border-gray-300 px-3 py-2 text-sm';

  return (
    <>
    {/* Bottom padding clears the mobile action bar pinned below. */}
    <form onSubmit={save} className="pb-24 lg:pb-0">
      <h1 className="mb-4 text-2xl font-bold text-navy">New Quote</h1>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* min-w-0: grid items default to min-width:auto, which lets the packaging
          list's min-content width stretch the track past the viewport. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* Customer */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-navy">Customer</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <input placeholder="Contact name *" value={customer.customer_name} required
                onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })} className={inputCls} />
              <input placeholder="Company" value={customer.customer_company}
                onChange={(e) => setCustomer({ ...customer, customer_company: e.target.value })} className={inputCls} />
              <input placeholder="Email" type="email" value={customer.customer_email}
                onChange={(e) => setCustomer({ ...customer, customer_email: e.target.value })} className={inputCls} />
            </div>
          </section>

          {/* Product */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-navy">Product</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 flex items-center justify-between font-medium">
                  Recipe *
                  <button type="button" onClick={() => setShowNewRecipe(true)}
                    className="text-xs font-medium text-brand hover:underline">
                    + New recipe
                  </button>
                </span>
                <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} required className={inputCls}>
                  <option value="">Select recipe…</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {recipe && (
                  <span className="mt-1 block text-xs text-gray-500">
                    {recipe.ingredients.map((i) => `${i.name} ${i.percentage}%`).join(' · ')}
                  </span>
                )}
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Package size *</span>
                <div className="flex gap-2">
                  <select value={sizeChoice} onChange={(e) => setSizeChoice(e.target.value)} className={inputCls}>
                    {SIZES.map((s) => <option key={s} value={s}>{s} oz</option>)}
                    <option value="custom">Custom…</option>
                  </select>
                  {sizeChoice === 'custom' && (
                    <input type="number" step="any" min="0.1" placeholder="oz" value={customSize} required
                      onChange={(e) => setCustomSize(e.target.value)} className={inputCls} />
                  )}
                </div>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Fill weight (lb/unit)</span>
                <input type="number" step="any" min="0" placeholder={autoFill ? autoFill.toFixed(4) : 'auto'}
                  value={fillOverride} onChange={(e) => setFillOverride(e.target.value)} className={inputCls} />
                <span className="mt-1 block text-xs text-gray-500">
                  {recipe
                    ? `Auto: ${autoFill.toFixed(4)} lb (${sizeOz || 0} fl oz × SG ${recipe.specific_gravity}). Leave blank to use auto, or type to override.`
                    : 'Derived from size × recipe specific gravity.'}
                </span>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Quantity (units) *</span>
                <input type="number" min="1" step="1" value={quantity} required
                  onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
              </label>
            </div>
          </section>

          {/* Filling */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-1 font-semibold text-navy">Filling</h2>
            <p className="mb-3 text-xs text-gray-500">
              Your filling service charge — entered per quote, not picked from the component catalogue.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Filling cost (per fill)</span>
                <input type="number" step="any" min="0" placeholder="0.00" value={fillingRate}
                  onChange={(e) => setFillingRate(e.target.value)} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Fills per unit</span>
                <input type="number" step="any" min="0.0001" value={fillingQty}
                  onChange={(e) => setFillingQty(e.target.value)} className={inputCls} />
              </label>
              <div className="text-sm">
                <span className="mb-1 block font-medium">Filling cost / unit</span>
                <p className="rounded bg-gray-50 px-3 py-2 font-semibold text-navy">
                  {money(Number(fillingRate || 0) * Number(fillingQty || 1), 4)}
                </p>
              </div>
            </div>
          </section>

          {/* Packaging */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-1 font-semibold text-navy">Packaging</h2>
            <p className="mb-3 text-xs text-gray-500">Pick any combination — e.g. bottle + cap, or pump + label + box. Set per-unit quantity if a component is used more than once.</p>
            <PackagingPicker packaging={packaging} selected={selected} setSelected={setSelected} sizeOz={sizeOz} />
          </section>

          {/* Pricing */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-navy">Pricing</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium">{method === 'margin' ? 'Margin %' : 'Markup %'} *</span>
                <input type="number" step="any" min="0" max={method === 'margin' ? 99.9 : 1000} value={marginPct} required
                  onChange={(e) => setMarginPct(e.target.value)} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Method</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                  <option value="margin">Margin on selling price — BOM ÷ (1 − m)</option>
                  <option value="markup">Markup on cost — BOM × (1 + m)</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Valid through</span>
                <input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">Internal notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
            </label>
          </section>
        </div>

        {/* Live breakdown */}
        <div className="min-w-0">
          <div className="sticky top-20 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-navy">Cost breakdown (per unit)</h2>
            {!totals ? (
              <p className="text-sm text-gray-400">Select a recipe and size to see live pricing.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <tbody>
                    {recipe.ingredients.map((i) => (
                      <tr key={i.id} className="text-gray-600">
                        <td className="py-0.5">{i.name} ({i.percentage}%)</td>
                        <td className="py-0.5 text-right">{money(fillWeightLb * (i.percentage / 100) * i.cost_per_lb, 4)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-100 font-medium">
                      <td className="py-1">Oil subtotal</td>
                      <td className="py-1 text-right">{money(totals.oilCost, 4)}</td>
                    </tr>
                    {selectedComponents.map((c) => (
                      <tr key={c.id} className="text-gray-600">
                        <td className="py-0.5">{c.description}{c.qty_per_unit > 1 ? ` ×${c.qty_per_unit}` : ''}</td>
                        <td className="py-0.5 text-right">{money(c.unit_cost * c.qty_per_unit, 4)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-100 font-medium">
                      <td className="py-1">Packaging subtotal</td>
                      <td className="py-1 text-right">{money(totals.packagingCost, 4)}</td>
                    </tr>
                    <tr className="border-t border-gray-100 font-medium">
                      <td className="py-1">
                        Filling{Number(fillingQty || 1) !== 1 ? ` ×${Number(fillingQty)}` : ''}
                      </td>
                      <td className="py-1 text-right">{money(totals.fillingCost, 4)}</td>
                    </tr>
                    <tr className="border-t border-gray-200 font-semibold text-navy">
                      <td className="py-1">BOM cost / unit</td>
                      <td className="py-1 text-right">{money(totals.bomCost, 4)}</td>
                    </tr>
                    <tr className="font-bold text-brand">
                      <td className="py-1">Unit price</td>
                      <td className="py-1 text-right">{money(totals.unitPrice, 4)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm">
                  <div className="flex justify-between"><span>Quantity</span><span>{Number(quantity).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-navy"><span>Quote total</span><span>{money(totals.totalPrice)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Total cost</span><span>{money(totals.totalCost)}</span></div>
                  <div className="flex justify-between text-green-700"><span>Profit</span><span>{money(totals.totalProfit)} ({(totals.marginOnPrice * 100).toFixed(1)}% of price)</span></div>
                </div>
              </>
            )}
            <button type="submit" disabled={busy || !totals || selectedComponents.length === 0}
              className="mt-4 w-full rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {busy ? 'Creating…' : 'Create quote'}
            </button>
            {totals && selectedComponents.length === 0 && (
              <p className="mt-2 text-xs text-red-600">Select at least one packaging component.</p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: keep the running total and the submit reachable without
          scrolling back through the whole form. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">
              {totals ? `${Number(quantity || 0).toLocaleString()} units · ${money(totals.unitPrice, 4)}/unit` : 'Select a recipe to price'}
            </p>
            <p className="truncate text-lg font-bold text-navy">{totals ? money(totals.totalPrice) : '—'}</p>
          </div>
          <button type="submit" disabled={busy || !totals || selectedComponents.length === 0}
            className="shrink-0 rounded bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Creating…' : 'Create quote'}
          </button>
        </div>
      </div>
    </form>

    {showNewRecipe && (
      <RecipeQuickCreate
        onClose={() => setShowNewRecipe(false)}
        onCreated={(created) => {
          setRecipes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          setRecipeId(String(created.id));
          setShowNewRecipe(false);
        }}
      />
    )}
    </>
  );
}
