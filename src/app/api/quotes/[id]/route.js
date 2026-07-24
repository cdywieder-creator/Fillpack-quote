import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';
import { quoteWithDetail } from '@/lib/queries';

const STATUSES = ['draft', 'sent', 'accepted', 'declined'];

export const GET = guarded(async (request, { params }) => {
  const { id } = await params;
  const quote = quoteWithDetail(getDb(), id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(quote);
});

export const PUT = guarded(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const db = getDb();
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw badRequest(`Status must be one of: ${STATUSES.join(', ')}`);
    db.prepare(`UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(body.status, id);
  }
  if (body.notes !== undefined) {
    db.prepare(`UPDATE quotes SET notes = ?, updated_at = datetime('now') WHERE id = ?`).run(String(body.notes), id);
  }
  return NextResponse.json(quoteWithDetail(db, id));
});

export const DELETE = guarded(async (request, { params }) => {
  const { id } = await params;
  getDb().prepare('DELETE FROM quotes WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
});
