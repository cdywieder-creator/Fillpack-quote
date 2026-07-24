import Link from 'next/link';
import { getDb } from '@/lib/db';
import { quoteWithDetail } from '@/lib/queries';
import { money } from '@/lib/quote-math';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const db = getDb();
  const counts = {
    ingredients: db.prepare('SELECT COUNT(*) AS n FROM ingredients WHERE active = 1').get().n,
    packaging: db.prepare('SELECT COUNT(*) AS n FROM packaging_components WHERE active = 1').get().n,
    recipes: db.prepare('SELECT COUNT(*) AS n FROM recipes').get().n,
    quotes: db.prepare('SELECT COUNT(*) AS n FROM quotes').get().n,
  };
  const recent = db
    .prepare('SELECT id FROM quotes ORDER BY id DESC LIMIT 8')
    .all()
    .map((r) => quoteWithDetail(db, r.id));

  const statusColor = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <Link href="/quotes/new" className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + New Quote
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Quotes', counts.quotes, '/quotes'],
          ['Recipes', counts.recipes, '/recipes'],
          ['Ingredients', counts.ingredients, '/ingredients'],
          ['Packaging', counts.packaging, '/packaging'],
        ].map(([label, n, href]) => (
          <Link key={label} href={href} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-brand">
            <div className="text-2xl font-bold text-navy">{n}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-navy">Recent quotes</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Quote #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Unit</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No quotes yet. Add ingredients &amp; packaging, build a recipe, then create your first quote.
                </td>
              </tr>
            )}
            {recent.map((q) => (
              <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/quotes/${q.id}`} className="font-medium text-brand hover:underline">
                    {q.quote_number}
                  </Link>
                </td>
                <td className="px-4 py-2">{q.customer_company || q.customer_name}</td>
                <td className="px-4 py-2">{q.recipe_name} — {q.package_size_oz} oz</td>
                <td className="px-4 py-2 text-right">{q.quantity.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{money(q.totals.unitPrice, 4)}</td>
                <td className="px-4 py-2 text-right font-medium">{money(q.totals.totalPrice)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[q.status] || ''}`}>{q.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
