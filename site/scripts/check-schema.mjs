/**
 * Checks that db/schema.sql (used for the sample database) still matches the
 * real vitruvius.db: same tables, same columns. Run on a machine that has the
 * real database:
 *
 *   npm run db:check-schema [path/to/vitruvius.db]
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const realPath = path.resolve(process.argv[2] ?? path.join(root, 'vitruvius.db'));

if (!fs.existsSync(realPath)) {
  console.error(`Real database not found at ${realPath}`);
  process.exit(1);
}

function columns(db) {
  const out = {};
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  for (const { name } of tables) {
    out[name] = db.prepare(`PRAGMA table_info("${name}")`).all().map(c => c.name).sort();
  }
  return out;
}

const expected = new Database(':memory:');
expected.exec(fs.readFileSync(path.join(root, 'db/schema.sql'), 'utf8'));
const real = new Database(realPath, { readonly: true });

const want = columns(expected);
const have = columns(real);
const problems = [];

for (const t of new Set([...Object.keys(want), ...Object.keys(have)])) {
  if (!want[t]) { problems.push(`table ${t}: in vitruvius.db, missing from db/schema.sql`); continue; }
  if (!have[t]) { problems.push(`table ${t}: in db/schema.sql, missing from vitruvius.db`); continue; }
  for (const c of have[t]) if (!want[t].includes(c)) problems.push(`${t}.${c}: in vitruvius.db, missing from db/schema.sql`);
  for (const c of want[t]) if (!have[t].includes(c)) problems.push(`${t}.${c}: in db/schema.sql, missing from vitruvius.db`);
}

if (problems.length) {
  console.error('Schema mismatch:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`db/schema.sql matches ${path.basename(realPath)}`);
