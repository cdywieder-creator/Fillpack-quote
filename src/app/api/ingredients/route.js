import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';

export const GET = guarded(async () => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM ingredients WHERE active = 1 ORDER BY name').all();
  return NextResponse.json(rows);
});

export const POST = guarded(async (request) => {
  const body = await request.json();
  const name = (body.name || '').trim();
  if (!name) throw badRequest('Name is required');
  const cost = Number(body.cost_per_lb);
  if (!Number.isFinite(cost) || cost < 0) throw badRequest('cost_per_lb must be a non-negative number');
  const db = getDb();
  const info = db
    .prepare('INSERT INTO ingredients (name, cost_per_lb, supplier, notes) VALUES (?, ?, ?, ?)')
    .run(name, cost, body.supplier || '', body.notes || '');
  return NextResponse.json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(info.lastInsertRowid), { status: 201 });
});
