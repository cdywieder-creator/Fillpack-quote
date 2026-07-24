import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';

export const PUT = guarded(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const description = (body.description || '').trim();
  if (!description) throw badRequest('Description is required');
  const cost = Number(body.unit_cost);
  if (!Number.isFinite(cost) || cost < 0) throw badRequest('unit_cost must be a non-negative number');
  const db = getDb();
  const info = db
    .prepare(`UPDATE packaging_components SET type = ?, description = ?, size_compatibility = ?, unit_cost = ?, supplier = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(body.type || 'other', description, body.size_compatibility || '', cost, body.supplier || '', body.notes || '', id);
  if (info.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(db.prepare('SELECT * FROM packaging_components WHERE id = ?').get(id));
});

export const DELETE = guarded(async (request, { params }) => {
  const { id } = await params;
  const db = getDb();
  db.prepare('UPDATE packaging_components SET active = 0 WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
});
