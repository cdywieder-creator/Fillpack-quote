import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'fillpack.db');

let db;

export function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seed(db);
  return db;
}

function migrate(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cost_per_lb REAL NOT NULL DEFAULT 0,
    supplier TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    code TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT '',
    uom TEXT NOT NULL DEFAULT 'pcs',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packaging_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'other',
    description TEXT NOT NULL,
    size_compatibility TEXT NOT NULL DEFAULT '',
    unit_cost REAL NOT NULL DEFAULT 0,
    supplier TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specific_gravity REAL NOT NULL DEFAULT 0.91,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    percentage REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_company TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    recipe_id INTEGER REFERENCES recipes(id),
    recipe_name TEXT NOT NULL DEFAULT '',
    package_size_oz REAL NOT NULL,
    fill_weight_lb REAL NOT NULL,
    quantity INTEGER NOT NULL,
    margin_pct REAL NOT NULL,
    pricing_method TEXT NOT NULL DEFAULT 'margin',
    status TEXT NOT NULL DEFAULT 'draft',
    validity_date TEXT NOT NULL DEFAULT '',
    terms TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quote_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    ingredient_id INTEGER,
    name TEXT NOT NULL,
    percentage REAL NOT NULL,
    cost_per_lb REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quote_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    packaging_component_id INTEGER,
    type TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    qty_per_unit REAL NOT NULL DEFAULT 1,
    unit_cost REAL NOT NULL
  );
  `);

  // Backfill new ingredient columns for databases created before this migration.
  const ingredientColumns = db.prepare('PRAGMA table_info(ingredients)').all().map((c) => c.name);
  if (!ingredientColumns.includes('code')) {
    db.exec(`ALTER TABLE ingredients ADD COLUMN code TEXT NOT NULL DEFAULT ''`);
  }
  if (!ingredientColumns.includes('type')) {
    db.exec(`ALTER TABLE ingredients ADD COLUMN type TEXT NOT NULL DEFAULT ''`);
  }
  if (!ingredientColumns.includes('uom')) {
    db.exec(`ALTER TABLE ingredients ADD COLUMN uom TEXT NOT NULL DEFAULT 'pcs'`);
  }
}

function seed(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    const hash = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD || 'fillpack123', 10);
    const insert = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
    insert.run(process.env.SEED_ADMIN_EMAIL || 'cdywieder@gmail.com', 'Admin', hash);
  }
}

export const DEFAULT_TERMS = `Pricing valid for quantities and specifications listed. 50% deposit required to begin production; balance due prior to shipment. Lead time confirmed at order placement. Raw material pricing subject to change beyond validity date. FOB Fillpack USA facility.`;
