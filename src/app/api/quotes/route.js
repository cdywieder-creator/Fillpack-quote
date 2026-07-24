import { NextResponse } from 'next/server';
import { getDb, DEFAULT_TERMS } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';
import { quoteWithDetail } from '@/lib/queries';

export const GET = guarded(async () => {
  const db = getDb();
  const rows = db.prepare('SELECT id FROM quotes ORDER BY id DESC').all();
  return NextResponse.json(rows.map((r) => quoteWithDetail(db, r.id)));
});

export const POST = guarded(async (request, ctx, session) => {
  const body = await request.json();
  const customerName = (body.customer_name || '').trim();
  if (!customerName) throw badRequest('Customer name is required');
  if (!body.recipe_id) throw badRequest('Recipe is required');
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) throw badRequest('Quantity must be a positive whole number');
  const marginPct = Number(body.margin_pct);
  if (!Number.isFinite(marginPct) || marginPct < 0) throw badRequest('Margin % must be a non-negative number');
  const method = body.pricing_method === 'markup' ? 'markup' : 'margin';
  if (method === 'margin' && marginPct >= 100) throw badRequest('Margin on selling price must be below 100%');
  const sizeOz = Number(body.package_size_oz);
  if (!Number.isFinite(sizeOz) || sizeOz <= 0) throw badRequest('Package size must be a positive number');
  const fillWeightLb = Number(body.fill_weight_lb);
  if (!Number.isFinite(fillWeightLb) || fillWeightLb <= 0) throw badRequest('Fill weight must be a positive number');
  const components = Array.isArray(body.components) ? body.components : [];
  if (components.length === 0) throw badRequest('Select at least one packaging component');

  const db = getDb();
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(body.recipe_id);
  if (!recipe) throw badRequest('Recipe not found');
  const recipeIngredients = db
    .prepare(
      `SELECT ri.ingredient_id, ri.percentage, i.name, i.cost_per_lb
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ?`
    )
    .all(body.recipe_id);
  if (recipeIngredients.length === 0) throw badRequest('Recipe has no ingredients');

  const componentRows = components.map((c) => {
    const row = db.prepare('SELECT * FROM packaging_components WHERE id = ?').get(c.packaging_component_id);
    if (!row) throw badRequest(`Packaging component ${c.packaging_component_id} not found`);
    const qty = Number(c.qty_per_unit ?? 1);
    if (!Number.isFinite(qty) || qty <= 0) throw badRequest('Component quantity per unit must be positive');
    return { row, qty };
  });

  const year = new Date().getFullYear();
  const countThisYear = db
    .prepare(`SELECT COUNT(*) AS n FROM quotes WHERE quote_number LIKE ?`)
    .get(`FP-${year}-%`).n;
  const quoteNumber = `FP-${year}-${String(countThisYear + 1).padStart(4, '0')}`;

  const validityDate =
    body.validity_date ||
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const id = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO quotes (quote_number, customer_name, customer_company, customer_email, recipe_id, recipe_name,
          package_size_oz, fill_weight_lb, quantity, margin_pct, pricing_method, status, validity_date, terms, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
      )
      .run(
        quoteNumber, customerName, body.customer_company || '', body.customer_email || '',
        body.recipe_id, recipe.name, sizeOz, fillWeightLb, quantity, marginPct, method,
        validityDate, body.terms || DEFAULT_TERMS, body.notes || '', session.email || ''
      );
    const qid = info.lastInsertRowid;
    const insIng = db.prepare('INSERT INTO quote_ingredients (quote_id, ingredient_id, name, percentage, cost_per_lb) VALUES (?, ?, ?, ?, ?)');
    for (const ri of recipeIngredients) insIng.run(qid, ri.ingredient_id, ri.name, ri.percentage, ri.cost_per_lb);
    const insComp = db.prepare('INSERT INTO quote_components (quote_id, packaging_component_id, type, description, qty_per_unit, unit_cost) VALUES (?, ?, ?, ?, ?, ?)');
    for (const { row, qty } of componentRows) insComp.run(qid, row.id, row.type, row.description, qty, row.unit_cost);
    return qid;
  })();

  return NextResponse.json(quoteWithDetail(db, id), { status: 201 });
});
