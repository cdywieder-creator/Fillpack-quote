import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';
import { recipeWithIngredients, validateRecipeBody } from '@/lib/queries';

export const GET = guarded(async () => {
  const db = getDb();
  const recipes = db.prepare('SELECT * FROM recipes ORDER BY name').all();
  return NextResponse.json(recipes.map((r) => recipeWithIngredients(db, r.id)));
});

export const POST = guarded(async (request) => {
  const body = await request.json();
  const { name, items, sg, notes } = validateRecipeBody(body);
  const db = getDb();
  const id = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO recipes (name, specific_gravity, notes) VALUES (?, ?, ?)')
      .run(name, sg, notes);
    const ins = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, percentage) VALUES (?, ?, ?)');
    for (const it of items) ins.run(info.lastInsertRowid, it.ingredient_id, Number(it.percentage));
    return info.lastInsertRowid;
  })();
  return NextResponse.json(recipeWithIngredients(db, id), { status: 201 });
});
