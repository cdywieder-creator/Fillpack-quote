'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/quote-math';

const STATUSES = ['draft', 'sent', 'accepted', 'declined'];

export default function QuoteDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [hubspotMsg, setHubspotMsg] = useState('');

  const load = () =>
    fetch(`/api/quotes/${id}`).then(async (r) => {
      if (!r.ok) return setNotFound(true);
      setQuote(await r.json());
    });
  useEffect(() => { load(); }, [id]);

  async function setStatus(status) {
    await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove() {
    if (!confirm(`Delete quote ${quote.quote_number}? This cannot be undone.`)) return;
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
    router.push('/quotes');
  }

  async function pushHubspot() {
    setHubspotMsg('');
    const res = await fetch(`/api/quotes/${id}/hubspot`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setHubspotMsg(data.error || 'Done');
  }

  if (notFound) return <p className="text-gray-500">Quote not found. <Link href="/quotes" className="text-brand">Back to quotes</Link></p>;
  if (!quote) return <p className="text-gray-400">Loading…</p>;

  const t = quote.totals;

  return (
    <div>
      <div className="mb-1 text-sm"><Link href="/quotes" className="text-gray-400 hover:text-brand">← Quotes</Link></div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy">{quote.quote_number}</h1>
        <select value={quote.status} onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <a href={`/api/quotes/${id}/pdf`} target="_blank"
            className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Customer PDF
          </a>
          <button onClick={pushHubspot}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            title="Phase 2 — pushes this quote to HubSpot as a Deal">
            Push to HubSpot
          </button>
          <button onClick={remove} className="rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>
      {hubspotMsg && <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">{hubspotMsg}</p>}
      <p className="mb-6 rounded bg-orange-50 px-3 py-2 text-xs text-orange-800">
        Internal view — includes cost and margin detail. The customer PDF never shows costs or margin.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 font-semibold text-navy">Customer</h2>
            <p className="text-sm">
              <span className="font-medium">{quote.customer_company || quote.customer_name}</span>
              {quote.customer_company && <span className="text-gray-500"> — {quote.customer_name}</span>}
              {quote.customer_email && <span className="block text-gray-500">{quote.customer_email}</span>}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Created {quote.created_at?.slice(0, 10)} by {quote.created_by} · Valid through {quote.validity_date}
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 font-semibold text-navy">Product</h2>
            <p className="text-sm">
              {quote.recipe_name} — {quote.package_size_oz} oz · fill weight {quote.fill_weight_lb.toFixed(4)} lb/unit ·{' '}
              {quote.quantity.toLocaleString()} units
            </p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr><th className="py-1">Oil (snapshot cost)</th><th className="py-1 text-right">%</th><th className="py-1 text-right">$/lb</th><th className="py-1 text-right">Cost/unit</th></tr>
              </thead>
              <tbody>
                {quote.ingredients.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="py-1">{i.name}</td>
                    <td className="py-1 text-right">{i.percentage}%</td>
                    <td className="py-1 text-right">{money(i.cost_per_lb, 2)}</td>
                    <td className="py-1 text-right">{money(quote.fill_weight_lb * (i.percentage / 100) * i.cost_per_lb, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr><th className="py-1">Packaging (snapshot cost)</th><th className="py-1 text-right">Qty/unit</th><th className="py-1 text-right">Unit cost</th><th className="py-1 text-right">Cost/unit</th></tr>
              </thead>
              <tbody>
                {quote.components.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-1 capitalize">{c.type} — {c.description}</td>
                    <td className="py-1 text-right">{c.qty_per_unit}</td>
                    <td className="py-1 text-right">{money(c.unit_cost, 4)}</td>
                    <td className="py-1 text-right">{money(c.unit_cost * c.qty_per_unit, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr><th className="py-1">Filling</th><th className="py-1 text-right">Fills/unit</th><th className="py-1 text-right">Rate</th><th className="py-1 text-right">Cost/unit</th></tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-1">Filling service</td>
                  <td className="py-1 text-right">{quote.filling_qty}</td>
                  <td className="py-1 text-right">{money(quote.filling_rate, 4)}</td>
                  <td className="py-1 text-right">{money(t.fillingCost, 4)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {quote.notes && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 font-semibold text-navy">Internal notes</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{quote.notes}</p>
            </section>
          )}
        </div>

        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-navy">Economics</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Oil cost / unit</span><span>{money(t.oilCost, 4)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Packaging / unit</span><span>{money(t.packagingCost, 4)}</span></div>
              <div className="flex justify-between text-gray-600">
                <span>Filling / unit{quote.filling_qty !== 1 ? ` (×${quote.filling_qty})` : ''}</span>
                <span>{money(t.fillingCost, 4)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold"><span>BOM / unit</span><span>{money(t.bomCost, 4)}</span></div>
              <div className="flex justify-between text-gray-600">
                <span>{quote.pricing_method === 'markup' ? 'Markup on cost' : 'Margin on price'}</span>
                <span>{quote.margin_pct}%</span>
              </div>
              <div className="flex justify-between font-bold text-brand"><span>Unit price</span><span>{money(t.unitPrice, 4)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-navy"><span>Quote total</span><span>{money(t.totalPrice)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Total cost</span><span>{money(t.totalCost)}</span></div>
              <div className="flex justify-between text-green-700"><span>Total profit</span><span>{money(t.totalProfit)}</span></div>
              <div className="flex justify-between text-green-700"><span>Realized margin</span><span>{(t.marginOnPrice * 100).toFixed(1)}% of price</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
