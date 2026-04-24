/**
 * Stream media files directly from the origin server to Cloudflare R2.
 * No local storage — each file is piped SSH stdout → R2 PutObject.
 *
 * Add to .env:
 *   SSH_HOST=yourserver.com
 *   SSH_USER=deploy                    (default: current user)
 *   SSH_KEY=~/.ssh/id_rsa              (default: SSH agent / default key)
 *   SSH_MEDIA_PATH=/path/to/magazines  (base for grid_9 and gallery_thumb)
 *   SSH_PATH_ORIGINALS=/mnt/volume_vitruvius/vitruvius.com.br/images/images/magazines/originals
 *
 * R2 credentials (already in .env):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID
 *
 * Transferred size variants:
 *   grid_9, gallery_thumb, originals
 *
 * Usage:
 *   npm run sync-media             # all three sizes
 *   npm run sync-media originals   # one size only
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { lookup as mimeLookup } from 'mime-types';

// ── config ────────────────────────────────────────────────────────────────────

const {
  SSH_HOST, SSH_USER, SSH_KEY, SSH_MEDIA_PATH,
  SSH_PATH_ORIGINALS,
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CF_ACCOUNT_ID,
} = process.env;

if (!SSH_HOST || !SSH_MEDIA_PATH) {
  console.error('Missing SSH_HOST or SSH_MEDIA_PATH in environment.');
  process.exit(1);
}
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !CF_ACCOUNT_ID) {
  console.error('Missing R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or CF_ACCOUNT_ID.');
  process.exit(1);
}

const BUCKET = 'vitruvius-media';

// Each size maps to its full remote directory path.
// Sizes with a dedicated SSH_PATH_* env var use that; others fall back to SSH_MEDIA_PATH/<size>.
const SIZE_PATHS = /** @type {Record<string,string>} */ ({
  grid_9:        `${SSH_MEDIA_PATH}/grid_9`,
  gallery_thumb: `${SSH_MEDIA_PATH}/gallery_thumb`,
  originals:     SSH_PATH_ORIGINALS ?? `${SSH_MEDIA_PATH}/originals`,
});

const requestedSize = process.argv[2];
const SIZES = requestedSize ? [requestedSize] : Object.keys(SIZE_PATHS);

// ── SSH helpers ───────────────────────────────────────────────────────────────

function sshArgs(remoteCmd) {
  const args = ['-o', 'StrictHostKeyChecking=accept-new'];
  if (SSH_KEY) args.push('-i', SSH_KEY.replace(/^~/, process.env.HOME));
  if (SSH_USER) args.push(`${SSH_USER}@${SSH_HOST}`);
  else          args.push(SSH_HOST);
  args.push(remoteCmd);
  return args;
}

function sshRun(remoteCmd) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ssh', sshArgs(remoteCmd));
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(err.trim())));
  });
}

function sshStream(remoteCmd) {
  const proc = spawn('ssh', sshArgs(remoteCmd));
  proc.stderr.on('data', d => process.stderr.write(d));
  return proc.stdout;
}

// ── R2 helpers ────────────────────────────────────────────────────────────────

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

async function uploadStream(key, stream, contentType) {
  // Collect stream into buffer (R2 requires known content-length for PutObject)
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: body, ContentType: contentType,
    ContentLength: body.length,
  }));
}

// ── main ──────────────────────────────────────────────────────────────────────

let totalUploaded = 0, totalSkipped = 0, totalFailed = 0;

for (const size of SIZES) {
  const remoteDir = SIZE_PATHS[size];
  if (!remoteDir) {
    console.error(`Unknown size: ${size}. Valid options: ${Object.keys(SIZE_PATHS).join(', ')}`);
    continue;
  }

  console.log(`\n── ${size} ──────────────────────`);

  // List files on server
  let listing;
  try {
    listing = await sshRun(`find ${remoteDir} -type f`);
  } catch (e) {
    console.error(`  Cannot list ${remoteDir}: ${e.message}`);
    continue;
  }

  const files = listing.trim().split('\n').filter(Boolean);
  console.log(`  ${files.length} files found on server`);

  let uploaded = 0, skipped = 0, failed = 0;

  for (const remotePath of files) {
    // Build the R2 key mirroring DB path structure:
    //   …/images/magazines/grid_9/foo.jpg → media/images/magazines/grid_9/foo.jpg
    const marker = '/images/magazines/';
    const idx = remotePath.indexOf(marker);
    if (idx === -1) {
      console.warn(`  Unexpected path: ${remotePath}`);
      failed++;
      continue;
    }
    const r2Key = `media/images/magazines/${remotePath.slice(idx + marker.length)}`;

    if (await existsInR2(r2Key)) {
      skipped++;
      continue;
    }

    try {
      const stream = sshStream(`cat "${remotePath}"`);
      const contentType = mimeLookup(remotePath) || 'application/octet-stream';
      await uploadStream(r2Key, stream, contentType);
      uploaded++;
      if (uploaded % 200 === 0) console.log(`  uploaded ${uploaded}...`);
    } catch (err) {
      console.error(`  FAILED: ${r2Key} — ${err.message}`);
      failed++;
    }
  }

  console.log(`  done: uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
  totalUploaded += uploaded;
  totalSkipped  += skipped;
  totalFailed   += failed;
}

console.log(`\nTotal: uploaded=${totalUploaded} skipped=${totalSkipped} failed=${totalFailed}`);
