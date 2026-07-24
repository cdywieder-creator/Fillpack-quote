import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded, badRequest } from '@/lib/api-helpers';
import { LB_PER_KG } from '@/lib/quote-math';

// Bulk import of pre-mapped rows. Body: { target: 'ingredients'|'packaging', rows: [...] }
// Ingredient rows: { name, cost, cost_unit: 'lb'|'kg', supplier, notes }
// Packaging rows: { type, description, size_compatibility, unit_cost, supplier, notes }
export const POST = guarded(async (request) => {
  const { target, rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest('No rows to import');
  if (rows.length > 5000) throw badRequest('Too many rows (max 5000 per import)');
  const db = getDb();
  let imported = 0;
  const errors = [];

  if (target === 'ingredients') {
    const ins = db.prepare('INSERT INTO ingredients (name, cost_per_lb, supplier, notes) VALUES (?, ?, ?, ?)');
    db.transaction(() => {
      rows.forEach((r, i) => {
        const name = String(r.name || '').trim();
        const cost = Number(String(r.cost ?? '').replace(/[$,\s]/g, ''));
        if (!name) return errors.push(`Row ${i + 1}: missing name`);
        if (!Number.isFinite(cost) || cost < 0) return errors.push(`Row ${i + 1} (${name}): invalid cost`);
        const costPerLb = r.cost_unit === 'kg' ? cost / LB_PER_KG : cost;
        ins.run(name, costPerLb, String(r.supplier || ''), String(r.notes || ''));
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
  } else {
    throw badRequest('target must be "ingredients" or "packaging"');
  }

  return NextResponse.json({ imported, skipped: errors.length, errors: errors.slice(0, 50) });
});
