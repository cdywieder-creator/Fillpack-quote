import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded } from '@/lib/api-helpers';
import { recipeWithIngredients, validateRecipeBody } from '@/lib/queries';

export const GET = guarded(async (request, { params }) => {
  const { id } = await params;
  const recipe = recipeWithIngredients(getDb(), id);
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipe);
});

export const PUT = guarded(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const { name, items, sg, notes } = validateRecipeBody(body);
  const db = getDb();
  const exists = db.prepare('SELECT id FROM recipes WHERE id = ?').get(id);
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  db.transaction(() => {
    db.prepare(`UPDATE recipes SET name = ?, specific_gravity = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(name, sg, notes, id);
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);
    const ins = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, percentage) VALUES (?, ?, ?)');
    for (const it of items) ins.run(id, it.ingredient_id, Number(it.percentage));
  })();
  return NextResponse.json(recipeWithIngredients(db, id));
});

export const DELETE = guarded(async (request, { params }) => {
  const { id } = await params;
  const db = getDb();
  const used = db.prepare('SELECT COUNT(*) AS n FROM quotes WHERE recipe_id = ?').get(id).n;
  if (used > 0) {
    // quotes keep their own snapshot; detach so history stays intact
    db.prepare('UPDATE quotes SET recipe_id = NULL WHERE recipe_id = ?').run(id);
  }
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
});
