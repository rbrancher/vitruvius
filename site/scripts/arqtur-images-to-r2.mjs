/**
 * Upload local arquiteturismo edition images to R2.
 *
 * Source: ../media/images/magazines/arqtur_edition/arqtur_edition/
 * R2 key: media/images/magazines/arqtur_edition/{filename}
 *
 * Env vars (already in .env):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID
 *
 * Usage:
 *   npm run sync-arqtur
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { lookup as mimeLookup } from 'mime-types';
import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── config ────────────────────────────────────────────────────────────────────

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID } = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !CF_ACCOUNT_ID) {
  console.error('Missing R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or CF_ACCOUNT_ID.');
  process.exit(1);
}

const BUCKET = 'vitruvius-media';
const R2_PREFIX = 'media/images/magazines/arqtur_edition';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LOCAL_DIR = resolve(SCRIPT_DIR, '../../media/images/magazines/arqtur_edition/arqtur_edition');

// ── R2 client ─────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

const files = (await readdir(LOCAL_DIR)).filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
console.log(`Found ${files.length} images in ${LOCAL_DIR}`);

let uploaded = 0, skipped = 0, failed = 0;

for (const filename of files) {
  const r2Key = `${R2_PREFIX}/${filename}`;

  if (await existsInR2(r2Key)) {
    skipped++;
    continue;
  }

  try {
    const body = await readFile(join(LOCAL_DIR, filename));
    const contentType = mimeLookup(filename) || 'application/octet-stream';
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: r2Key,
      Body: body, ContentType: contentType,
      ContentLength: body.length,
    }));
    uploaded++;
    if (uploaded % 50 === 0) console.log(`  uploaded ${uploaded}...`);
  } catch (err) {
    console.error(`  FAILED: ${filename} — ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
