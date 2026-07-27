import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';
import { LB_PER_KG, DEFAULT_SPECIFIC_GRAVITY, validateRecipePercentages } from '@/lib/quote-math';

// Bulk import of pre-mapped rows. Body: { target: 'ingredients'|'packaging'|'recipes', rows: [...] }
// Ingredient rows: { name, cost, cost_unit: 'lb'|'kg', supplier, notes }
// Packaging rows: { type, description, size_compatibility, unit_cost, supplier, notes }
// Recipe rows: one row per oil line, grouped by recipe_name:
//   { recipe_name, oil, percentage, specific_gravity, notes }
export const POST = guarded(async (request) => {
  const { target, rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest('No rows to import');
  if (rows.length > 5000) throw badRequest('Too many rows (max 5000 per import)');
  const db = getDb();
  let imported = 0;
  const errors = [];

  if (target === 'ingredients') {
    const ins = db.prepare('INSERT INTO ingredients (name, cost_per_lb, supplier, notes, code) VALUES (?, ?, ?, ?, ?)');
    db.transaction(() => {
      rows.forEach((r, i) => {
        const name = String(r.name || '').trim();
        const cost = Number(String(r.cost ?? '').replace(/[$,\s]/g, ''));
        if (!name) return errors.push(`Row ${i + 1}: missing name`);
        if (!Number.isFinite(cost) || cost < 0) return errors.push(`Row ${i + 1} (${name}): invalid cost`);
        const costPerLb = r.cost_unit === 'kg' ? cost / LB_PER_KG : cost;
        ins.run(name, costPerLb, String(r.supplier || ''), String(r.notes || ''), String(r.code || '').trim());
        imported++;
      });
    })();
  } else if (target === 'packaging') {
    const ins = db.prepare('INSERT INTO packaging_components (type, description, size_compatibility, unit_cost, supplier, notes) VALUES (?, ?, ?, ?, ?, ?)');
    db.transaction(() => {
      rows.forEach((r, i) => {
        const description = String(r.description || '').trim();
        const cost = Number(String(r.unit_cost ?? '').replace(/[$,\s]/g, ''));
        if (!description) return errors.push(`Row ${i + 1}: missing description`);
        if (!Number.isFinite(cost) || cost < 0) return errors.push(`Row ${i + 1} (${description}): invalid unit cost`);
        ins.run(String(r.type || 'other').toLowerCase(), description, String(r.size_compatibility || ''), cost, String(r.supplier || ''), String(r.notes || ''));
        imported++;
      });
    })();
  } else if (target === 'recipes') {
    // Oils are matched by name or code, case-insensitively, so a sheet can use
    // either the readable name or the internal SKU code.
    const lookup = new Map();
    for (const ing of db.prepare('SELECT id, name, code FROM ingredients WHERE active = 1').all()) {
      lookup.set(ing.name.trim().toLowerCase(), ing.id);
      if (ing.code) lookup.set(ing.code.trim().toLowerCase(), ing.id);
    }

    const groups = new Map();
    rows.forEach((r, i) => {
      const recipeName = String(r.recipe_name || '').trim();
      const oil = String(r.oil || '').trim();
      const pct = Number(String(r.percentage ?? '').replace(/[%,\s]/g, ''));
      if (!recipeName) return errors.push(`Row ${i + 1}: missing recipe name`);
      if (!oil) return errors.push(`Row ${i + 1} (${recipeName}): missing oil`);
      const ingredientId = lookup.get(oil.toLowerCase());
      if (!ingredientId) return errors.push(`Row ${i + 1} (${recipeName}): unknown oil "${oil}" — import it as an ingredient first`);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return errors.push(`Row ${i + 1} (${recipeName}): invalid percentage`);

      if (!groups.has(recipeName)) groups.set(recipeName, { items: [], sg: null, notes: '' });
      const g = groups.get(recipeName);
      g.items.push({ ingredient_id: ingredientId, percentage: pct });
      const sg = Number(r.specific_gravity);
      if (g.sg === null && Number.isFinite(sg) && sg > 0) g.sg = sg;
      if (!g.notes && r.notes) g.notes = String(r.notes);
    });

    const insRecipe = db.prepare('INSERT INTO recipes (name, specific_gravity, notes) VALUES (?, ?, ?)');
    const insLine = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, percentage) VALUES (?, ?, ?)');
    db.transaction(() => {
      for (const [name, g] of groups) {
        const { total, valid } = validateRecipePercentages(g.items);
        if (!valid) {
          errors.push(`Recipe "${name}": percentages total ${total.toFixed(2)}%, must be 100%`);
          continue;
        }
        const info = insRecipe.run(name, g.sg ?? DEFAULT_SPECIFIC_GRAVITY, g.notes);
        for (const it of g.items) insLine.run(info.lastInsertRowid, it.ingredient_id, it.percentage);
        imported++;
      }
    })();
  } else {
    throw badRequest('target must be "ingredients", "packaging", or "recipes"');
  }

  return NextResponse.json({ imported, skipped: errors.length, errors: errors.slice(0, 50) });
});
