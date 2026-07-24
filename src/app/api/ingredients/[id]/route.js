import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';

export const PUT = guarded(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const name = (body.name || '').trim();
  if (!name) throw badRequest('Name is required');
  const cost = Number(body.cost_per_lb);
  if (!Number.isFinite(cost) || cost < 0) throw badRequest('cost_per_lb must be a non-negative number');
  const db = getDb();
  const info = db
    .prepare(`UPDATE ingredients SET name = ?, cost_per_lb = ?, supplier = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(name, cost, body.supplier || '', body.notes || '', id);
  if (info.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id));
});

export const DELETE = guarded(async (request, { params }) => {
  const { id } = await params;
  const db = getDb();
  const referenced = db.prepare('SELECT COUNT(*) AS n FROM recipe_ingredients WHERE ingredient_id = ?').get(id).n;
  if (referenced > 0) {
    // keep the row for existing recipes, hide it from lists
    db.prepare('UPDATE ingredients SET active = 0 WHERE id = ?').run(id);
  } else {
    db.prepare('DELETE FROM ingredients WHERE id = ?').run(id);
  }
  return NextResponse.json({ ok: true });
});
