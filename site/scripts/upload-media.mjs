/**
 * Bulk-upload public/media/ to Cloudflare R2 (vitruvius-media bucket).
 *
 * Requires R2 API credentials in environment:
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   CF_ACCOUNT_ID
 *
 * Uses the AWS S3-compatible API that R2 exposes.
 * Install aws-sdk v3: npm install -D @aws-sdk/client-s3
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';
import { lookup as mimeLookup } from 'mime-types';

const BUCKET   = 'vitruvius-media';
const MEDIA_DIR = new URL('../../media', import.meta.url).pathname;

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID } = process.env;
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !CF_ACCOUNT_ID) {
  console.error('Missing R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or CF_ACCOUNT_ID');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

let uploaded = 0, skipped = 0, failed = 0;

for await (const file of walk(MEDIA_DIR)) {
  const key = relative(MEDIA_DIR, file).replace(/\\/g, '/');
  // prefix with media/ to match paths stored in DB: "media/images/magazines/..."
  const r2Key = `media/${key}`;

  if (await exists(r2Key)) { skipped++; continue; }

  const body = await readFile(file);
  const contentType = mimeLookup(file) || 'application/octet-stream';

  try {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: r2Key, Body: body, ContentType: contentType }));
    uploaded++;
    if (uploaded % 500 === 0) console.log(`  uploaded ${uploaded}...`);
  } catch (err) {
    console.error(`FAILED: ${r2Key}`, err.message);
    failed++;
  }
}

console.log(`Done. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
