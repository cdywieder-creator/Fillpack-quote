import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';

export const GET = guarded(async () => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM packaging_components WHERE active = 1 ORDER BY type, description').all();
  return NextResponse.json(rows);
});

export const POST = guarded(async (request) => {
  const body = await request.json();
  const description = (body.description || '').trim();
  if (!description) throw badRequest('Description is required');
  const cost = Number(body.unit_cost);
  if (!Number.isFinite(cost) || cost < 0) throw badRequest('unit_cost must be a non-negative number');
  const db = getDb();
  const info = db
    .prepare('INSERT INTO packaging_components (type, description, size_compatibility, unit_cost, supplier, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(body.type || 'other', description, body.size_compatibility || '', cost, body.supplier || '', body.notes || '');
  return NextResponse.json(db.prepare('SELECT * FROM packaging_components WHERE id = ?').get(info.lastInsertRowid), { status: 201 });
});
