# Fillpack USA — Quoting App

Customer quoting for Fillpack USA contract manufacturing (oil-based personal care).
Next.js (App Router) + SQLite (better-sqlite3) + Tailwind, single deployable app.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

First run creates `data/fillpack.db` and seeds one user:

- **Email:** `cdywieder@gmail.com` (override with `SEED_ADMIN_EMAIL`)
- **Password:** `fillpack123` (override with `SEED_ADMIN_PASSWORD`) — change for production.

Additional users: insert into the `users` table with a bcrypt hash, e.g.
`node -e "console.log(require('bcryptjs').hashSync('newpassword',10))"` then
`sqlite3 data/fillpack.db "INSERT INTO users (email,name,password_hash) VALUES ('teammate@fillpackusa.com','Name','<hash>')"`.

### Production env vars

| Var | Purpose |
|---|---|
| `SESSION_SECRET` | JWT signing secret — **set this in production** |
| `DATABASE_PATH` | SQLite file location (default `./data/fillpack.db`; put on a persistent volume) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First-run admin account |
| `HUBSPOT_ACCESS_TOKEN` | Phase 2, not used yet |

Deploy anywhere Node runs with a persistent disk (Railway/Fly.io/VPS: `npm run build && npm start`).
SQLite means one instance; that's plenty for 2–3 users.

## How pricing works

- **Fill weight** (lb/unit) = size (fl oz) × 0.0652 lb/fl-oz (water) × recipe specific gravity
  (default SG 0.91 for oils). Editable override on every quote.
- **Oil cost/unit** = fill weight × Σ(oil % × cost per lb)
- **BOM/unit** = oil cost + Σ(packaging unit cost × qty per unit)
- **Unit price** = BOM ÷ (1 − margin%) — *margin on selling price* (default).
  A per-quote toggle switches to markup-on-cost (BOM × (1 + m)) if you ever want it.
- Ingredient and packaging costs are **snapshotted into each quote**, so later price
  updates never change existing quotes.

Recipes must total exactly 100% (validated client- and server-side).

## CSV import

Ingredients and Packaging screens both have **Import CSV** with a column-mapping step —
load your Product Cost Tracker V3 exports directly, mapping its headers to name/cost/supplier/etc.
Ingredient costs can be imported as per-lb or per-kg (auto-converted). `$`/commas in cost cells are tolerated.

## Outputs

- **Customer PDF** (`/api/quotes/:id/pdf`): branded quotation with line items, unit/extended
  price, validity date, terms. Never shows cost or margin.
- **Internal quote view** (`/quotes/:id`): full cost snapshot, BOM, profit and realized margin.
  Shareable with any logged-in user.

## Phase 2 (stubbed)

"Push to HubSpot" on the quote detail page calls `POST /api/quotes/:id/hubspot`, which currently
returns 501 with a preview of the Deal payload (deal name, amount, contact, line items, PDF
attachment). Implementation plan is documented in `src/app/api/quotes/[id]/hubspot/route.js`.

## Tests

```bash
npm test   # pricing/fill-weight/validation unit tests (scripts/test-math.mjs)
```
