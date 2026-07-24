'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState(null);

  const load = () => fetch('/api/recipes').then((r) => r.json()).then(setRecipes);
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm('Delete this recipe? Existing quotes keep their snapshot.')) return;
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Recipes</h1>
        <Link href="/recipes/new" className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + New Recipe
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes?.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-400">
            No recipes yet. Add your oils first, then build a recipe.
          </p>
        )}
        {recipes?.map((r) => {
          const costPerLb = r.ingredients.reduce((s, i) => s + (i.percentage / 100) * i.cost_per_lb, 0);
          return (
            <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-navy">{r.name}</h2>
                <div className="whitespace-nowrap text-sm">
                  <Link href={`/recipes/${r.id}`} className="mr-2 text-brand hover:underline">Edit</Link>
                  <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {r.ingredients.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.name}</span>
                    <span>{i.percentage}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-gray-100 pt-2 text-sm">
                Blend cost: <span className="font-semibold">${costPerLb.toFixed(4)}/lb</span>
                <span className="ml-2 text-xs text-gray-400">SG {r.specific_gravity}</span>
              </p>
              {r.notes && <p className="mt-1 text-xs text-gray-400">{r.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
