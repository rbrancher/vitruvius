/**
 * Builds the sample database (db/schema.sql + db/fixture.sql) used by tests,
 * CI and cloud sessions. Output: vitruvius.fixture.db in the site root.
 *
 *   node scripts/build-fixture-db.mjs
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'vitruvius.fixture.db');

for (const f of [out, `${out}-wal`, `${out}-shm`]) fs.rmSync(f, { force: true });
const db = new Database(out);
db.pragma('journal_mode = WAL'); // same as the real database; db.ts expects it
db.exec(fs.readFileSync(path.join(root, 'db/schema.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'db/fixture.sql'), 'utf8'));
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();

console.log(`Fixture database → ${path.relative(process.cwd(), out)}`);
