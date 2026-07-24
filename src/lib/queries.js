import { badRequest } from '@/lib/api-helpers';
import { computeQuote, validateRecipePercentages } from '@/lib/quote-math';

export function recipeWithIngredients(db, id) {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!recipe) return null;
  recipe.ingredients = db
    .prepare(
      `SELECT ri.id, ri.ingredient_id, ri.percentage, i.name, i.cost_per_lb
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ? ORDER BY ri.percentage DESC`
    )
    .all(id);
  return recipe;
}

export function validateRecipeBody(body) {
  const name = (body.name || '').trim();
  if (!name) throw badRequest('Name is required');
  const items = Array.isArray(body.ingredients) ? body.ingredients : [];
  if (items.length === 0) throw badRequest('At least one ingredient is required');
  for (const it of items) {
    if (!it.ingredient_id) throw badRequest('Every line needs an ingredient');
    const pct = Number(it.percentage);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw badRequest('Percentages must be between 0 and 100');
  }
  const { total, valid } = validateRecipePercentages(items);
  if (!valid) throw badRequest(`Percentages must total exactly 100% (currently ${total.toFixed(2)}%)`);
  const sg = Number(body.specific_gravity);
  if (!Number.isFinite(sg) || sg <= 0) throw badRequest('Specific gravity must be a positive number');
  return { name, items, sg, notes: body.notes || '' };
}

export function quoteWithDetail(db, id) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  if (!quote) return null;
  quote.ingredients = db.prepare('SELECT * FROM quote_ingredients WHERE quote_id = ?').all(id);
  quote.components = db.prepare('SELECT * FROM quote_components WHERE quote_id = ?').all(id);
  quote.totals = computeQuote({
    fillWeightLb: quote.fill_weight_lb,
    ingredients: quote.ingredients.map((i) => ({ percentage: i.percentage, costPerLb: i.cost_per_lb })),
    components: quote.components.map((c) => ({ unitCost: c.unit_cost, qtyPerUnit: c.qty_per_unit })),
    marginPct: quote.margin_pct,
    quantity: quote.quantity,
    method: quote.pricing_method,
  });
  return quote;
}
