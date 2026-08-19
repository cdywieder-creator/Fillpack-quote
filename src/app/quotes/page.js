'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { money } from '@/lib/quote-math';

const statusColor = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState(null);

  useEffect(() => {
    fetch('/api/quotes').then((r) => r.json()).then(setQuotes);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Quotes</h1>
        <Link href="/quotes/new" className="shrink-0 rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + New Quote
        </Link>
      </div>

      {/* Mobile: one card per quote — a 9-column table cannot survive 390px. */}
      <div className="space-y-3 md:hidden">
        {quotes?.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-400">No quotes yet.</p>
        )}
        {quotes?.map((q) => (
          <Link key={q.id} href={`/quotes/${q.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-4 active:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-brand">{q.quote_number}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusColor[q.status] || ''}`}>{q.status}</span>
            </div>
            <p className="mt-1 font-medium text-navy">{q.customer_company || q.customer_name}</p>
            <p className="mt-0.5 text-sm text-gray-500">{q.recipe_name} — {q.package_size_oz} oz</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-gray-400">Qty</dt>
                <dd className="font-medium">{q.quantity.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Total</dt>
                <dd className="font-semibold text-navy">{money(q.totals.totalPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Margin</dt>
                <dd className="font-medium text-green-700">{(q.totals.marginOnPrice * 100).toFixed(1)}%</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Quote #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Unit price</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Margin</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Valid thru</th>
            </tr>
          </thead>
          <tbody>
            {quotes?.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No quotes yet.</td></tr>
            )}
            {quotes?.map((q) => (
              <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/quotes/${q.id}`} className="font-medium text-brand hover:underline">{q.quote_number}</Link>
                </td>
                <td className="px-4 py-2">{q.customer_company || q.customer_name}</td>
                <td className="px-4 py-2">{q.recipe_name} — {q.package_size_oz} oz</td>
                <td className="px-4 py-2 text-right">{q.quantity.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{money(q.totals.unitPrice)}</td>
                <td className="px-4 py-2 text-right font-medium">{money(q.totals.totalPrice)}</td>
                <td className="px-4 py-2 text-right">{(q.totals.marginOnPrice * 100).toFixed(1)}%</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[q.status] || ''}`}>{q.status}</span>
                </td>
                <td className="px-4 py-2 text-gray-600">{q.validity_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
