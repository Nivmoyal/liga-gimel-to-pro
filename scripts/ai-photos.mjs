// Downloads free AI images from Pollinations.ai (no API key) for every scene
// in scripts/ai-photo-prompts.json, saves them as public/images/<key>.jpg
// (9:16 for the title and intro, 16:9 for everything else) and lists them in
// src/data/photoManifest.json so the game shows them.
//
//   npm run photos:ai                 all scenes that are still missing
//   npm run photos:ai -- fb_penalty   only these scenes
//   options: --force (download again), --list (print prompts)

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'images');
const MANIFEST = join(ROOT, 'src', 'data', 'photoManifest.json');
const PROMPTS = JSON.parse(await readFile(join(ROOT, 'scripts', 'ai-photo-prompts.json'), 'utf8'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const keys = args.filter((a) => !a.startsWith('--'));

const portrait = (key) => PROMPTS.portrait.includes(key);
const size = (key) => (portrait(key) ? { width: 720, height: 1280 } : { width: 1280, height: 720 });

/** Stable seed per scene, so a re-run draws the same picture. */
function seedFor(key) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 1_000_000;
}

function urlFor(key) {
  const { width, height } = size(key);
  const prompt = encodeURIComponent(`${PROMPTS.scenes[key]} ${PROMPTS.style}`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&seed=${seedFor(key)}&nologo=true&model=flux`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(key) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(urlFor(key), { signal: AbortSignal.timeout(180_000) });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.startsWith('image/')) throw new Error(`HTTP ${res.status} ${type}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      // The free tier allows one request at a time; back off before retrying.
      await sleep(2 ** attempt * 2000);
    }
  }
  throw new Error(`${key}: ${lastError?.cause?.message ?? lastError?.message ?? lastError}`);
}

async function loadManifest() {
  return existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
}

if (args.includes('--list')) {
  for (const key of Object.keys(PROMPTS.scenes)) console.log(`${key}.jpg (${portrait(key) ? '9:16' : '16:9'}): ${urlFor(key)}`);
  process.exit(0);
}

await mkdir(OUT, { recursive: true });
const manifest = await loadManifest();
const todo = (keys.length ? keys : Object.keys(PROMPTS.scenes)).filter((key) => {
  if (!PROMPTS.scenes[key]) throw new Error(`unknown scene ${key}`);
  return force || !existsSync(join(OUT, `${key}.jpg`));
});
console.log(`${todo.length} images to download`);

let done = 0;
const failed = [];
for (const key of todo) {
  try {
    const { width, height } = size(key);
    const raw = await download(key);
    await sharp(raw).resize({ width, height, fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toFile(join(OUT, `${key}.jpg`));
    manifest[key] = [{ file: `images/${key}.jpg`, title: PROMPTS.scenes[key], author: 'תמונת AI', license: 'AI', source: 'pollinations.ai' }];
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    done += 1;
    console.log(`[${done}/${todo.length}] images/${key}.jpg`);
  } catch (err) {
    failed.push(key);
    console.error(String(err.message ?? err));
  }
}
console.log(`downloaded ${done}, failed ${failed.length}${failed.length ? `: ${failed.join(', ')}` : ''}`);
if (failed.length) process.exitCode = 1;
